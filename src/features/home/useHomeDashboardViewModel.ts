'use client'

import { useMemo } from 'react'
import { loadWeakTags } from '@/features/curriculum/a2ReviewStore'
import { useRetentionProfile } from '@/features/retention/useRetentionProfile'
import { usePracticeHubViewModel } from '@/features/practice-hub/usePracticeHubViewModel'
import { useMasteryMapViewModel } from '@/features/progress/useMasteryMapViewModel'
import { buildNextBestAction, buildConfidenceTrendSummary } from '@/lib/dashboard'
import { buildAbilityBandCounts, evaluateReadinessForB1, weakAbilityTitlesForReadiness } from '@/lib/post-a2'
import { isA2PathCompleteMerged } from '@/lib/post-a2'
import { readPostA2PathwayState } from '@/lib/post-a2-pathways'
import { buildHomeDashboardViewModel } from '@/features/home/buildHomeDashboardViewModel'
import type { HomeDashboardViewModel } from '@/features/home/homeDashboardTypes'
import { MOCK_RECOMMENDED } from '@/mocks/lessons'
import { MOCK_LESSON_PROGRESS } from '@/mocks/lessonProgress'
import { peopleDailySchemaPlayerHref } from '@/demo-data/curriculum/schemaPeopleDailyPath'
import { isStreakAtRisk, localDateKey } from '@/lib/retention/streak'
import { useStudyContextStore } from '@/store/studyContextStore'

export function useHomeDashboardViewModel(): HomeDashboardViewModel {
  const practice = usePracticeHubViewModel()
  const masteryVm = useMasteryMapViewModel()
  const { streak, totalXp, profile, userId, completedLessonIds } = useRetentionProfile()
  const activeStudyLevel = useStudyContextStore((s) => s.activeStudyLevel)

  return useMemo(() => {
    const flatAbilities = masteryVm.groups.flatMap((g) => g.abilities)
    const weakRows = loadWeakTags()
    const bands = buildAbilityBandCounts({
      userId,
      profile,
      weakTagRows: weakRows,
    })
    const readiness = evaluateReadinessForB1({
      bands,
      weakTagsCount: weakRows.length,
      weakAbilityTitles: weakAbilityTitlesForReadiness(flatAbilities),
    })
    const confidenceTrend = buildConfidenceTrendSummary(flatAbilities)
    const lesson = MOCK_RECOMMENDED[0]
    const lessonFallback = lesson
      ? { title: lesson.title, href: peopleDailySchemaPlayerHref(lesson.id) }
      : null
    const postA2Eligible =
      activeStudyLevel === 'A2' && isA2PathCompleteMerged(completedLessonIds, MOCK_LESSON_PROGRESS)
    const pathwayChoice = readPostA2PathwayState(profile).choice
    const nextBest = buildNextBestAction({
      practice,
      lessonFallback,
      postA2PathwayFocus: postA2Eligible ? pathwayChoice : undefined,
    })

    const todayKey = localDateKey()
    let retentionStreakCaption =
      'Daily reps add up — one short session today starts your streak.'
    if (profile) {
      if (streak > 0 && isStreakAtRisk(profile.streak, todayKey)) {
        retentionStreakCaption = 'Practice today to keep your streak — a short session counts.'
      } else if (streak > 0) {
        retentionStreakCaption = `You’ve practiced Dutch ${streak} days in a row`
      }
    }

    return buildHomeDashboardViewModel({
      practice,
      nextBest,
      readiness,
      confidenceTrend,
      masteryFlat: flatAbilities,
      retentionStreak: streak,
      retentionStreakCaption,
      totalXp,
    })
  }, [practice, masteryVm, profile, userId, streak, totalXp, activeStudyLevel, completedLessonIds])
}
