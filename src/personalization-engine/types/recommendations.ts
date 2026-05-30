/**
 * Personalization Engine — recommendation output schema.
 */

import type { SkillDimension } from './skills.js'

export type RecommendationType =
  | 'next_lesson'
  | 'review_flashcards'
  | 'conversation_scenario'
  | 'pronunciation_exercise'
  | 'listening_practice'
  | 'exam_prep_module'
  | 'weak_skill_practice'
  | 'daily_goal'
  | 'streak_reminder'
  | 'challenge'

export type RecommendationPriority = 'high' | 'medium' | 'low'

export interface Recommendation {
  recommendation_id: string
  type: RecommendationType
  content_id: string
  reason: string
  priority: RecommendationPriority
  estimated_time_minutes?: number
  skill_target?: SkillDimension
  metadata?: Record<string, unknown>
}

export interface SessionRecommendationSet {
  user_id: string
  continue_learning?: Recommendation
  daily_practice?: Recommendation
  scenario_practice?: Recommendation
  weak_skill_practice?: Recommendation
  exam_prep?: Recommendation
  retention?: Recommendation[]
  generated_at: string
}
