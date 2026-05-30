import * as sdk from 'microsoft-cognitiveservices-speech-sdk'
import { ApiError } from '../../shared/errors'
import type { ISpeechToTextService, TranscribeSpeechOptions, TranscribeSpeechResult } from './speechToTextContracts'
import { azureStreamFormatForMime } from './azureSpeechAudioStreamFormat'
import {
  getAzureSpeechKey,
  getAzureSpeechRegion,
  getAzureSpeechLocale,
  isAzurePronunciationConfigured,
} from './pronunciationAssessmentConfig'

/** Detached `ArrayBuffer` with exactly `buf.byteLength` bytes (avoids SDK edge cases with shared / offset views). */
function bufferToDetachedArrayBuffer(buf: Buffer): ArrayBuffer {
  const u8 = new Uint8Array(buf.byteLength)
  u8.set(buf)
  const raw = u8.buffer
  if (raw.byteLength === u8.byteLength) return raw
  return raw.slice(u8.byteOffset, u8.byteOffset + u8.byteLength)
}

function sanitizeAzureCancellationDetail(extra: unknown): string {
  const t = (typeof extra === 'string' ? extra : String(extra ?? '')).trim()
  if (!t) return ''
  if (/byteLength|undefined \(reading/i.test(t)) {
    return 'The audio clip could not be decoded for recognition (often too short, incomplete, or not real microphone input). Try again with a longer phrase after allowing the microphone.'
  }
  return t
}

function localeFromOptions(language?: string): string {
  const raw = (language ?? '').trim().replace('_', '-')
  if (/^[a-z]{2}-[a-z]{2}$/i.test(raw)) return raw
  if (/^[a-z]{2}$/i.test(raw)) {
    const lc = raw.toLowerCase()
    if (lc === 'nl') return 'nl-NL'
    return `${lc}-${lc.toUpperCase()}`
  }
  return getAzureSpeechLocale()
}

/**
 * Read-aloud clips are often 30s–3min. `recognizeOnceAsync` is only for short single utterances (~15s);
 * long audio is canceled by the service. Continuous recognition consumes the full push stream.
 */
async function transcribeContinuousFromRecognizer(
  recognizer: sdk.SpeechRecognizer,
  locale: string
): Promise<TranscribeSpeechResult> {
  const segments: string[] = []
  let settled = false

  const fireAndForgetStop = () => {
    try {
      recognizer.stopContinuousRecognitionAsync(
        () => {},
        () => {}
      )
    } catch {
      /* ignore */
    }
  }

  try {
    await Promise.race([
      new Promise<void>((resolve, reject) => {
        const finishOk = () => {
          if (settled) return
          settled = true
          fireAndForgetStop()
          resolve()
        }
        const finishErr = (msg: string) => {
          if (settled) return
          settled = true
          fireAndForgetStop()
          reject(new Error(msg))
        }

        recognizer.recognized = (_s, e: sdk.SpeechRecognitionEventArgs) => {
          if (e.result.reason === sdk.ResultReason.RecognizedSpeech) {
            const t = e.result.text?.trim()
            if (t) segments.push(t)
          }
        }

        recognizer.canceled = (_s, e: sdk.SpeechRecognitionCanceledEventArgs) => {
          if (e.reason === sdk.CancellationReason.EndOfStream) {
            finishOk()
            return
          }
          finishErr(e.errorDetails?.trim() || `Canceled (${sdk.CancellationReason[e.reason]})`)
        }

        recognizer.sessionStopped = (_s, _e) => {
          finishOk()
        }

        recognizer.startContinuousRecognitionAsync(
          () => {},
          (err) => finishErr(String(err))
        )
      }),
      new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error('Azure continuous recognition timed out')), 360_000)
      }),
    ])
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new ApiError(
      502,
      'SPEECH_RECOGNITION_ERROR',
      `Azure speech recognition failed (continuous). ${sanitizeAzureCancellationDetail(msg)}`.trim()
    )
  }

  const text = segments.join(' ').replace(/\s+/g, ' ').trim()
  return {
    text,
    provider: 'azure',
    durationSeconds: undefined,
    detectedLanguage: locale,
  }
}

