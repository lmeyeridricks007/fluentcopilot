/**
 * Exam evaluation output — rubric-based, versioned, auditable.
 * Distinct from `practice/scoringResult` (heuristic session scoring).
 */
import { z } from 'zod'
import { idSchema, metadataSchema } from '@/lib/schemas/shared.schema'
import { rubricDomainKeySchema } from '@/lib/schemas/exam/examType.schema'
import {
  speakingRubricScoresSchema,
} from '@/lib/schemas/exam/speakingExam.schema'
import {
  writingRubricScoresSchema,
} from '@/lib/schemas/exam/writingExam.schema'

/** One row per rubric category instance on an attempt. */
export const examRubricScoreRowSchema = z.object({
  categoryKey: z.string().min(1),
  label: z.string().min(1).optional(),
  score: z.number().nonnegative(),
  maxScore: z.number().positive(),
  levelKey: z.string().min(1).optional(),
  evidence: z.string().min(1).optional(),
  metadata: metadataSchema,
})

export const examScoringResultSchema = z.object({
  id: idSchema,
  examAttemptId: idSchema,
  examExerciseId: idSchema,
  examType: rubricDomainKeySchema,
  rubricDefinitionId: idSchema,
  rubricVersion: z.string().min(1),
  /** Canonical per-category breakdown (ordered). */
  rubricScores: z.array(examRubricScoreRowSchema).min(1),
  /** Optional holistic execution score (may mirror weighted rubric total). */
  exerciseExecutionScore: z.number().nonnegative().optional(),
  totalScore: z.number().nonnegative(),
  maxScore: z.number().positive(),
  /** Product pass / cut-score; not a legal exam guarantee. */
  pass: z.boolean().optional(),
  /** Evaluator self-confidence or ensemble variance (0–1). */
  confidence: z.number().min(0).max(1).optional(),
  /** Engine / model / ruleset id, e.g. `eval-a2-speaking-v3`. */
  evaluatorVersion: z.string().min(1),
  summaryComment: z.string().min(1).optional(),
  notes: z.string().min(1).optional(),
  /** Typed mirror for speaking analytics dashboards (subset of categoryKey space). */
  speakingRubricScores: speakingRubricScoresSchema.optional(),
  /** Typed mirror for writing analytics dashboards. */
  writingRubricScores: writingRubricScoresSchema.optional(),
  metadata: metadataSchema,
})

export type ExamRubricScoreRow = z.infer<typeof examRubricScoreRowSchema>
export type ExamScoringResult = z.infer<typeof examScoringResultSchema>
