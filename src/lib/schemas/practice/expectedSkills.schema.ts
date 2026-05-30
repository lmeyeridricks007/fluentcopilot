/**
 * Expected skill — signals a scenario, drill, or session targets for measurement and recommendations.
 * Distinct from lesson `mistakeFocus`; aligns with analytics and mastery updates.
 */
import { z } from 'zod'
import { idSchema, metadataSchema } from '@/lib/schemas/shared.schema'

export const expectedSkillCategorySchema = z.enum([
  'listening',
  'speaking',
  'reading',
  'writing',
  'interaction',
  'pronunciation',
  'pragmatics',
  'fluency',
])

export const expectedSkillSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  category: expectedSkillCategorySchema,
  description: z.string().min(1),
  /** Hints for orchestration / analytics (not prescriptive AI logic). */
  measurementHints: z.array(z.string().min(1)).optional(),
  /** Ability tags this skill supports (see abilityTag.schema). */
  relatedAbilities: z.array(idSchema).optional(),
  metadata: metadataSchema,
})

export type ExpectedSkill = z.infer<typeof expectedSkillSchema>
export type ExpectedSkillCategory = z.infer<typeof expectedSkillCategorySchema>
