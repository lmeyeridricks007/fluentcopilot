import { scoreSpeakingFromAiJson, engineOutputToExamScoringResult } from '@/lib/exam-scoring/index'
import { buildHeuristicSpeakingAiPayload } from '@/lib/exam-prep/speaking/speakingHeuristicEvaluator'
import type { SpeakingTrainingItem } from '@/lib/schemas/exam/speakingTrainingItem.schema'
import type { SpeakingInputMode, SpeakingTrainingEvaluationBundle } from '@/lib/exam-prep/speaking/types'
import {
  buildSpeakingTrainingFeedbackBlock,
  buildSpeakingTrainingFeedbackUi,
} from '@/lib/exam-prep/speaking/speakingFeedbackBuilder'
import { buildSpeakingTrainingAttempt, newExamPrepRuntimeIds } from '@/lib/exam-prep/speaking/speakingAttemptService'
import { buildSpeakingCoachOutput } from '@/lib/exam-prep/speaking/speakingCoachLayer'

/**
 * Heuristic evaluator → formal `scoreSpeakingFromAiJson` → exam-coach layer (training).
 * Swap `buildHeuristicSpeakingAiPayload` for LLM JSON matching the same AI contract when ready.
 */
export function evaluateSpeakingTrainingSubmission(input: {
  item: SpeakingTrainingItem
  responseText: string
  inputMode: SpeakingInputMode
  transcriptConfidence?: number
  startedAtIso: string
  submittedAtIso: string
}): SpeakingTrainingEvaluationBundle {
  const ids = newExamPrepRuntimeIds()
  const aiPayload = buildHeuristicSpeakingAiPayload(input.item, input.responseText, {
    transcriptConfidence: input.transcriptConfidence,
    inputMode: input.inputMode,
  })
  const scored = scoreSpeakingFromAiJson('training', input.responseText.trim(), aiPayload, {
    transcriptConfidence: input.transcriptConfidence,
    evaluatorVersionOverride: 'heuristic-speaking-training-v2',
  })
  if (!scored.ok) {
    throw new Error('Speaking evaluation parse failed (internal)')
  }
  const engine = scored.output
  const scoringResult = engineOutputToExamScoringResult(engine, {
    id: ids.scoringResultId,
    examAttemptId: ids.attemptId,
    examExerciseId: input.item.id,
  })
  const coach = buildSpeakingCoachOutput({
    item: input.item,
    answer: input.responseText,
    engine,
  })
  const feedbackUi = buildSpeakingTrainingFeedbackUi(engine, input.item, coach)
  const preview = input.responseText.trim()
  feedbackUi.learnerAnswerPreview = preview.length > 220 ? `${preview.slice(0, 217)}…` : preview

  const attemptBase = buildSpeakingTrainingAttempt({
    ids: { attemptId: ids.attemptId },
    examExerciseId: input.item.id,
    responseText: input.responseText,
    inputMode: input.inputMode,
    transcriptConfidence: input.transcriptConfidence,
    startedAtIso: input.startedAtIso,
    submittedAtIso: input.submittedAtIso,
  })
  const attempt = { ...attemptBase, scoringResult }
  const feedbackBlock = buildSpeakingTrainingFeedbackBlock({
    ids: { feedbackBlockId: ids.feedbackBlockId, attemptId: ids.attemptId },
    item: input.item,
    engine,
    coach,
  })

  return {
    item: input.item,
    responseText: input.responseText.trim(),
    inputMode: input.inputMode,
    transcriptConfidence: input.transcriptConfidence,
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
