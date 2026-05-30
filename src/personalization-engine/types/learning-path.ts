/**
 * Personalization Engine — learning path and spaced repetition types.
 */

import type { Recommendation } from './recommendations.js'

export interface DailyLearningPath {
  user_id: string
  date: string
  recommended_lessons: Recommendation[]
  review_items: Recommendation[]
  scenario_practice?: Recommendation
  daily_goal_minutes: number
  weekly_goal_minutes?: number
  progress_toward_goal_minutes?: number
}

export interface WeeklyLearningPath {
  user_id: string
  week_start: string
  goals: string[]
  skill_balance: Array<{ skill: string; target_minutes?: number }>
  scenario_rotation: string[]
  review_cycles: number
}

export interface SpacedRepetitionItem {
  item_id: string
  user_id: string
  last_reviewed: string
  difficulty: number
  recall_success_count: number
  recall_fail_count: number
  next_review_due: string
}
