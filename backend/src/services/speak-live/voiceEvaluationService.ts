/**
 * Post-session voice metrics (Azure Pronunciation Assessment + timing helpers).
 * Used only after the learner ends Speak Live — never on the live turn critical path.
 */
import type { NormalizedWordAssessment } from '../speech/pronunciationAssessmentContracts'
import { runPronunciationAssessment } from '../speech/pronunciationAssessmentGateway'
import { getAzureSpeechLocale } from '../speech/pronunciationAssessmentConfig'

export type VoiceAssessmentInput = {
  audio: Buffer
  mimeType: string
  transcript: string
  locale?: string
}

export async function assessLearnerAudioForPostSession(input: VoiceAssessmentInput) {
  return runPronunciationAssessment({
    audio: input.audio,
    mimeType: input.mimeType,
    transcript: input.transcript.trim(),
    locale: input.locale?.trim() || getAzureSpeechLocale(),
    assessmentMode: 'open_response',
  })
}

export type { NormalizedWordAssessment }
