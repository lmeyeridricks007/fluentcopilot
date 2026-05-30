'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { MOCK_LESSONS } from '@/mocks/lessons'
import { MOCK_PROGRESS } from '@/mocks/progress'
import { useStudyContextStore } from '@/store/studyContextStore'
import { usePremiumStore } from '@/store/premiumStore'
import { useEntitlement, PaywallModal } from '@/features/entitlements'
import { curriculumMockService } from '@/services/curriculumMockService'
import {
  isCurriculumPathModuleGatingEnabled,
  isCurriculumSequentialUnlockEnabled,
} from '@/config/curriculumFeature'
import { isA2LessonSequentialLocked } from '@/features/curriculum/types'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { ErrorState } from '@/components/ui/ErrorState'
import { Button } from '@/components/ui/Button'
import { buildLearningPathViewModel } from './buildLearningPathViewModel'
import { LearningPathJourney } from './components/LearningPathJourney'
import type { LessonRowModel } from './types'
import { useRetentionProfile } from '@/features/retention/useRetentionProfile'
import { useRetentionDashboardData } from '@/features/retention/useRetentionDashboardData'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'

export function LearningPathScreen() {
  const router = useRouter()
  const activeStudyLevel = useStudyContextStore((s) => s.activeStudyLevel)
  const isPremium = usePremiumStore((s) => s.isPremium)
  const { canStartLesson, atLessonCap, usage } = useEntitlement()
  const [paywallOpen, setPaywallOpen] = useState(false)

  const { streak, totalXp, abilities, completedLessonIds, profile } = useRetentionProfile()

  const mergedLessonProgress = useMemo(() => {
    return completedLessonIds.map((lessonId) => ({
      lessonId,
      status: 'completed' as const,
      updatedAt: 'retention-derived',
    }))
  }, [completedLessonIds])

  const lessonProgressSig = useMemo(
    () => mergedLessonProgress.map((p) => `${p.lessonId}:${p.status}`).sort().join('|'),
    [mergedLessonProgress]
  )

  const dashboardRefreshKey =
    (profile?.completedLessonIds.length ?? 0) +
    (profile?.totalXp ?? 0) +
    (profile?.abilities.length ?? 0)

  const {
    dailyDueCount,
    dailyEstMinutes,
    mistakeSessionCount,
    weakAreaCount,
    hasMistakeEvidence,
  } = useRetentionDashboardData(dashboardRefreshKey)

  const {
    data: path,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['curriculum', 'path', activeStudyLevel, MOCK_LESSONS.length, lessonProgressSig],
    queryFn: () =>
      curriculumMockService.getPath(MOCK_LESSONS, [...mergedLessonProgress], activeStudyLevel),
  })

  const sequentialBandsActive =
    path?.cefrLevel === 'A2' && isCurriculumSequentialUnlockEnabled()

  const progressForVm = useMemo(
    () => ({
      ...MOCK_PROGRESS,
      streak,
      xp: totalXp,
      lessonsCompleted: mergedLessonProgress.filter((p) => p.status === 'completed').length,
    }),
    [streak, totalXp, mergedLessonProgress]
  )

  const lastAbilityLine = abilities[abilities.length - 1]?.headline ?? null

  const weakTagsForPath =
    hasMistakeEvidence && mistakeSessionCount > 0 ? Math.max(weakAreaCount, 1) : weakAreaCount

  const vm = useMemo(() => {
    if (!path) return null
    return buildLearningPathViewModel({
      path,
      progress: progressForVm,
      lessonProgress: mergedLessonProgress,
      sequentialBandsActive,
      pathModuleGatingEnabled: isCurriculumPathModuleGatingEnabled(),
      dueReviewCount: dailyDueCount,
      weakTagsCount: weakTagsForPath,
      retentionYouCanNowLine: lastAbilityLine,
      dailyReviewEstMinutes: dailyEstMinutes,
    })
  }, [
    path,
    sequentialBandsActive,
    dailyDueCount,
    weakTagsForPath,
    progressForVm,
    mergedLessonProgress,
    lastAbilityLine,
    dailyEstMinutes,
  ])

  const openLesson = (lessonId: string, href: string) => {
    if (!path) return
    const pathLesson = path.units.flatMap((u) => u.lessons).find((l) => l.lessonId === lessonId)
    const locked = pathLesson?.isPremium && !isPremium
    if (locked) {
      router.push('/app/premium')
      return
    }
    if (
      sequentialBandsActive &&
      isA2LessonSequentialLocked(lessonId, path.units, mergedLessonProgress)
    ) {
      return
    }
    if (pathLesson?.status === 'not_started' && !canStartLesson && atLessonCap) {
      setPaywallOpen(true)
      return
    }
    router.push(href)
  }

  const handleLessonRow = (row: LessonRowModel) => {
    if (row.isLocked) return
    if (row.isNext) {
      track(ANALYTICS_EVENTS.continue_learning_clicked, {
        lessonId: row.lessonId,
        surface: 'learning_path_node',
      })
    }
    openLesson(row.lessonId, row.href)
  }

  const nextLessonSequentialBlocked =
    Boolean(
      path?.nextLesson &&
        sequentialBandsActive &&
        isA2LessonSequentialLocked(path.nextLesson.lessonId, path.units, mergedLessonProgress)
    )

  if (isLoading) return <LoadingScreen />
  if (isError || !path || !vm)
    return (
      <ErrorState
        title="Could not load your path"
        message={error instanceof Error ? error.message : 'Please try again.'}
        onRetry={() => refetch()}
      />
    )

  if (path.units.length === 0) {
    return (
      <div className="py-10 text-center px-4">
        <p className="text-body-sm text-ink-secondary">No curriculum units match your lessons yet.</p>
        <Button variant="secondary" className="mt-4" onClick={() => router.push('/app/learn/explore')}>
          Explore lessons
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-6">
      <LearningPathJourney
        vm={vm}
        onLessonOpen={handleLessonRow}
        nextLessonSequentialBlocked={nextLessonSequentialBlocked}
      />

      <PaywallModal
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        reason="lesson_cap"
        usage={{ used: usage.lessonsToday, limit: usage.lessonsLimit }}
      />
    </div>
  )
}
