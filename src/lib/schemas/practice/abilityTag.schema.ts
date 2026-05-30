/**
 * Ability / mastery tag — real-world communicative capability (Practice & Mastery core).
 * Links scenarios, lessons, and skills for recommendations and readiness narratives.
 */
import { z } from 'zod'
import { idSchema, metadataSchema } from '@/lib/schemas/shared.schema'
import { practiceLifeAreaSchema } from '@/lib/schemas/practice/practiceShared.schema'

export const abilityTagSchema = z.object({
  id: idSchema,
  title: z.string().min(1),
  category: practiceLifeAreaSchema,
  description: z.string().min(1),
  relatedScenarios: z.array(idSchema).optional(),
  /** Curriculum lesson ids (module spine). */
  relatedLessons: z.array(idSchema).optional(),
  relatedSkills: z.array(idSchema).optional(),
  /** Product copy / pedagogy hints for unlock messaging. */
  progressionHints: z.string().optional(),
  metadata: metadataSchema,
})

export type AbilityTag = z.infer<typeof abilityTagSchema>
