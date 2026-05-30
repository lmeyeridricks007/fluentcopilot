/**
 * Personalization Engine — activity event ingestion and progress update.
 */

import type { ActivityEvent } from '../types/activity.js'
import type { ProgressSnapshot } from '../types/progress.js'
import {
  getProgressSnapshot,
  setProgressSnapshot,
  addLessonCompletion,
  addQuizResult,
  addConversationSummary,
} from '../models/profileStore.js'

export function ingestActivityEvent(event: ActivityEvent): void {
  const snapshot = getProgressSnapshot(event.user_id) ?? buildDefaultSnapshot(event.user_id)

  switch (event.event_type) {
    case 'lesson_completed': {
      if (event.payload?.lesson_id) {
        addLessonCompletion(event.user_id, {
          lesson_id: event.payload.lesson_id,
          completed_at: event.timestamp,
          success: event.payload.success ?? true,
          score: event.payload.score,
          time_spent_seconds: event.payload.time_spent_seconds,
        })
        snapshot.lessons_completed += 1
        snapshot.total_time_minutes += Math.floor((event.payload.time_spent_seconds ?? 0) / 60)
      }
      break
    }
    case 'quiz_completed': {
      if (event.payload?.quiz_id != null && event.payload?.accuracy != null) {
        addQuizResult(event.user_id, {
          quiz_id: event.payload.quiz_id,
          completed_at: event.timestamp,
          accuracy: event.payload.accuracy,
          time_spent_seconds: event.payload.time_spent_seconds,
        })
        const n = snapshot.lessons_completed + 1
        snapshot.quiz_accuracy_avg =
          (snapshot.quiz_accuracy_avg * (n - 1) + event.payload.accuracy) / n
      }
      break
    }
    case 'conversation_completed': {
      if (event.payload?.scenario_id) {
        addConversationSummary(event.user_id, {
          session_id: `sess-${event.timestamp}`,
          scenario_id: event.payload.scenario_id,
          completed_at: event.timestamp,
          turn_count: 4,
          correction_count: event.payload.correction_count ?? 0,
          fluency_score: event.payload.fluency_score,
        })
        snapshot.conversation_sessions_count += 1
      }
      break
    }
    case 'pronunciation_completed': {
      if (event.payload?.score != null) {
        const prev = snapshot.pronunciation_score_avg
        snapshot.pronunciation_score_avg = prev === 0 ? event.payload.score : prev * 0.8 + event.payload.score * 0.2
      }
      break
    }
    case 'listening_completed': {
      if (event.payload?.comprehension_score != null) {
        const prev = snapshot.listening_comprehension_avg
        snapshot.listening_comprehension_avg =
          prev === 0 ? event.payload.comprehension_score : prev * 0.8 + event.payload.comprehension_score * 0.2
      }
      break
    }
    default:
      break
  }

  snapshot.last_activity_at = event.timestamp
  setProgressSnapshot(snapshot)
}

function buildDefaultSnapshot(userId: string): ProgressSnapshot {
  return {
    user_id: userId,
    lessons_completed: 0,
    flashcard_success_rate: 0,
    quiz_accuracy_avg: 0,
    conversation_sessions_count: 0,
    pronunciation_score_avg: 0,
    listening_comprehension_avg: 0,
    current_streak_days: 0,
    total_xp: 0,
    total_time_minutes: 0,
  }
}
