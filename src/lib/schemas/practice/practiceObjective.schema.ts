/**
 * Practice objective — communicative outcome for a scenario, stage, or drill.
 */
import { z } from 'zod'
import { idSchema, metadataSchema } from '@/lib/schemas/shared.schema'

export const practiceObjectiveTypeSchema = z.enum([
  'transactional',
  'information_gap',
  'problem_solve',
  'social_ritual',
  'clarification_repair',
  'narration',
  'instruction_following',
])

export const practiceObjectiveSchema = z.object({
  id: idSchema,
  title: z.string().min(1),
  objectiveType: practiceObjectiveTypeSchema,
  description: z.string().min(1),
  successCriteria: z.array(z.string().min(1)).min(1),
  keyPhrases: z.array(z.string().min(1)).optional(),
  relatedAbilities: z.array(idSchema).optional(),
  relatedExpectedSkills: z.array(idSchema).optional(),
  metadata: metadataSchema,
})

export type PracticeObjective = z.infer<typeof practiceObjectiveSchema>
export type PracticeObjectiveType = z.infer<typeof practiceObjectiveTypeSchema>
