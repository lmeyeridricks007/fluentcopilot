/**
 * Module (thematic unit) — owns grammar/vocab target catalog and ordered lessons.
 *
 * @example
 * ```ts
 * const mod = moduleSchema.parse({
 *   id: 'a2-m02-food-shopping',
 *   title: 'Food & shopping',
 *   band: 'A2.1',
 *   description: 'Transactions and polite requests',
 *   order: 1,
 *   lessons: [lesson],
 *   grammarTargets: [...],
 *   vocabTargets: [...],
 *   learningGoals: ['Handle simple purchases'],
 * })
 * ```
 */
import { z } from 'zod'
import { idSchema, metadataSchema } from '@/lib/schemas/shared.schema'
import { grammarTargetSchema } from '@/lib/schemas/grammarTarget.schema'
import { lessonSchema } from '@/lib/schemas/lesson.schema'
import { vocabTargetSchema } from '@/lib/schemas/vocabTarget.schema'

export const a2BandSchema = z.enum(['A2.1', 'A2.2', 'A2.3'])

export const moduleSchema = z.object({
  id: idSchema,
  title: z.string().min(1),
  band: a2BandSchema,
  description: z.string().min(1),
  order: z.number().int().nonnegative(),
  lessons: z.array(lessonSchema).min(1),
  grammarTargets: z.array(grammarTargetSchema),
  vocabTargets: z.array(vocabTargetSchema),
  learningGoals: z.array(z.string().min(1)).min(1),
  metadata: metadataSchema,
})

export type CourseModule = z.infer<typeof moduleSchema>
export type A2Band = z.infer<typeof a2BandSchema>
