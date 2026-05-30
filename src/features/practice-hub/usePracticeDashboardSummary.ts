'use client'

import { useMemo } from 'react'
import { loadWeakTags } from '@/features/curriculum/a2ReviewStore'
import { useRetentionProfile } from '@/features/retention/useRetentionProfile'
import { useMasteryMapViewModel } from '@/features/progress/useMasteryMapViewModel'
import { buildNextBestAction, buildConfidenceTrendSummary, buildMasterySnapshotRows } from '@/lib/dashboard'
import { buildAbilityBandCounts, evaluateReadinessForB1, weakAbilityTitlesForReadiness } from '@/lib/post-a2'
import { isA2PathCompleteMerged } from '@/lib/post-a2'
import { readPostA2PathwayState } from '@/lib/post-a2-pathways'
import { usePracticeHubViewModel } from '@/features/practice-hub/usePracticeHubViewModel'
import { MOCK_LESSON_PROGRESS } from '@/mocks/lessonProgress'
import { useStudyContextStore } from '@/store/studyContextStore'
import type { PracticeHubViewModel, RecommendationVm } from '@/features/practice-hub/types'
import type { NextBestActionVm } from '@/lib/dashboard/nextBestAction'
import type { ReadinessEvaluation } from '@/lib/post-a2/types'
import type { ConfidenceTrendSummaryVm } from '@/lib/dashboard/confidenceTrendSummary'
import type { MasterySnapshotRowVm } from '@/lib/dashboard/dashboardTypes'

export type PracticeDashboardSummary = {
  practice: PracticeHubViewModel
  nextBest: NextBestActionVm
  readiness: ReadinessEvaluation
  confidenceTrend: ConfidenceTrendSummaryVm
  featuredScenario: RecommendationVm | null
  masterySnapshot: MasterySnapshotRowVm[]
}

export function usePracticeDashboardSummary(): PracticeDashboardSummary {
  const practice = usePracticeHubViewModel()
  const masteryVm = useMasteryMapViewModel()
  const { profile, userId, completedLessonIds } = useRetentionProfile()
  const activeStudyLevel = useStudyContextStore((s) => s.activeStudyLevel)

  return useMemo(() => {
    const flat = masteryVm.groups.flatMap((g) => g.abilities)
    const weakRows = loadWeakTags()
    const readiness = evaluateReadinessForB1({
      bands: buildAbilityBandCounts({ userId, profile, weakTagRows: weakRows }),
      weakTagsCount: weakRows.length,
      weakAbilityTitles: weakAbilityTitlesForReadiness(flat),
    })
    const confidenceTrend = buildConfidenceTrendSummary(flat)
    const postA2Eligible =
      activeStudyLevel === 'A2' && isA2PathCompleteMerged(completedLessonIds, MOCK_LESSON_PROGRESS)
    const pathwayChoice = readPostA2PathwayState(profile).choice
    const nextBest = buildNextBestAction({
      practice,
      lessonFallback: null,
      postA2PathwayFocus: postA2Eligible ? pathwayChoice : undefined,
    })
    const rec = practice.recommendations[0]
    const featuredScenario = rec && rec.href !== nextBest.href ? rec : null
    const masterySnapshot = buildMasterySnapshotRows(flat)

    return {
      practice,
      nextBest,
      readiness,
      confidenceTrend,
      featuredScenario,
      masterySnapshot,
    }
  }, [practice, masteryVm, profile, userId, activeStudyLevel, completedLessonIds])
}
