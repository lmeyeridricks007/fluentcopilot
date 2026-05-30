import type { SpeakingAssessmentResult } from '../../domain/speaking-assessment/speakingAssessmentCanonical'
import type { PronunciationAssessmentApiResponse, PronunciationAssessmentHttpBody } from '../speech/pronunciationAssessmentContracts'
import { appendSpeakingProgressRow } from './speakingProgressRepository'
import { isSpeakingProgressEnabled } from './speakingProgressConfig'
import type { LiveSessionEvaluation } from '../speak-live/liveVoiceEvaluationTypes'
import {
  mapPronunciationToProgressRecord,
  mapSpeakLiveEvaluationToProgressRecord,
  mapSpeakingAssessmentToProgressRecord,
} from './speakingProgressMappers'
import type { LearnerLevel } from './speakingProgressRecord'

/** Non-blocking append after pronunciation API (sticky composer / partial retries). */
export async function appendSpeakingProgressFromPronunciationResponse(params: {
  userId: string
  body: PronunciationAssessmentHttpBody
  response: PronunciationAssessmentApiResponse
}): Promise<void> {
  if (!isSpeakingProgressEnabled()) return
  const a = params.response.assessment
  if (!a) return
  const row = mapPronunciationToProgressRecord({
    userId: params.userId,
    assessment: a,
    retryHints: params.response.retryHints ?? null,
    meta: params.body.progressMeta ?? undefined,
  })
  await appendSpeakingProgressRow(params.userId, row)
}

/** After Speak Live session evaluation is stored — same clip store as pronunciation practice. */
export async function appendSpeakingProgressFromSpeakLiveEvaluation(params: {
  userId: string
  threadId: string
  evaluation: LiveSessionEvaluation
}): Promise<void> {
  if (!isSpeakingProgressEnabled()) return
  const row = mapSpeakLiveEvaluationToProgressRecord({
    userId: params.userId,
    threadId: params.threadId,
    evaluation: params.evaluation,
  })
  if (!row) return
  await appendSpeakingProgressRow(params.userId, row)
}

export async function appendSpeakingProgressFromSpeakingResult(params: {
  userId: string
  canonical: SpeakingAssessmentResult
  learnerLevel: 'A1' | 'A2' | 'B1'
  scenarioTitle?: string | null
}): Promise<void> {
  if (!isSpeakingProgressEnabled()) return
  const base = mapSpeakingAssessmentToProgressRecord({ userId: params.userId, canonical: params.canonical })
  const level: LearnerLevel = params.learnerLevel
  const row = {
    ...base,
    level,
    scenarioTitle: params.scenarioTitle?.trim() ?? base.scenarioTitle,
  }
  await appendSpeakingProgressRow(params.userId, row)
}
