import { scoreWritingFromAiJson, engineOutputToExamScoringResult, mergeEvidenceIntoRows } from '@/lib/exam-scoring/index'
import { buildHeuristicWritingAiPayload } from '@/lib/exam-prep/writing/writingHeuristicEvaluator'
import type { WritingTrainingItem } from '@/lib/schemas/exam/writingTrainingItem.schema'
import type { WritingSimulationTaskBundle } from '@/lib/exam-prep/writing/types'
import {
  buildWritingSimulationAttempt,
  composeWritingAnswerText,
  newExamPrepRuntimeIds,
} from '@/lib/exam-prep/writing/writingAttemptService'

function formLabelsFromItem(item: WritingTrainingItem): Record<string, string> | undefined {
  if (!item.formFields?.length) return undefined
  const m: Record<string, string> = {}
  for (const f of item.formFields) {
    m[f.id] = f.labelDutch
  }
  return m
}

/**
 * Simulation path: rubric engine only — no coach or feedback blocks during the exam run.
 */
export function evaluateWritingSimulationSubmission(input: {
  item: WritingTrainingItem
  bodyText: string
  fieldValues?: Record<string, string>
  startedAtIso: string
  submittedAtIso: string
  timedOut: boolean
}): WritingSimulationTaskBundle {
  const ids = newExamPrepRuntimeIds()
  const labels = formLabelsFromItem(input.item)
  const composed = composeWritingAnswerText({
    bodyText: input.bodyText,
    fieldValues: input.fieldValues,
    formLabels: labels,
  })

  const aiPayload = buildHeuristicWritingAiPayload(input.item, composed, input.fieldValues)
  const scored = scoreWritingFromAiJson('simulation', composed.trim(), aiPayload, {
    evaluatorVersionOverride: 'heuristic-writing-simulation-v1',
  })
  if (!scored.ok) {
    throw new Error('Writing simulation evaluation parse failed (internal)')
  }
  const engine = {
    ...scored.output,
    rubricScores: mergeEvidenceIntoRows(scored.output.rubricScores, scored.output.categoryRationales),
  }
  const scoringResult = engineOutputToExamScoringResult(engine, {
    id: ids.scoringResultId,
    examAttemptId: ids.attemptId,
    examExerciseId: input.item.id,
  })

  const attemptBase = buildWritingSimulationAttempt({
    ids: { attemptId: ids.attemptId },
    examExerciseId: input.item.id,
    bodyText: composed,
    fieldValues: input.fieldValues,
    startedAtIso: input.startedAtIso,
    submittedAtIso: input.submittedAtIso,
    timedOut: input.timedOut,
  })
  const attempt = { ...attemptBase, scoringResult }

  return {
    item: input.item,
    responseText: composed.trim(),
    fieldValues: input.fieldValues,
    engine,
    attemptId: ids.attemptId,
    scoringResultId: ids.scoringResultId,
    scoringResult,
    attempt,
    timedOut: input.timedOut,
  }
}
