/**
 * Personalization Engine — activity/telemetry event types.
 */

import type { SkillDimension } from './skills.js'

export type ActivityEventType =
  | 'lesson_started'
  | 'lesson_completed'
  | 'lesson_abandoned'
  | 'flashcard_reviewed'
  | 'quiz_started'
  | 'quiz_completed'
  | 'conversation_started'
  | 'conversation_completed'
  | 'pronunciation_completed'
  | 'listening_completed'
  | 'exam_prep_started'
  | 'exam_prep_completed'

export interface ActivityEvent {
  event_type: ActivityEventType
  user_id: string
  timestamp: string
  payload?: {
    lesson_id?: string
    quiz_id?: string
    scenario_id?: string
    exercise_id?: string
    success?: boolean
    score?: number
    accuracy?: number
    comprehension_score?: number
    time_spent_seconds?: number
    correction_count?: number
    fluency_score?: number
    skill_dimension?: SkillDimension
  }
}
