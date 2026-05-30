/**
 * Shared enums and primitives for Practice & Mastery schemas.
 * Keeps conversation modes, access tiers, and activity kinds consistent across content + runtime.
 */
import { z } from 'zod'
import { metadataSchema } from '@/lib/schemas/shared.schema'

/** Scenario conversation scaffolding level (architecture: guided → semi → free). */
export const practiceConversationModeSchema = z.enum(['guided', 'semi_guided', 'free'])

/** What kind of practice activity a session represents. */
export const practiceActivityKindSchema = z.enum([
  'scenario_conversation',
  'skill_drill',
  'weakness_drill',
  'mastery_check',
  'mission_bundle',
])

/**
 * Premium / entitlement surface for catalog filtering (enforcement stays server-side).
 * - `free_ok` — full text scenario available on free within usage caps
 * - `premium_only` — start requires premium/trial
 * - `premium_voice` — text may be free; STT/TTS requires premium
 */
export const practicePremiumRequirementSchema = z.enum(['free_ok', 'premium_only', 'premium_voice'])

export const practiceAccessRulesSchema = z.object({
  premiumRequirement: practicePremiumRequirementSchema,
  /** Entitlements service key, e.g. scenarios_per_week — optional contract hook */
  usageLimitKey: z.string().min(1).optional(),
  metadata: metadataSchema,
})

/** Proficiency bucket for abilities and coarse scoring. */
export const proficiencyBandSchema = z.enum(['weak', 'developing', 'strong'])

/** Confidence trend for dashboards. */
export const confidenceTrendSchema = z.enum(['up', 'down', 'stable', 'unknown'])

/** CEFR band for scenario/persona targeting (aligns with grammarTarget.schema). */
export const cefrBandSchema = z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])

export type PracticeConversationMode = z.infer<typeof practiceConversationModeSchema>
export type PracticeActivityKind = z.infer<typeof practiceActivityKindSchema>
export type PracticePremiumRequirement = z.infer<typeof practicePremiumRequirementSchema>
export type PracticeAccessRules = z.infer<typeof practiceAccessRulesSchema>
export type ProficiencyBand = z.infer<typeof proficiencyBandSchema>
export type ConfidenceTrend = z.infer<typeof confidenceTrendSchema>
export type CefrBand = z.infer<typeof cefrBandSchema>

/** Shared taxonomy for scenarios, personas, and ability tags (catalog filtering). */
export const practiceLifeAreaSchema = z.enum([
  'food_drink',
  'health',
  'admin',
  'work',
  'shopping',
  'transport',
  'social',
  'housing',
  'other',
])

export type PracticeLifeArea = z.infer<typeof practiceLifeAreaSchema>
