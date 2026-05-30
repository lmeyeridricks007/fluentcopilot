/**
 * DTOs for the Skill-System-driven recommendation plan (ranked list + persisted bundle slots).
 */
import type { SkillId, SkillRecommendation } from './skillTypes'

export type SkillDrivenRecommendationKind =
  | 'scenario'
  | 'read_aloud'
  | 'coach'
  | 'encouragement'
  | 'focus_chip'

/** One ranked candidate with optional score explainability for debugging / future UI. */
export type SkillDrivenRecommendationItemDTO = {
  rank: number
  type: SkillDrivenRecommendationKind
  targetId: string | null
  title: string
  subtitle: string
  reason: string
  relatedSkillIds: SkillId[]
  priorityScore: number
  scoreExplain?: {
    weaknessAlignment: number
    improvingBoost: number
    fatigueMultiplier: number
    modalityMultiplier: number
    confidenceMultiplier: number
  }
}

/** Full plan: ordered items + the three slots persisted on {@link UserSkillProfile.recommendations}. */
export type SkillDrivenRecommendationPlanDTO = {
  items: SkillDrivenRecommendationItemDTO[]
  /** Persisted bundle (primary / secondary / encouragement + optional focus chip). */
  bundle: {
    primary: SkillRecommendation | null
    secondary: SkillRecommendation | null
    encouragement: SkillRecommendation | null
    focusChip: SkillRecommendation | null
    generatedAt: string
  }
}