export class AzureSpeechToTextService implements ISpeechToTextService {
  async transcribeAsync(
    audio: Buffer,
    mimeType: string,
    options?: TranscribeSpeechOptions
  ): Promise<TranscribeSpeechResult> {
    if (!isAzurePronunciationConfigured()) {
      throw new ApiError(503, 'STT_UNAVAILABLE', 'Azure Speech key/region not configured for speech-to-text.')
    }
    if (!Buffer.isBuffer(audio) || typeof audio.byteLength !== 'number') {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Missing or invalid audio buffer for speech-to-text.')
    }
    if (!/^audio\//i.test(mimeType)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Expected an audio/* MIME type', { mimeType })
    }

    const key = getAzureSpeechKey()!
    const region = getAzureSpeechRegion()!
    const locale = localeFromOptions(options?.language)

    const speechConfig = sdk.SpeechConfig.fromSubscription(key, region)
    speechConfig.speechRecognitionLanguage = locale
    speechConfig.outputFormat = sdk.OutputFormat.Detailed

    const format = azureStreamFormatForMime(mimeType)
    const pushStream = sdk.AudioInputStream.createPushStream(format)
    let slice: ArrayBuffer
    try {
      slice = bufferToDetachedArrayBuffer(audio)
      pushStream.write(slice)
      pushStream.close()
    } catch (e) {
      try {
        pushStream.close()
      } catch {
        /* ignore */
      }
      const msg = e instanceof Error ? e.message : String(e)
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        `Could not read audio for Azure speech recognition. ${msg}`.trim()
      )
    }
    const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream)

    const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig)

    try {
      /**
       * `recognizeOnceAsync` only returns the FIRST phrase (~≤15s, single utterance) and bails on
       * the rest of the audio. Anything where the learner may speak multiple sentences — exam
       * speaking answers (often 60–130s), live conversation, read-aloud, shadow retries — must use
       * continuous recognition or the second/third sentence silently disappears from the transcript.
       */
      const useContinuous =
        options?.purpose === 'read_aloud_eval' ||
        options?.purpose === 'speak_live_turn' ||
        options?.purpose === 'conversation_reply' ||
        options?.purpose === 'shadow_retry' ||
        options?.purpose === 'exam_speaking_run'
      if (useContinuous) {
        return await transcribeContinuousFromRecognizer(recognizer, locale)
      }

      let result: sdk.SpeechRecognitionResult
      try {
        result = await new Promise<sdk.SpeechRecognitionResult>((resolve, reject) => {
          recognizer.recognizeOnceAsync(
            (r) => resolve(r),
            (err) => reject(new Error(err))
          )
        })
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        throw new ApiError(
          502,
          'SPEECH_RECOGNITION_ERROR',
          `Azure speech recognition failed (SDK). ${sanitizeAzureCancellationDetail(msg)}`.trim()
        )
      }

      if (result.reason !== sdk.ResultReason.RecognizedSpeech) {
        let extra: unknown = result.errorDetails || result.text || ''
        if (result.reason === sdk.ResultReason.Canceled) {
          try {
            const cd = sdk.CancellationDetails.fromResult(result)
            extra = cd.errorDetails ?? extra
          } catch {
            /* ignore */
          }
        }
        const detail = sanitizeAzureCancellationDetail(extra)
        throw new ApiError(
          502,
          'SPEECH_RECOGNITION_ERROR',
          `Azure speech recognition failed (${sdk.ResultReason[result.reason]}). ${detail}`.trim()
        )
      }

      const text = String(result.text ?? '').trim()
      let durationSeconds: number | undefined
      try {
        const raw = result.properties?.getProperty(sdk.PropertyId.SpeechServiceResponse_JsonResult, undefined)
        if (typeof raw === 'string' && raw.trim()) {
          const j = JSON.parse(raw) as { Duration?: number }
          if (typeof j.Duration === 'number' && Number.isFinite(j.Duration)) {
            durationSeconds = j.Duration / 1e7
          }
        }
      } catch {
        /* ignore */
      }

      return {
        text,
        provider: 'azure',
        durationSeconds,
        detectedLanguage: locale,
      }
    } finally {
      recognizer.close()
    }
  }
}

let singleton: AzureSpeechToTextService | null = null

export function getAzureSpeechToTextService(): AzureSpeechToTextService {
  if (!singleton) singleton = new AzureSpeechToTextService()
  return singleton
}
