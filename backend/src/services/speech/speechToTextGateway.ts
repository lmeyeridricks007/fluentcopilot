import type { ISpeechToTextService } from './speechToTextContracts'
import { getAzureSpeechToTextService } from './azureSpeechToTextService'
import { getOpenAiSpeechToTextService } from './openAiSpeechToTextService'
import { isAzurePronunciationConfigured } from './pronunciationAssessmentConfig'

export type SpeechToTextProviderId = 'azure' | 'openai'

/**
 * Which STT backend to use for Speak Live + transcribe HTTP.
 *
 * Priority:
 * 1. `SPEECH_TO_TEXT_PROVIDER=azure|openai`
 * 2. Else **azure** when `AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION` are set (same resource as pronunciation).
 * 3. Else **openai** (Whisper) when `OPENAI_API_KEY` is set.
 */
export function getResolvedSpeechToTextProvider(): SpeechToTextProviderId {
  const v = (process.env.SPEECH_TO_TEXT_PROVIDER ?? '').trim().toLowerCase()
  if (v === 'openai') return 'openai'
  if (v === 'azure') {
    if (!isAzurePronunciationConfigured()) {
      console.warn(
        '[speech-to-text] SPEECH_TO_TEXT_PROVIDER=azure but AZURE_SPEECH_KEY / AZURE_SPEECH_REGION missing; falling back to openai'
      )
      return 'openai'
    }
    return 'azure'
  }
  if (isAzurePronunciationConfigured()) return 'azure'
  return 'openai'
}

let cached: ISpeechToTextService | null = null
let cachedId: SpeechToTextProviderId | null = null

/** Process-wide singleton; provider is fixed at first call for the current env (Functions cold start). */
export function getSpeechToTextService(): ISpeechToTextService {
  const id = getResolvedSpeechToTextProvider()
  if (cached && cachedId === id) return cached
  cachedId = id
  cached = id === 'azure' ? getAzureSpeechToTextService() : getOpenAiSpeechToTextService()
  return cached
}
