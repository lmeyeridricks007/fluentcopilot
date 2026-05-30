/**
 * Authorable rubric definitions — categories, weights, scales.
 * Evaluation services load by `id` + `version` (audit trail).
 */
import { z } from 'zod'
import { idSchema, metadataSchema } from '@/lib/schemas/shared.schema'
import { rubricDomainKeySchema } from '@/lib/schemas/exam/examType.schema'

export const rubricScaleLevelSchema = z.object({
  /** Ordinal or symbolic level id, e.g. `0`, `1`, `insufficient`, `adequate`. */
  levelKey: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1).optional(),
  /** Numeric points for this level (if rubric is points-based). */
  points: z.number().nonnegative().optional(),
})

export const rubricCategoryDefinitionSchema = z.object({
  /** Stable key used in `ExamRubricScore` rows, e.g. `task_fulfilment`. */
  categoryKey: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1).optional(),
  /** Weight relative to sibling categories (typically sum to 1). */
  weight: z.number().positive(),
  maxPoints: z.number().positive(),
  /** Optional ordered levels; if omitted, engine uses continuous 0–maxPoints. */
  levels: z.array(rubricScaleLevelSchema).optional(),
  metadata: metadataSchema,
})

export const rubricDefinitionSchema = z.object({
  id: idSchema,
  /** Monotonic content version; must bump when categories/weights change. */
  version: z.string().min(1),
  examType: rubricDomainKeySchema,
  title: z.string().min(1),
  description: z.string().min(1).optional(),
  categories: z.array(rubricCategoryDefinitionSchema).min(1),
  /** Sum of category maxPoints or weighted total — evaluator must match this. */
  totalMaxPoints: z.number().positive(),
  metadata: metadataSchema,
})

export type RubricScaleLevel = z.infer<typeof rubricScaleLevelSchema>
export type RubricCategoryDefinition = z.infer<typeof rubricCategoryDefinitionSchema>
export type RubricDefinition = z.infer<typeof rubricDefinitionSchema>
