/**
 * Dutch A2 Exam Prep — formal scoring engine (rubrics, gating, normalization, AI contract).
 *
 * @see docs/product/exam-scoring-engine.md
 */
export * from '@/lib/exam-scoring/types'
export * from '@/lib/exam-scoring/speakingScoringPolicy'
export * from '@/lib/exam-scoring/writingScoringPolicy'
export * from '@/lib/exam-scoring/scoringGuards'
export * from '@/lib/exam-scoring/scoringNormalizer'
export * from '@/lib/exam-scoring/passFailPolicy'
export * from '@/lib/exam-scoring/aiRubricMapper'
export * from '@/lib/exam-scoring/aiEvaluationPromptSpec'
export * from '@/lib/exam-scoring/integrationHints'
export {
  aggregateSpeakingAttempt,
  aggregateWritingAttempt,
  mergeEvidenceIntoRows,
  engineOutputToExamScoringResult,
  type AggregateSpeakingInput,
  type AggregateWritingInput,
} from '@/lib/exam-scoring/scoreAggregator'

import type { ExamMode } from '@/lib/schemas/exam/examShared.schema'
import {
  parseAiSpeakingEvaluation,
  parseAiWritingEvaluation,
  aiSpeakingPayloadToRawScores,
  aiWritingPayloadToRawScores,
} from '@/lib/exam-scoring/aiRubricMapper'
import { aggregateSpeakingAttempt, aggregateWritingAttempt } from '@/lib/exam-scoring/scoreAggregator'
import type { ExamScoringEngineOutput } from '@/lib/exam-scoring/types'

/**
 * Parse AI JSON → guards → aggregate. Returns `{ ok: false, error }` if JSON invalid.
 */
export function scoreSpeakingFromAiJson(
  mode: ExamMode,
  responseText: string,
  aiJson: unknown,
  opts?: { transcriptConfidence?: number; evaluatorVersionOverride?: string }
):
  | { ok: true; output: ExamScoringEngineOutput }
  | { ok: false; error: import('zod').ZodError } {
  const parsed = parseAiSpeakingEvaluation(aiJson)
  if (!parsed.ok) return parsed
  const raw = aiSpeakingPayloadToRawScores(parsed.data)
  const output = aggregateSpeakingAttempt({
    mode,
    scores: raw,
    responseText,
    transcriptConfidence: opts?.transcriptConfidence,
    categoryRationales: parsed.data.rationales,
    certainty: parsed.data.certainty,
    evaluatorVersionOverride: opts?.evaluatorVersionOverride,
  })
  return { ok: true, output }
}

export function scoreWritingFromAiJson(
  mode: ExamMode,
  responseText: string,
  aiJson: unknown,
  opts?: { evaluatorVersionOverride?: string }
):
  | { ok: true; output: ExamScoringEngineOutput }
  | { ok: false; error: import('zod').ZodError } {
  const parsed = parseAiWritingEvaluation(aiJson)
  if (!parsed.ok) return parsed
  const raw = aiWritingPayloadToRawScores(parsed.data)
  const output = aggregateWritingAttempt({
    mode,
    scores: raw,
    responseText,
    categoryRationales: parsed.data.rationales,
    certainty: parsed.data.certainty,
    evaluatorVersionOverride: opts?.evaluatorVersionOverride,
  })
  return { ok: true, output }
}
