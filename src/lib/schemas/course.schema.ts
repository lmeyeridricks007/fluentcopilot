/**
 * Course — top-level container for a CEFR-scoped learning path (e.g. Dutch A2).
 *
 * @example
 * ```ts
 * const course = courseSchema.parse({
 *   id: 'course-nl-a2',
 *   title: 'Dutch A2',
 *   language: 'nl',
 *   cefrLevel: 'A2',
 *   description: 'Practical Dutch through tasks',
 *   modules: [module],
 * })
 * ```
 */
import { z } from 'zod'
import { idSchema, metadataSchema } from '@/lib/schemas/shared.schema'
import { moduleSchema } from '@/lib/schemas/module.schema'

export const courseLanguageSchema = z.literal('nl')

export const courseCefrSchema = z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])

export const courseSchema = z.object({
  id: idSchema,
  title: z.string().min(1),
  language: courseLanguageSchema,
  cefrLevel: courseCefrSchema,
  description: z.string().min(1),
  modules: z.array(moduleSchema).min(1),
  metadata: metadataSchema,
})

export type Course = z.infer<typeof courseSchema>
