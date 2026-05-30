/**
 * SRS item — per-user scheduling wrapper around a `ReviewItem` (or legacy lemma card).
 * SM-2–style fields; `performanceHistory` supports FSRS migration later.
 *
 * @example
 * ```ts
 * const srs = srsItemSchema.parse({
 *   id: 'srs-user01-rev-lemma-bon',
 *   userId: 'user_01',
 *   reviewItemId: 'rev-lemma-bon',
 *   easeFactor: 2.5,
 *   interval: 1,
 *   repetitions: 0,
 *   dueDate: new Date().toISOString(),
 *   performanceHistory: [{ reviewedAt: new Date().toISOString(), correct: true, quality: 4 }],
 * })
 * ```
 */
import { z } from 'zod'
import { idSchema, metadataSchema, isoDateTimeSchema } from '@/lib/schemas/shared.schema'

export const srsPerformanceEntrySchema = z.object({
  reviewedAt: isoDateTimeSchema,
  correct: z.boolean(),
  /** Optional SM-2 quality 0–5 */
  quality: z.number().int().min(0).max(5).optional(),
})

export const srsLifecycleStateSchema = z.enum(['learning', 'review', 'relearning', 'graduated'])

export const srsItemSchema = z.object({
  id: idSchema,
  userId: idSchema,
  reviewItemId: idSchema,
  easeFactor: z.number().positive(),
  /** Days until next review (or minutes in dev; document convention in API) */
  interval: z.number().nonnegative(),
  repetitions: z.number().int().nonnegative(),
  dueDate: isoDateTimeSchema,
  lastReviewed: isoDateTimeSchema.optional(),
  /** Last learner grade: 4 perfect … 1 wrong (Stage 4 review engine). */
  lastScore: z.number().int().min(1).max(4).optional(),
  lapses: z.number().int().nonnegative().optional(),
  state: srsLifecycleStateSchema.optional(),
  performanceHistory: z.array(srsPerformanceEntrySchema),
  metadata: metadataSchema,
})

export type SrsItem = z.infer<typeof srsItemSchema>
export type SrsPerformanceEntry = z.infer<typeof srsPerformanceEntrySchema>
