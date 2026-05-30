'use client'

import { useMemo } from 'react'
import { loadWeakTags } from '@/features/curriculum/a2ReviewStore'
import { useRetentionProfile } from '@/features/retention/useRetentionProfile'
import { useMasteryMapViewModel } from '@/features/progress/useMasteryMapViewModel'
import {
  buildAbilityBandCounts,
  buildPostA2TransitionViewModel,
  weakAbilityTitlesForReadiness,
} from '@/lib/post-a2'
import { loadExamReadinessAttempts } from '@/lib/exam-readiness/examReadinessHistory'
import { readExamHabitStreak } from '@/lib/exam-rewards/examHabitStreak'

function countExamAttemptsSince(days: number): number {
  const cutoff = Date.now() - days * 86400000
  return loadExamReadinessAttempts().filter((a) => new Date(a.at).getTime() >= cutoff).length
}

export function usePostA2TransitionViewModel() {
  const { userId, profile } = useRetentionProfile()
  const masteryVm = useMasteryMapViewModel()

  return useMemo(() => {
    const weakRows = loadWeakTags()
    const weakTagsCount = weakRows.length
    const bands = buildAbilityBandCounts({
      userId,
      profile,
      weakTagRows: weakRows,
    })
    const flat = masteryVm.groups.flatMap((g) => g.abilities)
    const recentExamAttemptCount = countExamAttemptsSince(21)
    const examHabitStreakDays = profile ? readExamHabitStreak(profile.metadata).current : 0
    return buildPostA2TransitionViewModel({
      bands,
      weakTagsCount,
      weakAbilityTitles: weakAbilityTitlesForReadiness(flat),
      recentExamAttemptCount,
      examHabitStreakDays,
    })
  }, [userId, profile, masteryVm])
}
