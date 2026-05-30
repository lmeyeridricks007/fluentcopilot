import { ApiError } from '../../shared/errors'
import { resolveOpenAiTtsVoice } from '../audio/openAiTextToSpeechService'
import { generateSpeechFromText } from '../audio/openAiSpeechService'
import type { GenerateSpeechResult } from '../audio/textToSpeechContracts'
import { buildReferenceSsml, synthesizeAzureReferenceMp3 } from '../speaking-assessment/azureNeuralReferenceTts'
import { isAzurePronunciationConfigured } from '../speech/pronunciationAssessmentConfig'
import {
  getSpeakLiveReferenceTtsMemoryCache,
  isSpeakLiveReferenceTtsLayerCacheEnabled,
  normalizeReferenceTtsCacheText,
  readSpeakLiveReferenceTtsDiskCache,
  referenceTtsCacheKey,
  setSpeakLiveReferenceTtsMemoryCache,
  writeSpeakLiveReferenceTtsDiskCache,
  type SpeakLiveReferenceTtsCacheProvider,
} from './speakLiveReferenceTtsCache'

export type SpeakLiveTtsProviderId = 'azure' | 'openai'

/**
 * Speak Live assistant playback: prefer Azure Neural TTS when configured and selected.
 *
 * Env:
 * - `SPEAK_LIVE_TTS_PROVIDER=azure|openai` (default: azure when Azure Speech creds exist, else openai)
 * - `AZURE_SPEAK_LIVE_VOICE` (default `nl-NL-FennaNeural` — Netherlands Dutch, female; try `nl-NL-ColetteNeural` for another female timbre)
 * - `AZURE_SPEAK_LIVE_EXPRESS_AS_ROLE` (optional; unset = plain neural female. Set e.g. `YoungAdultFemale` only if your region/voice supports it — can sound unnatural)
 * - OpenAI fallback: `SPEAK_LIVE_OPENAI_TTS_VOICE` (default `nova`; Dutch accent is best with Azure above)
 * - Reference report TTS cache: `SPEAK_LIVE_REFERENCE_TTS_VERSION` (bump when synthesis semantics change), optional `SPEAK_LIVE_REFERENCE_TTS_DISK_CACHE_DIR`, `SPEAK_LIVE_REFERENCE_TTS_CACHE_DISABLED=1` to disable
 */
export function resolveSpeakLiveTtsProvider(): SpeakLiveTtsProviderId {
  const v = (process.env.SPEAK_LIVE_TTS_PROVIDER ?? '').trim().toLowerCase()
  if (v === 'openai') return 'openai'
  if (v === 'azure') {
    if (!isAzurePronunciationConfigured()) {
      console.warn('[speak-live-tts] SPEAK_LIVE_TTS_PROVIDER=azure but Azure Speech is not configured; using openai')
      return 'openai'
    }
    return 'azure'
  }
  return isAzurePronunciationConfigured() ? 'azure' : 'openai'
}

function azureSpeakLiveVoice(): string {
  return process.env.AZURE_SPEAK_LIVE_VOICE?.trim() || 'nl-NL-FennaNeural'
}

/**
 * Optional Azure `mstts:express-as` role for Speak Live.
 * Default is **off** — plain neural Dutch female (natural timbre). Roles + prosody often sound shrill.
 * Set e.g. `YoungAdultFemale` to experiment; use `none` explicitly to force off if you set a default in shell profile.
 */
function resolveSpeakLiveExpressAsRole(): string | undefined {
  const raw = process.env.AZURE_SPEAK_LIVE_EXPRESS_AS_ROLE?.trim()
  if (!raw || /^(none|off|false|0|no)$/i.test(raw)) return undefined
  return raw
}

function envTrim(key: string): string {
  return process.env[key]?.trim() ?? ''
}

const SPEAK_LIVE_OPENAI_SPEED = 0.9

/** Mirrors OpenAI TTS model resolution for `speak_live_assistant` (cache version segment). */

