/**
 * Practice feedback — learner-facing summary after or during practice (human or AI authored).
 * Bridges to SRS via relatedReviewItems / suggested review ids.
 */
import { z } from 'zod'
import { idSchema, metadataSchema } from '@/lib/schemas/shared.schema'

export const practiceCorrectionSchema = z.object({
  original: z.string(),
  corrected: z.string(),
  explanation: z.string().optional(),
  /** Grammar spine or error tag */
  tag: z.string().optional(),
})

export const nextPracticeSuggestionSchema = z.object({
  kind: z.enum(['scenario', 'drill', 'review', 'lesson_recap', 'mastery_check', 'skill_track']),
  targetId: idSchema,
  rationale: z.string().min(1).optional(),
})

export const practiceFeedbackSchema = z.object({
  summary: z.string().min(1),
  whatWentWell: z.array(z.string().min(1)).optional(),
  whatToImprove: z.array(z.string().min(1)).optional(),
  suggestedPhrases: z.array(z.string().min(1)).optional(),
  corrections: z.array(practiceCorrectionSchema).optional(),
  nextPracticeSuggestions: z.array(nextPracticeSuggestionSchema).optional(),
  /** Review bank ids to enqueue or surface */
  relatedReviewItems: z.array(idSchema).optional(),
  confidenceMessage: z.string().min(1).optional(),
  metadata: metadataSchema,
})

export type PracticeCorrection = z.infer<typeof practiceCorrectionSchema>
export type NextPracticeSuggestion = z.infer<typeof nextPracticeSuggestionSchema>
export type PracticeFeedback = z.infer<typeof practiceFeedbackSchema>
