/**
 * Role / persona — AI interlocutor definition for prompt assembly (content, not runtime chat).
 */
import { z } from 'zod'
import { idSchema, metadataSchema } from '@/lib/schemas/shared.schema'
import { cefrBandSchema, practiceLifeAreaSchema } from '@/lib/schemas/practice/practiceShared.schema'

export const personaToneSchema = z.enum([
  'neutral_professional',
  'warm_friendly',
  'formal_official',
  'collegial',
  'clinical_calm',
])

export const rolePersonaSchema = z.object({
  id: idSchema,
  roleName: z.string().min(1),
  /** Life-area tag for catalog filters (aligned with scenario.category). */
  scenarioCategory: practiceLifeAreaSchema,
  tone: personaToneSchema,
  speakingStyle: z.string().min(1),
  /** Target learner-facing difficulty band for this persona’s Dutch. */
  difficultyLevel: cefrBandSchema,
  /** e.g. "Dutch only", "short sentences", "u-form in shop" */
  languageConstraints: z.array(z.string().min(1)).min(1),
  /** Do / don’t rules for orchestration (data, not prompt prose). */
  behaviorRules: z.array(z.string().min(1)).optional(),
  greetingStyle: z.string().min(1),
  followUpStyle: z.string().min(1),
  metadata: metadataSchema,
})

export type RolePersona = z.infer<typeof rolePersonaSchema>
export type PersonaTone = z.infer<typeof personaToneSchema>
