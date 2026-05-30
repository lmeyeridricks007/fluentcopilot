/**
 * Mistake event — append-only learner signal for analytics and adaptive review.
 * Persisted server-side; never embedded in static lesson JSON.
 *
 * @example
 * ```ts
 * const ev = mistakeEventSchema.parse({
 *   id: 'mistake-uuid',
 *   userId: 'user_01',
 *   lessonId: 'a2-m02-l04',
 *   stepId: 'step-mcq-02',
 *   itemId: 'ex-mcq-bakery',
 *   errorType: 'grammar',
 *   userAnswer: 'Ik wil een bon graag',
 *   correctAnswer: 'Ik wil graag een bon.',
 *   timestamp: new Date().toISOString(),
 *   severity: 2,
 * })
 * ```
 */
import { z } from 'zod'
import { idSchema, metadataSchema, isoDateTimeSchema } from '@/lib/schemas/shared.schema'

export const mistakeErrorTypeSchema = z.enum([
  'grammar',
  'vocab',
  'order',
  'pronunciation',
  /** Listening / comprehension slip (maps to listening skill signals). */
  'listening',
  /** Spelling / orthography. */
  'spelling',
  /** Hesitation, retries, low confidence (review UX). */
  'hesitation',
])

export const mistakeEventSchema = z.object({
  id: idSchema,
  userId: idSchema,
  lessonId: idSchema,
  stepId: idSchema,
  itemId: idSchema,
  errorType: mistakeErrorTypeSchema,
  userAnswer: z.string(),
  correctAnswer: z.string(),
  timestamp: isoDateTimeSchema,
  /** 1 = minor slip, 3 = systematic confusion (product-tunable) */
  severity: z.number().int().min(1).max(5),
  /** When the mistake happened during a review card (optional). */
  reviewItemId: idSchema.optional(),
  metadata: metadataSchema,
})

export type MistakeEvent = z.infer<typeof mistakeEventSchema>
export type MistakeErrorType = z.infer<typeof mistakeErrorTypeSchema>
