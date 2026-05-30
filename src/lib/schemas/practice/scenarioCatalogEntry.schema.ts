/**
 * Scenario catalog entry — browse/filter metadata for Practice library (lighter than full Scenario).
 * Full authored scenario (stages, turns) may live separately; catalog is the discovery contract.
 */
import { z } from 'zod'
import { idSchema, metadataSchema } from '@/lib/schemas/shared.schema'
import { exerciseDifficultySchema } from '@/lib/schemas/exercise.schema'
import {
  practiceConversationModeSchema,
  practicePremiumRequirementSchema,
} from '@/lib/schemas/practice/practiceShared.schema'

/** Product IA: eight top-level browse categories */
export const scenarioCatalogCategorySchema = z.enum([
  'food',
  'work',
  'health',
  'municipality',
  'housing',
  'transport',
  'social',
  'problem_solving',
  'appointments',
])

/** User-facing readiness / level band for filters */
export const scenarioReadinessSchema = z.enum([
  'beginner_friendly',
  'a2_1',
  'a2_2',
  'near_b1',
  'confident_practice',
])

/** Skill / focus tags for cards and filters */
export const scenarioSkillFocusSchema = z.enum([
  'speaking',
  'listening',
  'reading',
  'writing',
  'conversation_repair',
  'polite_requests',
  'clarification',
  'fluency',
  /** Domain register tags for filters / weak-area heuristics */
  'workplace_register',
  'housing_register',
  'requests',
])

export const scenarioCatalogEntrySchema = z.object({
  id: idSchema,
  title: z.string().min(1),
  /** Short context line for cards (not full prompt context) */
  summary: z.string().min(1),
  category: scenarioCatalogCategorySchema,
  readiness: scenarioReadinessSchema,
  difficulty: exerciseDifficultySchema,
  estimatedMinutes: z.number().int().positive().max(120),
  skillFocus: z.array(scenarioSkillFocusSchema).min(1),
  supportedModes: z.array(practiceConversationModeSchema).min(1),
  premiumRequirement: practicePremiumRequirementSchema,
  /**
   * Substrings matched against learner weak tags (from lessons/review) for
   * "Helps my weak areas" filter and recommendation heuristics.
   */
  weakAreaTagPatterns: z.array(z.string().min(1)).optional(),
  /** Display emoji */
  icon: z.string().optional(),
  /** Lower = surfaced earlier when sorting by recommendation (optional tie-break) */
  recommendationRank: z.number().int().optional(),
  metadata: metadataSchema,
})

export const scenarioCatalogBundleSchema = z.object({
  version: z.number().int().positive(),
  scenarios: z.array(scenarioCatalogEntrySchema).min(1),
})

export type ScenarioCatalogCategory = z.infer<typeof scenarioCatalogCategorySchema>
export type ScenarioReadiness = z.infer<typeof scenarioReadinessSchema>
export type ScenarioSkillFocus = z.infer<typeof scenarioSkillFocusSchema>
export type ScenarioCatalogEntry = z.infer<typeof scenarioCatalogEntrySchema>
export type ScenarioCatalogBundle = z.infer<typeof scenarioCatalogBundleSchema>
