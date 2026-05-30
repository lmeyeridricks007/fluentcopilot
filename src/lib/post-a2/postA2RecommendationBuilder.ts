import type { B1ReadinessLevel, PostA2NextOptionId } from '@/lib/post-a2/types'
import { buildPostA2RecommendedOption } from '@/lib/post-a2-pathways/postA2RecommendationEngine'

/** Back-compat helper when exam signals are unknown — prefer {@link buildPostA2RecommendedOption} with full signals. */
export function recommendedPostA2Option(level: B1ReadinessLevel): PostA2NextOptionId {
  return buildPostA2RecommendedOption({
    readinessLevel: level,
    recentExamAttemptCount: 0,
    examHabitStreakDays: 0,
  })
}
