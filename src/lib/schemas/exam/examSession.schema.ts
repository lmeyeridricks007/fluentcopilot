/**
 * Multi-exercise exam session (training pack run or simulation).
 */
import { z } from 'zod'
import { idSchema, metadataSchema, isoDateTimeSchema } from '@/lib/schemas/shared.schema'
import {
  examModeSchema,
  examSessionCompletionStateSchema,
  examSessionConstraintsSchema,
} from '@/lib/schemas/exam/examShared.schema'
import { examTypeKeySchema } from '@/lib/schemas/exam/examType.schema'

export const examSessionSchema = z.object({
  id: idSchema,
  userId: idSchema,
  examModuleId: idSchema.optional(),
  examType: examTypeKeySchema,
  mode: examModeSchema,
  /** Ordered exercise ids for this run. */
  exerciseRefs: z.array(idSchema).min(1),
  /** Populated as attempts are created / submitted (empty while `draft` / early `in_progress`). */
  attemptRefs: z.array(idSchema).default([]),
  startedAt: isoDateTimeSchema,
  endedAt: isoDateTimeSchema.optional(),
  sessionConstraints: examSessionConstraintsSchema.optional(),
  completionState: examSessionCompletionStateSchema,
  /** Set when `completionState === 'completed'`. */
  resultSummaryId: idSchema.optional(),
  /** Cursor for resume (index in exerciseRefs). */
  currentExerciseIndex: z.number().int().min(0).optional(),
  metadata: metadataSchema,
})

export type ExamSession = z.infer<typeof examSessionSchema>
