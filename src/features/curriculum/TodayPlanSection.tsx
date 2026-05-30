'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { CalendarCheck, ChevronRight, BookOpen } from 'lucide-react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { MOCK_LESSONS } from '@/mocks/lessons'
import { MOCK_LESSON_PROGRESS } from '@/mocks/lessonProgress'
import { useStudyContextStore } from '@/store/studyContextStore'
import { curriculumMockService } from '@/services/curriculumMockService'
import { peopleDailySchemaPlayerHref } from '@/demo-data/curriculum/schemaPeopleDailyPath'
import { useRetentionProfile } from '@/features/retention/useRetentionProfile'
import { mergeRetentionCompletionsIntoLessonProgress } from '@/lib/retention/unlocks'

export function TodayPlanSection() {
  const router = useRouter()
  const activeStudyLevel = useStudyContextStore((s) => s.activeStudyLevel)
  const dailyLessonTarget = useStudyContextStore((s) => s.dailyLessonTarget)
  const { completedLessonIds } = useRetentionProfile()
  const mergedProgress = useMemo(
    () => mergeRetentionCompletionsIntoLessonProgress(MOCK_LESSON_PROGRESS, completedLessonIds),
    [completedLessonIds]
  )
  const progressSig = useMemo(
    () => mergedProgress.map((p) => `${p.lessonId}:${p.status}`).sort().join('|'),
    [mergedProgress]
  )

  const { data: path } = useQuery({
    queryKey: ['curriculum', 'path', activeStudyLevel, MOCK_LESSONS.length, progressSig],
    queryFn: () =>
      curriculumMockService.getPath(MOCK_LESSONS, [...mergedProgress], activeStudyLevel),
  })

  const {
    data: today,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['curriculum', 'today', path?.pathPercentComplete, dailyLessonTarget, path?.nextLesson?.lessonId],
    queryFn: () => {
      if (!path) throw new Error('no path')
      return curriculumMockService.getToday(path, MOCK_LESSONS, dailyLessonTarget)
    },
    enabled: !!path,
  })

  if (isLoading || !path) {
    return (
      <Card variant="outlined" padding="md" className="animate-pulse">
        <div className="h-4 bg-surface-muted rounded w-1/3 mb-2" />
        <div className="h-10 bg-surface-muted rounded" />
      </Card>
    )
  }

  if (isError) {
    return (
      <Card variant="outlined" padding="md">
        <CardTitle>Today’s plan</CardTitle>
        <p className="text-body-sm text-error mt-2">Could not load today’s plan.</p>
        <Button variant="secondary" size="sm" className="mt-3" onClick={() => refetch()}>
          Retry
        </Button>
      </Card>
    )
  }

  if (!today || today.items.length === 0) {
    return (
      <Card variant="outlined" padding="md">
        <div className="flex items-center gap-2 mb-2">
          <CalendarCheck className="w-5 h-5 text-primary-600" aria-hidden />
          <CardTitle className="text-body-lg">Today’s plan</CardTitle>
        </div>
        <EmptyState
          icon={<BookOpen className="w-8 h-8" aria-hidden />}
          title="You’re caught up"
          description="Great work! Open your path for more lessons or browse all."
          action={
            <Button size="sm" onClick={() => router.push('/app/learn')}>
              Go to Learn
            </Button>
          }
        />
      </Card>
    )
  }

  return (
    <section aria-labelledby="today-plan-heading">
      <div className="flex items-center justify-between mb-3">
        <h2 id="today-plan-heading" className="text-body-lg font-semibold text-ink-primary flex items-center gap-2">
          <CalendarCheck className="w-5 h-5 text-primary-600" aria-hidden />
          Today’s plan
        </h2>
        <span className="text-caption text-ink-tertiary">{today.planDate}</span>
      </div>
      <div className="space-y-2">
        {today.items.map((item) => (
          <Card
            key={`${item.lessonId}-${item.role}`}
            variant="outlined"
            padding="sm"
            className="flex items-center gap-3 cursor-pointer hover:bg-surface-muted transition-colors"
            onClick={() => router.push(peopleDailySchemaPlayerHref(item.lessonId))}
          >
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-primary-600" aria-hidden />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-ink-primary truncate">{item.title}</p>
              <p className="text-caption text-ink-secondary">
                {item.level} · {item.durationMinutes} min ·{' '}
                {item.role === 'continue' ? 'Continue' : 'Next up'}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-ink-tertiary shrink-0" aria-hidden />
          </Card>
        ))}
      </div>
      <p className="text-caption text-ink-tertiary mt-2 text-center">
        Target: {dailyLessonTarget} lesson{dailyLessonTarget > 1 ? 's' : ''}/day · Change in{' '}
        <button
          type="button"
          className="text-primary-600 font-medium hover:underline"
          onClick={() => router.push('/app/settings/profile')}
        >
          Profile
        </button>
      </p>
    </section>
  )
}
