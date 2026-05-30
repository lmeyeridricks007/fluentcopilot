import { getOpenAiTextToSpeechService } from '../audio/openAiTextToSpeechService'
import { logSpeakingAssessmentStep } from './speakingAssessmentLog'
import {
  getDefaultAzureTtsVoiceForReference,
  getOpenAiVoiceForSpeakingReference,
  getSpeakingReferenceAudioProvider,
  getSpeakingReferenceSynthesisChain,
} from './speakingAssessmentConfig'
import { buildReferenceSsml, synthesizeAzureReferenceMp3 } from './azureNeuralReferenceTts'
import { chunkDutchReferenceForCoaching } from './sentenceChunkingForReference'
import {
  getReferenceAudioMemoryCache,
  readReferenceAudioDiskCache,
  referenceAudioCacheKey,
  setReferenceAudioMemoryCache,
  writeReferenceAudioDiskCache,
  type ReferenceSpeedMode,
} from './referenceAudioCache'

export type ReferenceAudioUrls = {
  normalUrl: string | null
  slowUrl: string | null
  chunkedUrl: string | null
}

export type ReferenceAudioResolveResult = ReferenceAudioUrls & {
  provider: string
  cacheHit: boolean
  /** When true, no server audio — client may use `speechSynthesis` (dev / missing keys). */
  useBrowserTts: boolean
}

function toDataUrl(buf: Buffer, mime: string): string {
  return `data:${mime};base64,${buf.toString('base64')}`
}

async function loadOrSynthesizeVariant(input: {
  mode: ReferenceSpeedMode
  text: string
  locale: string
  voice: string
  cacheEnabled: boolean
  chain: Array<'azure' | 'openai'>
}): Promise<{ url: string | null; cacheHit: boolean; usedProvider: string | null }> {
  const { mode, text, locale, voice, cacheEnabled, chain } = input
  const key = referenceAudioCacheKey({ locale, voice, mode, text })

  if (cacheEnabled) {
    const mem = getReferenceAudioMemoryCache(key)
    if (mem) return { url: mem, cacheHit: true, usedProvider: null }
    const disk = await readReferenceAudioDiskCache(key)
    if (disk) {
      setReferenceAudioMemoryCache(key, disk)
      return { url: disk, cacheHit: true, usedProvider: null }
    }
  }

  if (chain.length === 0) {
    return { url: null, cacheHit: false, usedProvider: null }
  }

  for (const p of chain) {
    try {
      if (p === 'azure') {
        const parts = mode === 'chunked' ? chunkDutchReferenceForCoaching(text) : []
        const ssml =
          mode === 'slow'
            ? buildReferenceSsml({ text, voice, prosodyRate: '-22%' })
            : mode === 'chunked' && parts.length > 1
              ? buildReferenceSsml({ text: '', voice, chunks: parts, breakMs: 450 })
              : buildReferenceSsml({ text, voice })
        const { audio } = await synthesizeAzureReferenceMp3({ ssml })
        const url = toDataUrl(audio, 'audio/mpeg')
        if (cacheEnabled) {
          setReferenceAudioMemoryCache(key, url)
          void writeReferenceAudioDiskCache(key, url)
        }
        return { url, cacheHit: false, usedProvider: 'azure_neural_tts' }
      }
      if (p === 'openai') {
        const purpose: 'speaking_reference_normal' | 'speaking_reference_slow' | 'speaking_reference_chunked' =
          mode === 'normal' ? 'speaking_reference_normal' : mode === 'slow' ? 'speaking_reference_slow' : 'speaking_reference_chunked'
        const parts = mode === 'chunked' ? chunkDutchReferenceForCoaching(text) : []
        const oText = mode === 'chunked' && parts.length > 0 ? parts.join('. ') : text
        const speed = mode === 'slow' ? 0.82 : mode === 'chunked' ? 0.9 : 1.0
        const r = await getOpenAiTextToSpeechService().generateSpeechAsync({
          text: oText,
          voice: getOpenAiVoiceForSpeakingReference(),
          language: locale,
          speed,
          purpose,
        })
        if (cacheEnabled) {
          setReferenceAudioMemoryCache(key, r.audioUrl)
          void writeReferenceAudioDiskCache(key, r.audioUrl)
        }
        return { url: r.audioUrl, cacheHit: r.cached, usedProvider: 'openai_tts' }
      }
    } catch (e) {
      logSpeakingAssessmentStep({
        step: 'reference_audio_variant_failed',
        extra: { mode, provider: p, message: e instanceof Error ? e.message : String(e) },
      })
    }
  }

  return { url: null, cacheHit: false, usedProvider: null }
}

