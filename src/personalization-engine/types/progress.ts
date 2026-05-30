/**
 * Personalization Engine — progress and activity tracking.
 */

export interface LessonCompletion {
  lesson_id: string
  completed_at: string
  success: boolean
  score?: number
  time_spent_seconds?: number
}

export interface FlashcardAttempt {
  item_id: string
  success: boolean
  reviewed_at: string
}

export interface QuizResult {
  quiz_id: string
  completed_at: string
  accuracy: number
  time_spent_seconds?: number
}

export interface ConversationSessionSummary {
  session_id: string
  scenario_id: string
  completed_at: string
  turn_count: number
  correction_count: number
  fluency_score?: number
}

export interface PronunciationAttempt {
  completed_at: string
  score: number
  reference_text?: string
}

export interface ListeningAttempt {
  exercise_id: string
  completed_at: string
  comprehension_score: number
}

export interface ProgressSnapshot {
  user_id: string
  lessons_completed: number
  flashcard_success_rate: number
  quiz_accuracy_avg: number
  conversation_sessions_count: number
  pronunciation_score_avg: number
  listening_comprehension_avg: number
  current_streak_days: number
  total_xp: number
  total_time_minutes: number
  last_activity_at?: string
}
