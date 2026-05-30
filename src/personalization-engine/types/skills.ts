/**
 * Personalization Engine — skill dimensions and skill state.
 */

export type SkillDimension =
  | 'vocabulary'
  | 'grammar'
  | 'listening'
  | 'speaking'
  | 'pronunciation'
  | 'reading'
  | 'conversation_fluency'

export type TrendDirection = 'up' | 'stable' | 'down'

export interface SkillState {
  dimension: SkillDimension
  score: number
  confidence: number
  recent_performance: number
  trend: TrendDirection
  last_updated: string
  sample_count: number
}

export interface LearnerSkillProfile {
  user_id: string
  skills: Record<SkillDimension, SkillState>
  overall_level_estimate: string
  weak_skills: SkillDimension[]
  strong_skills: SkillDimension[]
  updated_at: string
}