/**
 * Dutch reference audio: normal / slow / chunked. Primary Azure Neural TTS, fallback OpenAI TTS,
 * `useBrowserTts` when no server chain is configured.
 */
export class ReferenceAudioService {
  async resolveReferenceAudio(params: {
    text: string
    locale: string
    voice: string
    cacheEnabled: boolean
  }): Promise<ReferenceAudioResolveResult> {
    const t0 = Date.now()
    const text = params.text.trim()
    const locale = params.locale.trim() || 'nl-NL'
    const voice = params.voice.trim() || getDefaultAzureTtsVoiceForReference()
    const chain = getSpeakingReferenceSynthesisChain()
    const useBrowserTts = chain.length === 0

    logSpeakingAssessmentStep({
      step: 'reference_audio_start',
      extra: { provider: getSpeakingReferenceAudioProvider(), chain, textLen: text.length },
    })

    if (!text) {
      logSpeakingAssessmentStep({ step: 'reference_audio_end', durationMs: Date.now() - t0, extra: { empty: true } })
      return {
        normalUrl: null,
        slowUrl: null,
        chunkedUrl: null,
        provider: 'skipped-empty-text',
        cacheHit: false,
        useBrowserTts,
      }
    }

    if (useBrowserTts) {
      logSpeakingAssessmentStep({
        step: 'reference_audio_end',
        durationMs: Date.now() - t0,
        extra: { provider: 'browser-fallback', cacheHit: false },
      })
      return {
        normalUrl: null,
        slowUrl: null,
        chunkedUrl: null,
        provider: 'browser-fallback',
        cacheHit: false,
        useBrowserTts: true,
      }
    }

    const [normal, slow, chunked] = await Promise.all([
      loadOrSynthesizeVariant({ mode: 'normal', text, locale, voice, cacheEnabled: params.cacheEnabled, chain }),
      loadOrSynthesizeVariant({ mode: 'slow', text, locale, voice, cacheEnabled: params.cacheEnabled, chain }),
      loadOrSynthesizeVariant({ mode: 'chunked', text, locale, voice, cacheEnabled: params.cacheEnabled, chain }),
    ])

    const cacheHit = normal.cacheHit && slow.cacheHit && chunked.cacheHit
    const used =
      normal.usedProvider || slow.usedProvider || chunked.usedProvider || getSpeakingReferenceAudioProvider()

    logSpeakingAssessmentStep({
      step: 'reference_audio_end',
      durationMs: Date.now() - t0,
      extra: {
        provider: used,
        cacheHit,
        hasNormal: Boolean(normal.url),
        hasSlow: Boolean(slow.url),
        hasChunked: Boolean(chunked.url),
      },
    })

    return {
      normalUrl: normal.url,
      slowUrl: slow.url,
      chunkedUrl: chunked.url,
      provider: used,
      cacheHit,
      useBrowserTts: false,
    }
  }

  /** Single variant (lazy GET). */
  async resolveOneSpeed(input: {
    text: string
    locale: string
    voice: string
    speed: ReferenceSpeedMode
    cacheEnabled: boolean
  }): Promise<{ url: string | null; cacheHit: boolean; provider: string; useBrowserTts: boolean }> {
    const chain = getSpeakingReferenceSynthesisChain()
    if (chain.length === 0) {
      return { url: null, cacheHit: false, provider: 'browser-fallback', useBrowserTts: true }
    }
    const r = await loadOrSynthesizeVariant({
      mode: input.speed,
      text: input.text.trim(),
      locale: input.locale.trim() || 'nl-NL',
      voice: input.voice.trim() || getDefaultAzureTtsVoiceForReference(),
      cacheEnabled: input.cacheEnabled,
      chain,
    })
    return {
      url: r.url,
      cacheHit: r.cacheHit,
      provider: r.usedProvider ?? getSpeakingReferenceAudioProvider(),
      useBrowserTts: false,
    }
  }
}
