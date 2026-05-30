/**
 * Review item — canonical card/prompt for SRS (generated or hand-authored).
 * Distinct from `SRSItem` (per-user scheduling state).
 *
 * @example
 * ```ts
 * const item = reviewItemSchema.parse({
 *   id: 'rev-lemma-bon',
 *   sourceLessonId: 'a2-m02-l04',
 *   type: 'vocab',
 *   prompt: 'Translate: receipt',
 *   expectedAnswer: 'bon / de bon',
 *   variants: ['het bon'],
 *   difficulty: 'A2_low',
 *   tags: ['shopping'],
 * })
 * ```
 */
import { z } from 'zod'
import { idSchema, metadataSchema } from '@/lib/schemas/shared.schema'
import { exerciseDifficultySchema } from '@/lib/schemas/exercise.schema'

export const reviewItemTypeSchema = z.enum(['vocab', 'phrase', 'grammar', 'listening', 'speaking', 'kmn'])

export const reviewItemSchema = z.object({
  id: idSchema,
  sourceLessonId: idSchema,
  type: reviewItemTypeSchema,
  prompt: z.string().min(1),
  expectedAnswer: z.union([z.string(), z.array(z.string().min(1)).min(1)]),
  variants: z.array(z.string()).optional(),
  difficulty: exerciseDifficultySchema,
  tags: z.array(z.string().min(1)).optional(),
  metadata: metadataSchema,
})

export type ReviewItem = z.infer<typeof reviewItemSchema>
export type ReviewItemType = z.infer<typeof reviewItemTypeSchema>
