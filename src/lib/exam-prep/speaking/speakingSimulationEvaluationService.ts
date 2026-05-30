import { scoreSpeakingFromAiJson, engineOutputToExamScoringResult } from '@/lib/exam-scoring/index'
import { buildHeuristicSpeakingAiPayload } from '@/lib/exam-prep/speaking/speakingHeuristicEvaluator'
import type { SpeakingTrainingItem } from '@/lib/schemas/exam/speakingTrainingItem.schema'
import type { SpeakingInputMode, SpeakingSimulationQuestionBundle } from '@/lib/exam-prep/speaking/types'
import { buildSpeakingSimulationAttempt, newExamPrepRuntimeIds } from '@/lib/exam-prep/speaking/speakingAttemptService'

/**
 * Simulation path: rubric engine only — no coach, no feedback blocks, no mid-session UI artifacts.
 */
export function evaluateSpeakingSimulationSubmission(input: {
  item: SpeakingTrainingItem
  responseText: string
  inputMode: SpeakingInputMode
  transcriptConfidence?: number
  startedAtIso: string
  submittedAtIso: string
  timedOut: boolean
}): SpeakingSimulationQuestionBundle {
  const ids = newExamPrepRuntimeIds()
  const trimmed = input.responseText.trim()
  const aiPayload = buildHeuristicSpeakingAiPayload(input.item, trimmed, {
    transcriptConfidence: input.transcriptConfidence,
    inputMode: input.inputMode,
  })
  const scored = scoreSpeakingFromAiJson('simulation', trimmed, aiPayload, {
    transcriptConfidence: input.transcriptConfidence,
    evaluatorVersionOverride: 'heuristic-speaking-simulation-v1',
  })
  if (!scored.ok) {
    throw new Error('Speaking simulation evaluation parse failed (internal)')
  }
  const engine = scored.output
  const scoringResult = engineOutputToExamScoringResult(engine, {
    id: ids.scoringResultId,
    examAttemptId: ids.attemptId,
    examExerciseId: input.item.id,
  })

  const attemptBase = buildSpeakingSimulationAttempt({
    ids: { attemptId: ids.attemptId },
    examExerciseId: input.item.id,
    responseText: trimmed,
    inputMode: input.inputMode,
    transcriptConfidence: input.transcriptConfidence,
    startedAtIso: input.startedAtIso,
    submittedAtIso: input.submittedAtIso,
    timedOut: input.timedOut,
  })
  const attempt = { ...attemptBase, scoringResult }

  return {
    item: input.item,
    responseText: trimmed,
    inputMode: input.inputMode,
    transcriptConfidence: input.transcriptConfidence,
    engine,
    attemptId: ids.attemptId,
    scoringResultId: ids.scoringResultId,
    scoringResult,
    attempt,
    timedOut: input.timedOut,
  }
}
