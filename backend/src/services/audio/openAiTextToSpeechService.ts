import OpenAI from 'openai'
import { ApiError } from '../../shared/errors'
import {
  getTtsMemoryCache,
  readTtsDiskCache,
  setTtsMemoryCache,
  ttsCacheKey,
  writeTtsDiskCache,
} from './ttsGenerationCache'
import type { GenerateSpeechInput, GenerateSpeechResult, ITextToSpeechService } from './textToSpeechContracts'

const OPENAI_VOICES = new Set([
  'alloy',
  'ash',
  'ballad',
  'coral',
  'echo',
  'fable',
  'onyx',
  'nova',
  'sage',
  'shimmer',
  'verse',
])

const MAX_CHARS = 4096

function envTrim(key: string): string {
  return process.env[key]?.trim() ?? ''
}

function cacheEnabled(): boolean {
  const v = envTrim('AUDIO_CACHE_ENABLED').toLowerCase()
  if (v === '0' || v === 'false' || v === 'no') return false
  return true
}

function resolveModel(input?: GenerateSpeechInput): string {
  const purpose = (input?.purpose ?? '').toLowerCase()
  if (purpose === 'speak_live_assistant') {
    const live = envTrim('SPEAK_LIVE_OPENAI_TTS_MODEL').toLowerCase()
    if (live === 'tts-1' || live === 'tts-1-hd' || live === 'gpt-4o-mini-tts') return live
    /** `tts-1-hd` is higher quality but often ~3× slower; Speak Live defaults to `tts-1` for snappier turns. */
    return 'tts-1'
  }
  const m = envTrim('OPENAI_TTS_MODEL').toLowerCase()
  if (m === 'tts-1' || m === 'tts-1-hd' || m === 'gpt-4o-mini-tts') return m
  return 'tts-1-hd'
}

/**
 * Resolves OpenAI TTS voice. For `speak_live_assistant`, defaults to a brighter female (`nova`) unless
 * `SPEAK_LIVE_OPENAI_TTS_VOICE` is set — matches the younger Speak Live assistant persona.
 */
export function resolveOpenAiTtsVoice(requested?: string, purpose?: string): string {
  const purposeLc = (purpose ?? '').toLowerCase()
  if (purposeLc === 'speak_live_assistant') {
    const live = envTrim('SPEAK_LIVE_OPENAI_TTS_VOICE').toLowerCase()
    if (live && OPENAI_VOICES.has(live)) return live
    return 'nova'
  }
  const fromReq = requested?.toLowerCase().trim()
  if (fromReq && OPENAI_VOICES.has(fromReq)) return fromReq
  const fromEnv = envTrim('OPENAI_TTS_VOICE').toLowerCase()
  if (fromEnv && OPENAI_VOICES.has(fromEnv)) return fromEnv
  return 'coral'
}

function toResult(buf: Buffer, cached: boolean): GenerateSpeechResult {
  const mimeType = 'audio/mpeg'
  const audioBase64 = buf.toString('base64')
  const audioUrl = `data:${mimeType};base64,${audioBase64}`
  return { mimeType, audioBase64, audioUrl, provider: 'openai', cached }
}

export class OpenAiTextToSpeechService implements ITextToSpeechService {
  async generateSpeechAsync(input: GenerateSpeechInput): Promise<GenerateSpeechResult> {
    const key = process.env.OPENAI_API_KEY?.trim()
    if (!key) {
      throw new ApiError(503, 'TTS_UNAVAILABLE', 'OpenAI API key is not configured for speech generation.')
    }

    const text = input.text.trim().slice(0, MAX_CHARS)
    if (!text) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'text is required', { text: 'Required' })
    }

    const model = resolveModel(input)
    const voice = resolveOpenAiTtsVoice(input.voice, input.purpose)
    const speedRaw = input.speed
    const speed =
      speedRaw != null && Number.isFinite(speedRaw) ? Math.min(4, Math.max(0.25, speedRaw)) : undefined
    const useSpeed = speed != null && model !== 'gpt-4o-mini-tts'

    const cacheKey = ttsCacheKey(
      { ...input, text },
      model,
      voice
    )

    if (cacheEnabled()) {
      const mem = getTtsMemoryCache(cacheKey)
      if (mem) return toResult(mem.buf, true)
      const disk = await readTtsDiskCache(cacheKey)
      if (disk) {
        setTtsMemoryCache(cacheKey, disk)
        return toResult(disk.buf, true)
      }
    }

    const openai = new OpenAI({ apiKey: key })
    const body = {
      model,
      voice,
      input: text,
      response_format: 'mp3' as const,
      ...(useSpeed && speed != null ? { speed } : {}),
    }

    const response = await openai.audio.speech.create(body)
    const buf = Buffer.from(await response.arrayBuffer())

    if (cacheEnabled()) {
      setTtsMemoryCache(cacheKey, { buf, mime: 'audio/mpeg' })
      void writeTtsDiskCache(cacheKey, buf)
    }

    return toResult(buf, false)
  }
}

let singleton: OpenAiTextToSpeechService | null = null

export function getOpenAiTextToSpeechService(): OpenAiTextToSpeechService {
  if (!singleton) singleton = new OpenAiTextToSpeechService()
  return singleton
}
