import OpenAI from 'openai'
import { toFile } from 'openai/uploads'
import type { TranscriptionVerbose } from 'openai/resources/audio/transcriptions'
import { ApiError } from '../../shared/errors'
import type { ISpeechToTextService, TranscribeSpeechOptions, TranscribeSpeechResult } from './speechToTextContracts'
import { isRawLinearPcmMime, parsePcmSampleRateFromMime, wrapPcm16leMonoInWav } from './pcm16MonoToWav'

function extensionForMime(mime: string): string {
  const base = mime.split(';')[0]?.trim().toLowerCase() ?? 'audio/webm'
  if (base.includes('webm')) return 'webm'
  if (base.includes('mp4')) return 'mp4'
  if (base.includes('mpeg') || base === 'audio/mp3') return 'mp3'
  if (base.includes('wav')) return 'wav'
  if (base.includes('l16') || base.includes('linear16')) return 'wav'
  return 'webm'
}

function resolveModel(): string {
  const m = process.env.OPENAI_STT_MODEL?.trim()
  return m && m.length > 0 ? m : 'whisper-1'
}

export class OpenAiSpeechToTextService implements ISpeechToTextService {
  async transcribeAsync(
    audio: Buffer,
    mimeType: string,
    options?: TranscribeSpeechOptions
  ): Promise<TranscribeSpeechResult> {
    const key = process.env.OPENAI_API_KEY?.trim()
    if (!key) {
      throw new ApiError(503, 'STT_UNAVAILABLE', 'OpenAI API key is not configured for speech-to-text.')
    }

    if (!/^audio\//i.test(mimeType)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Expected an audio/* MIME type', { mimeType })
    }

    let uploadBytes = audio
    let uploadMime = mimeType
    if (isRawLinearPcmMime(mimeType)) {
      const hz = parsePcmSampleRateFromMime(mimeType)
      uploadBytes = wrapPcm16leMonoInWav(audio, hz)
      uploadMime = 'audio/wav'
    }

    const openai = new OpenAI({ apiKey: key })
    const ext = extensionForMime(uploadMime)
    const file = await toFile(uploadBytes, `speech.${ext}`, { type: uploadMime })

    const lang = (options?.language ?? 'nl').trim()
    const shortLang = lang.length >= 2 ? lang.slice(0, 2) : undefined
    const model = resolveModel()
    const useVerboseJson = model === 'whisper-1'

    const rawPrompt = options?.transcriptionPrompt?.trim()
    /** OpenAI STT prompts are softly capped; keep a short Dutch line well under token limits. */
    const prompt = rawPrompt && rawPrompt.length > 0 ? rawPrompt.slice(0, 400) : undefined

    const tr = await openai.audio.transcriptions.create({
      file,
      model,
      ...(useVerboseJson
        ? { response_format: 'verbose_json' as const }
        : { response_format: 'json' as const }),
      ...(shortLang ? { language: shortLang } : {}),
      ...(prompt ? { prompt } : {}),
    })

    const text = (typeof (tr as { text?: string }).text === 'string' ? (tr as { text: string }).text : '').trim()
    let durationSeconds: number | undefined
    let detectedLanguage: string | undefined = shortLang
    if (useVerboseJson) {
      const v = tr as TranscriptionVerbose
      durationSeconds = typeof v.duration === 'number' ? v.duration : undefined
      detectedLanguage = typeof v.language === 'string' ? v.language : shortLang
    }

    return {
      text,
      provider: 'openai',
      durationSeconds,
      detectedLanguage,
    }
  }
}

let singleton: OpenAiSpeechToTextService | null = null

export function getOpenAiSpeechToTextService(): OpenAiSpeechToTextService {
  if (!singleton) singleton = new OpenAiSpeechToTextService()
  return singleton
}
