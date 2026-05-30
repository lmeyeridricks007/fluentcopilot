/**
 * QA fixtures — deterministic coach + scoring snapshots (heuristic v2).
 * @see evaluateSpeakingTrainingSubmission
 */
import { evaluateSpeakingTrainingSubmission } from '@/lib/exam-prep/speaking/speakingEvaluationService'
import { getSpeakingTrainingQuestionById } from '@/lib/exam-prep/speaking/speakingQuestionBuilder'

const startedAt = '2025-01-01T10:00:00.000Z'
const submittedAt = '2025-01-01T10:01:00.000Z'

export function fixtureSpeakingStrong() {
  const item = getSpeakingTrainingQuestionById('st-speaking-pref-01')
  if (!item) throw new Error('missing bank item')
  const text =
    'Ik ga liever met de trein, omdat dat rustiger is en ik geen parkeerplaats hoef te zoeken. Met de auto ben ik soms sneller.'
  return evaluateSpeakingTrainingSubmission({
    item,
    responseText: text,
    inputMode: 'type',
    startedAtIso: startedAt,
    submittedAtIso: submittedAt,
  })
}

export function fixtureSpeakingWeak() {
  const item = getSpeakingTrainingQuestionById('st-speaking-pref-01')
  if (!item) throw new Error('missing bank item')
  const text = 'met auto because very fast'
  return evaluateSpeakingTrainingSubmission({
    item,
    responseText: text,
    inputMode: 'voice',
    transcriptConfidence: 0.42,
    startedAtIso: startedAt,
    submittedAtIso: submittedAt,
  })
}

export function fixtureSpeakingMedium() {
  const item = getSpeakingTrainingQuestionById('st-speaking-opinion-01')
  if (!item) throw new Error('missing bank item')
  const text =
    'Ik vind het weer in Nederland niet altijd leuk. In mijn land is het warmer en daarom mis ik soms de zon.'
  return evaluateSpeakingTrainingSubmission({
    item,
    responseText: text,
    inputMode: 'type',
    startedAtIso: startedAt,
    submittedAtIso: submittedAt,
  })
}
