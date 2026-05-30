import OpenAI from 'openai'
import { toFile } from 'openai/uploads'
import { ApiError } from '../../shared/errors'
import type { TranscribeSpeechOptions } from '../speech/speechToTextContracts'
import { isRawLinearPcmMime, parsePcmSampleRateFromMime, wrapPcm16leMonoInWav } from '../speech/pcm16MonoToWav'

export type TimedSttWord = {
  word: string
  startSec: number
  endSec: number
}

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

type RawWord = { word?: string; start?: number; end?: number }

/**
 * OpenAI Whisper with `verbose_json` + word-level timestamps (extra latency vs plain text).
 * Used for read-aloud: map each printed sentence to milliseconds in the learner clip.
 */
export async function transcribeReadAloudWithWordTimestamps(
  audio: Buffer,
  mimeType: string,
  options?: TranscribeSpeechOptions
): Promise<{ text: string; durationSeconds?: number; words: TimedSttWord[] }> {
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

  const openai = new OpenAI({ apiKey: key, timeout: 240_000 })
  const ext = extensionForMime(uploadMime)
  const file = await toFile(uploadBytes, `read-aloud.${ext}`, { type: uploadMime })

  const lang = (options?.language ?? 'nl').trim()
  const shortLang = lang.length >= 2 ? lang.slice(0, 2) : undefined
  const model = resolveModel()
  const rawPrompt = options?.transcriptionPrompt?.trim()
  const prompt = rawPrompt && rawPrompt.length > 0 ? rawPrompt.slice(0, 400) : undefined

  if (model !== 'whisper-1') {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Word timestamps for read-aloud require whisper-1.', {
      model,
    })
  }

  const trUnknown = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    response_format: 'verbose_json',
    timestamp_granularities: ['word'],
    ...(shortLang ? { language: shortLang } : {}),
    ...(prompt ? { prompt } : {}),
  } as never)

  const tr = trUnknown as unknown as {
    text?: string
    duration?: number
    words?: RawWord[]
  }

  const text = (typeof tr.text === 'string' ? tr.text : '').trim()
  const durationSeconds = typeof tr.duration === 'number' ? tr.duration : undefined

  const rawWords = tr.words
  const words: TimedSttWord[] = []
  if (Array.isArray(rawWords)) {
    for (const w of rawWords) {
      const word = typeof w.word === 'string' ? w.word.trim() : ''
      const startSec = typeof w.start === 'number' && Number.isFinite(w.start) ? w.start : NaN
      const endSec = typeof w.end === 'number' && Number.isFinite(w.end) ? w.end : NaN
      if (!word || !(startSec >= 0) || !(endSec > startSec)) continue
      words.push({ word, startSec, endSec })
    }
  }

  return { text, durationSeconds, words }
}
