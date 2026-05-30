/**
 * Personalization Engine — learner profile schema.
 */

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1'

export type LearningGoal = 'integration_exam' | 'workplace' | 'social' | 'daily_life' | 'general'

export interface LearnerProfile {
  user_id: string
  native_language: string
  known_languages: string[]
  country_of_origin?: string
  time_in_country_months?: number
  family_status?: string
  age_range?: string
  occupation?: string
  industry?: string
  hobbies?: string[]
  current_level: CEFRLevel
  target_level: CEFRLevel
  learning_goal: LearningGoal
  daily_goal_minutes: number
  created_at?: string
  updated_at?: string
}
