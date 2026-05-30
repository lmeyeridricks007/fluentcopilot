import type { B1ReadinessLevel, PostA2NextOptionId } from '@/lib/post-a2/types'

export type PostA2RecommendationSignals = {
  readinessLevel: B1ReadinessLevel
  /** Exam readiness attempts recorded in the last 21 days (local history). */
  recentExamAttemptCount: number
  /** From retention metadata `examPrepHabitStreak.current` when present. */
  examHabitStreakDays: number
}

/**
 * Picks a default suggestion — user can always choose another card.
 * Exam engagement nudges toward Option C when B1 is not already the clear win.
 */
export function buildPostA2RecommendedOption(signals: PostA2RecommendationSignals): PostA2NextOptionId {
  const { readinessLevel, recentExamAttemptCount, examHabitStreakDays } = signals
  const examEngaged = recentExamAttemptCount >= 3 || examHabitStreakDays >= 2
  const examStrong = recentExamAttemptCount >= 6 || examHabitStreakDays >= 4

  if (readinessLevel === 'ready') {
    return 'continue_b1'
  }

  if (readinessLevel === 'strengthen_first') {
    if (examEngaged && recentExamAttemptCount >= 2) return 'exam_preparation'
    return 'a2_mastery'
  }

  // nearly_ready
  if (examStrong) return 'exam_preparation'
  if (examEngaged && recentExamAttemptCount >= 4) return 'exam_preparation'
  return 'a2_mastery'
}
