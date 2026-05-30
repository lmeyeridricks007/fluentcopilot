'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Route } from 'lucide-react'
import { Card, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { ErrorState } from '@/components/ui/ErrorState'
import { MOCK_LESSONS } from '@/mocks/lessons'
import { MOCK_LESSON_PROGRESS } from '@/mocks/lessonProgress'
import { useStudyContextStore } from '@/store/studyContextStore'
import { curriculumMockService } from '@/services/curriculumMockService'
import { useRouter } from 'next/navigation'
import { useRetentionProfile } from '@/features/retention/useRetentionProfile'
import { mergeRetentionCompletionsIntoLessonProgress } from '@/lib/retention/unlocks'

export function CurriculumProgressSummary() {
  const router = useRouter()
  const activeStudyLevel = useStudyContextStore((s) => s.activeStudyLevel)
  const { completedLessonIds } = useRetentionProfile()
  const mergedProgress = useMemo(
    () => mergeRetentionCompletionsIntoLessonProgress(MOCK_LESSON_PROGRESS, completedLessonIds),
    [completedLessonIds]
  )
  const progressSig = useMemo(
    () => mergedProgress.map((p) => `${p.lessonId}:${p.status}`).sort().join('|'),
    [mergedProgress]
  )

  const { data: path, isLoading, isError, refetch } = useQuery({
    queryKey: ['curriculum', 'path', activeStudyLevel, MOCK_LESSONS.length, progressSig],
    queryFn: () =>
      curriculumMockService.getPath(MOCK_LESSONS, [...mergedProgress], activeStudyLevel),
  })

  if (isLoading) {
    return (
      <Card variant="outlined" padding="md">
        <CardTitle>My path</CardTitle>
        <div className="py-6">
          <LoadingScreen />
        </div>
      </Card>
    )
  }

  if (isError || !path) {
    return (
      <Card variant="outlined" padding="md">
        <CardTitle>My path</CardTitle>
        <ErrorState title="Could not load path" onRetry={() => refetch()} />
      </Card>
    )
  }

  return (
    <Card variant="outlined" padding="md">
      <div className="flex items-center gap-2 mb-2">
        <Route className="w-5 h-5 text-primary-600" aria-hidden />
        <CardTitle className="text-body">My path ({path.cefrLevel})</CardTitle>
      </div>
      <ProgressBar value={path.pathPercentComplete} max={100} className="mt-2" />
      <CardDescription className="mt-2">
        {path.pathPercentComplete}% of this level&apos;s path complete
      </CardDescription>
      <div className="flex gap-2 mt-4">
        <Button size="sm" className="flex-1" onClick={() => router.push('/app/learn')}>
          Open path
        </Button>
        <Button size="sm" variant="secondary" className="flex-1" onClick={() => router.push('/app/revision')}>
          Revision
        </Button>
      </div>
    </Card>
  )
}
