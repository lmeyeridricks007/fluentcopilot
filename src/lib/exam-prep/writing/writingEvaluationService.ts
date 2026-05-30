import { scoreWritingFromAiJson, engineOutputToExamScoringResult } from '@/lib/exam-scoring/index'
import { mergeEvidenceIntoRows } from '@/lib/exam-scoring/scoreAggregator'
import { buildHeuristicWritingAiPayload } from '@/lib/exam-prep/writing/writingHeuristicEvaluator'
import type { WritingTrainingItem } from '@/lib/schemas/exam/writingTrainingItem.schema'
import type { WritingTrainingEvaluationBundle } from '@/lib/exam-prep/writing/types'
import type { ExamScoringEngineOutput } from '@/lib/exam-scoring/types'
import {
  buildWritingTrainingFeedbackBlock,
  buildWritingTrainingFeedbackUi,
} from '@/lib/exam-prep/writing/writingFeedbackBuilder'
import { buildWritingTrainingAttempt, composeWritingAnswerText, newExamPrepRuntimeIds } from '@/lib/exam-prep/writing/writingAttemptService'
import { buildWritingCoachOutput } from '@/lib/exam-prep/writing/writingCoachLayer'

function formLabelsFromItem(item: WritingTrainingItem): Record<string, string> | undefined {
  if (!item.formFields?.length) return undefined
  const m: Record<string, string> = {}
  for (const f of item.formFields) {
    m[f.id] = f.labelDutch
  }
  return m
}

/**
 * Heuristic evaluator → `scoreWritingFromAiJson` → coach + feedback (training).
 */
export function evaluateWritingTrainingSubmission(input: {
  item: WritingTrainingItem
  bodyText: string
  fieldValues?: Record<string, string>
  startedAtIso: string
  submittedAtIso: string
}): WritingTrainingEvaluationBundle {
  const ids = newExamPrepRuntimeIds()
  const labels = formLabelsFromItem(input.item)
  const composed = composeWritingAnswerText({
    bodyText: input.bodyText,
    fieldValues: input.fieldValues,
    formLabels: labels,
  })

  const aiPayload = buildHeuristicWritingAiPayload(input.item, composed, input.fieldValues)
  const scored = scoreWritingFromAiJson('training', composed.trim(), aiPayload, {
    evaluatorVersionOverride: 'heuristic-writing-training-v2',
  })
  if (!scored.ok) {
    throw new Error('Writing evaluation parse failed (internal)')
  }
  const engine: ExamScoringEngineOutput = {
    ...scored.output,
    rubricScores: mergeEvidenceIntoRows(scored.output.rubricScores, scored.output.categoryRationales),
  }
  const scoringResult = engineOutputToExamScoringResult(engine, {
    id: ids.scoringResultId,
    examAttemptId: ids.attemptId,
    examExerciseId: input.item.id,
  })
  const coach = buildWritingCoachOutput({
    item: input.item,
    answer: composed,
    engine,
  })
  const feedbackUi = buildWritingTrainingFeedbackUi(engine, input.item, coach)
  const preview = composed.trim()
  feedbackUi.learnerAnswerPreview = preview.length > 220 ? `${preview.slice(0, 217)}…` : preview

  const attemptBase = buildWritingTrainingAttempt({
    ids: { attemptId: ids.attemptId },
    examExerciseId: input.item.id,
    bodyText: composed,
    fieldValues: input.fieldValues,
    startedAtIso: input.startedAtIso,
    submittedAtIso: input.submittedAtIso,
  })
  const attempt = { ...attemptBase, scoringResult }
  const feedbackBlock = buildWritingTrainingFeedbackBlock({
    ids: { feedbackBlockId: ids.feedbackBlockId, attemptId: ids.attemptId },
    item: input.item,
    engine,
    coach,
  })

  return {
    item: input.item,
    responseText: composed.trim(),
    fieldValues: input.fieldValues,
    engine,
    coach,
    feedbackUi,
    attemptId: ids.attemptId,
    scoringResultId: ids.scoringResultId,
    scoringResult,
    feedbackBlockId: ids.feedbackBlockId,
    feedbackBlock,
    attempt,
  }
}
