/**
 * QA fixtures — heuristic writing evaluation snapshots (training v2).
 * @see evaluateWritingTrainingSubmission
 */
import { evaluateWritingTrainingSubmission } from '@/lib/exam-prep/writing/writingEvaluationService'
import { getWritingTrainingTaskById } from '@/lib/exam-prep/writing/writingTaskBuilder'

const startedAt = '2025-01-01T10:00:00.000Z'
const submittedAt = '2025-01-01T10:05:00.000Z'

export function fixtureWritingStrongMessage() {
  const item = getWritingTrainingTaskById('wt-message-01')
  if (!item) throw new Error('missing bank item')
  const text =
    'Beste docent,\n\nWoensdag kan ik mijn opdracht niet inleveren omdat ik ziek ben geweest. Mag ik de opdracht vrijdag bij u inleveren? Sorry voor de overlast.\n\nMet vriendelijke groet,\nSam'
  return evaluateWritingTrainingSubmission({
    item,
    bodyText: text,
    startedAtIso: startedAt,
    submittedAtIso: submittedAt,
  })
}

export function fixtureWritingWeakMessage() {
  const item = getWritingTrainingTaskById('wt-message-01')
  if (!item) throw new Error('missing bank item')
  const text = 'because very busy the homework not tomorrow sorry'
  return evaluateWritingTrainingSubmission({
    item,
    bodyText: text,
    startedAtIso: startedAt,
    submittedAtIso: submittedAt,
  })
}

export function fixtureWritingMediumAudience() {
  const item = getWritingTrainingTaskById('wt-audience-01')
  if (!item) throw new Error('missing bank item')
  const text =
    'Ik gebruik mijn fiets naar werk. De fiets is blauw. Soms fiets ik met mijn zoon in het weekend.'
  return evaluateWritingTrainingSubmission({
    item,
    bodyText: text,
    startedAtIso: startedAt,
    submittedAtIso: submittedAt,
  })
}