function speakLiveOpenAiTtsModelForCacheVersion(): string {
  const live = envTrim('SPEAK_LIVE_OPENAI_TTS_MODEL').toLowerCase()
  if (live === 'tts-1' || live === 'tts-1-hd' || live === 'gpt-4o-mini-tts') return live
  return 'tts-1'
}

function referenceTtsVersionSegment(provider: SpeakLiveReferenceTtsCacheProvider): string {
  const base = (process.env.SPEAK_LIVE_REFERENCE_TTS_VERSION ?? '1').trim() || '1'
  if (provider === 'azure') {
    const role = resolveSpeakLiveExpressAsRole()
    return `${base}|expr=${role ?? 'off'}`
  }
  return `${base}|m=${speakLiveOpenAiTtsModelForCacheVersion()}|sp=${SPEAK_LIVE_OPENAI_SPEED}`
}

function toGenerateSpeechResult(
  buf: Buffer,
  provider: SpeakLiveReferenceTtsCacheProvider,
  cached: boolean,
  wordBoundaries?: GenerateSpeechResult['wordBoundaries'],
): GenerateSpeechResult {
  const mimeType = 'audio/mpeg'
  const audioBase64 = buf.toString('base64')
  return {
    mimeType,
    audioBase64,
    audioUrl: `data:${mimeType};base64,${audioBase64}`,
    provider,
    cached,
    ...(wordBoundaries?.length ? { wordBoundaries } : {}),
  }
}

/** Effective Speak Live assistant TTS (matches {@link generateSpeakLiveAssistantSpeech}). */
export function getSpeakLiveResolvedTtsVoice(): { provider: SpeakLiveTtsProviderId; voice: string } {
  const provider = resolveSpeakLiveTtsProvider()
  if (provider === 'azure' && isAzurePronunciationConfigured()) {
    return { provider: 'azure', voice: azureSpeakLiveVoice() }
  }
  return { provider: 'openai', voice: resolveOpenAiTtsVoice(undefined, 'speak_live_assistant') }
}

/**
 * Synthesize assistant/reference audio (no Speak-Live reference-layer cache).
 * Used by live playback and by {@link generateSpeakLiveReferenceSpeechForReport} on cache miss.
 */
export async function synthesizeSpeakLiveAssistantSpeechCore(input: {
  text: string
  threadId?: string
  messageId?: string
  language?: string
}): Promise<GenerateSpeechResult> {
  const provider = resolveSpeakLiveTtsProvider()
  if (provider === 'azure' && isAzurePronunciationConfigured()) {
    const voice = azureSpeakLiveVoice()
    const text = input.text.trim()
    if (!text) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'text is required', { text: 'Required' })
    }
    try {
      const expressRole = resolveSpeakLiveExpressAsRole()
      const ssmlWithRole = buildReferenceSsml({
        text,
        voice,
        ...(expressRole ? { msttsExpressAsRole: expressRole } : {}),
      })
      let ssml = ssmlWithRole
      let audio: Buffer
      let wordBoundaries: Awaited<ReturnType<typeof synthesizeAzureReferenceMp3>>['wordBoundaries']
      try {
        ;({ audio, wordBoundaries } = await synthesizeAzureReferenceMp3({ ssml }))
      } catch (roleErr) {
        if (expressRole) {
          console.warn(
            '[speak-live-tts] Azure SSML express-as role failed; retrying plain neural voice',
            roleErr,
          )
          ssml = buildReferenceSsml({ text, voice })
          ;({ audio, wordBoundaries } = await synthesizeAzureReferenceMp3({ ssml }))
        } else {
          throw roleErr
        }
      }
      return toGenerateSpeechResult(audio, 'azure', false, wordBoundaries)
    } catch (e) {
      console.warn('[speak-live-tts] Azure TTS failed, falling back to OpenAI', e)
    }
  }
  return generateSpeechFromText({
    text: input.text,
    threadId: input.threadId,
    messageId: input.messageId,
    language: input.language ?? 'nl',
    speed: SPEAK_LIVE_OPENAI_SPEED,
    purpose: 'speak_live_assistant',
  })
}

