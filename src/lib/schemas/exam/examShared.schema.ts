/**
 * Shared primitives for Exam Prep — modes, timing, completion (not lesson/practice enums).
 */
import { z } from 'zod'
import { metadataSchema } from '@/lib/schemas/shared.schema'

/** Training = hints/explanations/retries; simulation = exam-like constraints. */
export const examModeSchema = z.enum(['training', 'simulation'])

/** Lifecycle of a multi-exercise session. */
export const examSessionCompletionStateSchema = z.enum([
  'draft',
  'in_progress',
  'completed',
  'abandoned',
  'expired',
])

/** How the learner produced the primary response (for attempts). */
export const examResponseModalitySchema = z.enum([
  'text',
  'audio',
  'audio_and_transcript',
  'selection',
  'selection_and_text',
  'form_fields',
])

export const examSessionConstraintsSchema = z.object({
  /** Wall-clock time limit for full session (seconds); simulation use. */
  timeLimitSecondsTotal: z.number().int().positive().optional(),
  /** Max revisits to same item in this session (simulation often 0). */
  maxRevisitsPerExercise: z.number().int().min(0).optional(),
  /** Whether dictionary / external help is disallowed (UX + analytics). */
  aidsDisallowed: z.boolean().optional(),
  metadata: metadataSchema,
})

export type ExamMode = z.infer<typeof examModeSchema>
export type ExamSessionCompletionState = z.infer<typeof examSessionCompletionStateSchema>
export type ExamResponseModality = z.infer<typeof examResponseModalitySchema>
export type ExamSessionConstraints = z.infer<typeof examSessionConstraintsSchema>
