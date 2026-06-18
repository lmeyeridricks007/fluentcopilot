'use client'

import { useQuery } from '@tanstack/react-query'
import { Target } from 'lucide-react'
import { Card, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { ErrorState } from '@/components/ui/ErrorState'
import { curriculumMockService } from '@/services/curriculumMockService'
import { useRouter } from 'next/navigation'

export function WeakAreasCard() {
  const router = useRouter()
  const { data: tags, isLoading, isError, refetch } = useQuery({
    queryKey: ['curriculum', 'weak-areas'],
    queryFn: () => curriculumMockService.getWeakAreas(),
  })

  if (isLoading) {
    return (
      <Card variant="outlined" padding="md">
        <CardTitle>Practice weak areas</CardTitle>
        <div className="py-6">
          <LoadingScreen />
        </div>
      </Card>
    )
  }

  if (isError || !tags) {
    return (
      <Card variant="outlined" padding="md">
        <CardTitle>Practice weak areas</CardTitle>
        <ErrorState title="Could not load" message="Try again later." onRetry={() => refetch()} />
      </Card>
    )
  }

  if (tags.length === 0) {
    return (
      <Card variant="outlined" padding="md">
        <div className="flex items-center gap-2 mb-2">
          <Target className="w-5 h-5 text-primary-600" aria-hidden />
          <CardTitle className="text-body">Practice weak areas</CardTitle>
        </div>
        <CardDescription>
          Complete quizzes with tagged exercises to see topics here (demo shows sample tags when API is wired).
        </CardDescription>
      </Card>
    )
  }

  return (
    <Card variant="outlined" padding="md">
      <div className="flex items-center gap-2 mb-3">
        <Target className="w-5 h-5 text-primary-600" aria-hidden />
        <CardTitle className="text-body">Practice weak areas</CardTitle>
      </div>
      <ul className="space-y-2">
        {tags.map((t) => (
          <li
            key={t.tag}
            className="flex items-center justify-between gap-2 py-2 border-b border-slate-100 last:border-0"
          >
            <div>
              <p className="font-medium text-ink-primary capitalize">{t.tag.replace(/_/g, ' ')}</p>
              <p className="text-caption text-ink-secondary">
                {t.wrongCount} missed · {t.rightCount} correct
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => router.push('/app/revision')}>
              Practice
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  )
}