export async function generateSpeakLiveAssistantSpeech(input: {
  text: string
  threadId?: string
  messageId?: string
  language?: string
}): Promise<GenerateSpeechResult> {
  return synthesizeSpeakLiveAssistantSpeechCore(input)
}

/**
 * Reference / model TTS for Speak Live **scenario reports** only: deterministic cache
 * (memory + optional disk) before synthesis. `cached` reflects **this** layer only (not OpenAI's inner cache).
 */
export async function generateSpeakLiveReferenceSpeechForReport(input: {
  text: string
  threadId?: string
  messageId?: string
  language?: string
}): Promise<GenerateSpeechResult> {
  const language = (input.language ?? 'nl').trim().toLowerCase() || 'nl'
  const normalizedText = normalizeReferenceTtsCacheText(input.text.slice(0, 800))
  if (!normalizedText) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'text is required', { text: 'Required' })
  }

  const route = resolveSpeakLiveTtsProvider()
  const azurePrimary = route === 'azure' && isAzurePronunciationConfigured()
  const primaryProvider: SpeakLiveReferenceTtsCacheProvider = azurePrimary ? 'azure' : 'openai'
  const primaryVoice = azurePrimary ? azureSpeakLiveVoice() : resolveOpenAiTtsVoice(undefined, 'speak_live_assistant')
  const primaryKey = referenceTtsCacheKey({
    language,
    voiceId: primaryVoice,
    normalizedText,
    ttsProvider: primaryProvider,
    ttsVersion: referenceTtsVersionSegment(primaryProvider),
  })
  const fallbackOpenAiKey = azurePrimary
    ? referenceTtsCacheKey({
        language,
        voiceId: resolveOpenAiTtsVoice(undefined, 'speak_live_assistant'),
        normalizedText,
        ttsProvider: 'openai',
        ttsVersion: referenceTtsVersionSegment('openai'),
      })
    : null

  if (isSpeakLiveReferenceTtsLayerCacheEnabled()) {
    for (const { key, provider } of [
      { key: primaryKey, provider: primaryProvider },
      ...(fallbackOpenAiKey ? [{ key: fallbackOpenAiKey, provider: 'openai' as const }] : []),
    ]) {
      const mem = getSpeakLiveReferenceTtsMemoryCache(key)
      if (mem) {
        return toGenerateSpeechResult(mem, provider, true)
      }
      const disk = await readSpeakLiveReferenceTtsDiskCache(key)
      if (disk) {
        setSpeakLiveReferenceTtsMemoryCache(key, disk)
        return toGenerateSpeechResult(disk, provider, true)
      }
    }
  }

  const fresh = await synthesizeSpeakLiveAssistantSpeechCore({
    ...input,
    text: normalizedText,
    language,
  })

  const buf = Buffer.from(fresh.audioBase64, 'base64')
  const actualProvider: SpeakLiveReferenceTtsCacheProvider = fresh.provider === 'azure' ? 'azure' : 'openai'
  const actualVoice =
    actualProvider === 'azure' ? azureSpeakLiveVoice() : resolveOpenAiTtsVoice(undefined, 'speak_live_assistant')
  const storageKey = referenceTtsCacheKey({
    language,
    voiceId: actualVoice,
    normalizedText,
    ttsProvider: actualProvider,
    ttsVersion: referenceTtsVersionSegment(actualProvider),
  })

  if (isSpeakLiveReferenceTtsLayerCacheEnabled() && buf.length >= 16) {
    setSpeakLiveReferenceTtsMemoryCache(storageKey, buf)
    void writeSpeakLiveReferenceTtsDiskCache(storageKey, buf)
  }

  return {
    ...fresh,
    cached: false,
  }
}
