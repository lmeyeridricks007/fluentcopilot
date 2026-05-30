'use client'

import { useMemo } from 'react'
import { loadWeakTags } from '@/features/curriculum/a2ReviewStore'
import { useRetentionProfile } from '@/features/retention/useRetentionProfile'
import { useMasteryMapViewModel } from '@/features/progress/useMasteryMapViewModel'
import { usePracticeHubViewModel } from '@/features/practice-hub/usePracticeHubViewModel'
import { buildConfidenceTrendSummary } from '@/lib/dashboard'
import { buildAbilityBandCounts, evaluateReadinessForB1, weakAbilityTitlesForReadiness } from '@/lib/post-a2'
import type { ReadinessEvaluation } from '@/lib/post-a2/types'
import type { ConfidenceTrendSummaryVm } from '@/lib/dashboard/confidenceTrendSummary'
import type { ScenarioStreakVm } from '@/features/practice-hub/types'
import { isStreakAtRisk, localDateKey } from '@/lib/retention/streak'

export type ProgressDashboardModel = {
  readiness: ReadinessEvaluation
  confidenceTrend: ConfidenceTrendSummaryVm
  scenarioStreak: ScenarioStreakVm
  retentionStreak: number
  retentionStreakCaption: string
  totalXp: number
  weeklyXp: number
}

export function useProgressDashboardModel(): ProgressDashboardModel {
  const practice = usePracticeHubViewModel()
  const masteryVm = useMasteryMapViewModel()
  const { profile, userId, streak, totalXp, weeklyXp } = useRetentionProfile()

  return useMemo(() => {
    const flat = masteryVm.groups.flatMap((g) => g.abilities)
    const weakRows = loadWeakTags()
    const readiness = evaluateReadinessForB1({
      bands: buildAbilityBandCounts({ userId, profile, weakTagRows: weakRows }),
      weakTagsCount: weakRows.length,
      weakAbilityTitles: weakAbilityTitlesForReadiness(flat),
    })
    const confidenceTrend = buildConfidenceTrendSummary(flat)
    const todayKey = localDateKey()
    let retentionStreakCaption = 'Start today — learners who practice daily tend to pass levels faster.'
    if (profile) {
      if (streak > 0 && isStreakAtRisk(profile.streak, todayKey)) {
        retentionStreakCaption = 'Practice today to keep your habit — short sessions count.'
      } else if (streak > 0) {
        retentionStreakCaption = `${streak} days in a row — nice rhythm.`
      }
    }

    return {
      readiness,
      confidenceTrend,
      scenarioStreak: practice.scenarioStreak,
      retentionStreak: streak,
      retentionStreakCaption,
      totalXp,
      weeklyXp,
    }
  }, [practice, masteryVm, profile, userId, streak, totalXp, weeklyXp])
}
