/**
 * Lesson — **Stage 5 final JSON shape** (authoring + runtime).
 *
 * Required: `id`, `moduleId`, `title`, `lessonType`, `order`, `cefrLevel`, `durationEstimate`,
 * `grammarTargets[]`, `vocabTargets[]`, `canDoStatements[]` (min 1), `steps[]` (min 1), `metadata`.
 * Optional: `reviewItemRefs[]` (fill via `tools/extract-review-items.ts --patch-module`),
 * `mistakeFocus[]` (review-engine taxonomy).
 *
 * `grammarTargets` / `vocabTargets` are **ids** that must exist on the module (validated by tooling).
 *
 * @example
 * ```ts
 * const lesson = lessonSchema.parse({
 *   id: 'a2-m02-l04',
 *   moduleId: 'a2-m02-food-shopping',
 *   title: 'At the bakery',
 *   lessonType: 'practice',
 *   order: 3,
 *   cefrLevel: 'A2',
 *   durationEstimate: 14,
 *   grammarTargets: ['a2.1-modals-requests'],
 *   vocabTargets: ['lemma-bon', 'lemma-brood'],
 *   canDoStatements: ['I can ask for a receipt politely.'],
 *   steps: [...],
 *   reviewItemRefs: ['rev-lemma-bon', 'rev-grammar-modals'],
 *   mistakeFocus: ['word-order', 'register'],
 * })
 * ```
 */
import { z } from 'zod'
import { idSchema, metadataSchema } from '@/lib/schemas/shared.schema'
import { lessonStepSchema } from '@/lib/schemas/lessonStep.schema'

export const lessonTypeSchema = z.enum([
  'input',
  'pattern',
  'practice',
  'speaking',
  'writing',
  'task',
  'review',
  /** Band/module milestone — path renders as a larger checkpoint node. */
  'checkpoint',
])

export const lessonSchema = z.object({
  id: idSchema,
  moduleId: idSchema,
  title: z.string().min(1),
  lessonType: lessonTypeSchema,
  order: z.number().int().nonnegative(),
  cefrLevel: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
  /** Estimated minutes */
  durationEstimate: z.number().positive(),
  /** Grammar target ids (resolved against module.grammarTargets) */
  grammarTargets: z.array(z.string().min(1)),
  /** Vocab target ids (resolved against module.vocabTargets) */
  vocabTargets: z.array(z.string().min(1)),
  canDoStatements: z.array(z.string().min(1)).min(1),
  steps: z.array(lessonStepSchema).min(1),
  /** Pre-generated or canonical review item ids (SRS layer) */
  reviewItemRefs: z.array(z.string().min(1)).optional(),
  /** Error taxonomy ids for prioritised review (see product review-engine) */
  mistakeFocus: z.array(z.string().min(1)).optional(),
  metadata: metadataSchema,
})

export type Lesson = z.infer<typeof lessonSchema>
export type LessonType = z.infer<typeof lessonTypeSchema>
