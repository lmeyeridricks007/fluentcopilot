/**
 * Feedback copy and tags attached to steps, exercises, or review items.
 * UI maps these strings to presentation; content stays data-only.
 *
 * @example
 * ```ts
 * const fb = feedbackSchema.parse({
 *   correctFeedback: 'Goed zo!',
 *   incorrectFeedback: 'Let op de woordvolgorde.',
 *   errorTags: ['word-order'],
 * })
 * ```
 */
import { z } from 'zod'
import { metadataSchema } from '@/lib/schemas/shared.schema'

export const feedbackSchema = z.object({
  correctFeedback: z.string().optional(),
  incorrectFeedback: z.string().optional(),
  hint: z.string().optional(),
  upgradeSuggestion: z.string().optional(),
  pronunciationTips: z.string().optional(),
  errorTags: z.array(z.string().min(1)).optional(),
  metadata: metadataSchema,
})

/** Partial feedback for step-level overrides (merge with defaults). */
export const feedbackConfigSchema = feedbackSchema.partial().omit({ metadata: true }).extend({
  metadata: metadataSchema,
})

export type Feedback = z.infer<typeof feedbackSchema>
export type FeedbackConfig = z.infer<typeof feedbackConfigSchema>
