'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle, CardDescription } from '@/components/ui/Card'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { ErrorState } from '@/components/ui/ErrorState'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { curriculumMockService } from '@/services/curriculumMockService'
import { MOCK_LESSON_PROGRESS } from '@/mocks/lessonProgress'

export function RevisionSessionPage() {
  const router = useRouter()
  const completedCount = MOCK_LESSON_PROGRESS.filter((p) => p.status === 'completed').length

  const {
    data: session,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['curriculum', 'revision', 'session'],
    queryFn: () => curriculumMockService.createRevisionSession(completedCount),
    enabled: completedCount >= 1,
  })

  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [resultScore, setResultScore] = useState<number | null>(null)

  const submitMutation = useMutation({
    mutationFn: () => curriculumMockService.submitRevision(session!.sessionId, answers),
    onSuccess: (data) => setResultScore(data.scorePercent),
  })

  if (completedCount < 1) {
    return (
      <div className="px-4 py-6 space-y-4">
        <Button variant="ghost" size="sm" className="-ml-2 mb-2" onClick={() => router.push('/app/progress')}>
          <ArrowLeft className="w-4 h-4 mr-1" aria-hidden />
          Back
        </Button>
        <Card variant="outlined" padding="md">
          <CardTitle>Revision</CardTitle>
          <CardDescription className="mt-2">
            Complete at least one lesson first. Then you can mix exercises from what you&apos;ve learned.
          </CardDescription>
          <Button className="mt-4 w-full" onClick={() => router.push('/app/learn')}>
            Go to Learn
          </Button>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="px-4 py-8">
        <LoadingScreen />
      </div>
    )
  }
  if (isError || !session) {
    return (
      <div className="px-4 py-6">
        <ErrorState title="Could not start revision" onRetry={() => refetch()} />
      </div>
    )
  }

  const exercises = session.exercises

  if (resultScore !== null) {
    return (
      <div className="px-4 py-6 space-y-6">
        <div className="text-center py-6">
          <div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-9 h-9 text-success" aria-hidden />
          </div>
          <h1 className="text-title font-bold text-ink-primary">Revision complete</h1>
          <p className="text-body-lg font-semibold text-primary-700 mt-2">{resultScore}% correct</p>
          <p className="text-body-sm text-ink-secondary mt-2">Nice work reinforcing your Dutch.</p>
        </div>
        <Button fullWidth onClick={() => router.push('/app/progress')}>
          Back to Progress
        </Button>
        <Button variant="secondary" fullWidth onClick={() => router.push('/app/learn')}>
          My path
        </Button>
      </div>
    )
  }

  const current = exercises[index]
  if (!current) {
    return (
      <div className="px-4 py-6">
        <ErrorState title="No exercises in session" onRetry={() => refetch()} />
      </div>
    )
  }

  const selectOption = (exerciseId: string, optionId: string) => {
    setAnswers((a) => ({ ...a, [exerciseId]: optionId }))
  }

  const handlePrimary = () => {
    if (index < exercises.length - 1) {
      setIndex((i) => i + 1)
      return
    }
    submitMutation.mutate()
  }

  const canAdvance = !!answers[current.id]

  return (
    <div className="px-4 py-6 space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.push('/app/progress')} aria-label="Back">
          <ArrowLeft className="w-4 h-4" aria-hidden />
        </Button>
        <h1 className="text-title font-bold text-ink-primary flex-1">Revision</h1>
      </div>
      <ProgressBar value={index + 1} max={exercises.length} className="mb-2" />
      <p className="text-caption text-ink-secondary">
        Question {index + 1} of {exercises.length}
      </p>

      <Card variant="outlined" padding="md">
        <p className="text-body font-medium text-ink-primary">{current.question}</p>
        <ul className="mt-4 space-y-2">
          {current.options.map((opt) => {
            const selected = answers[current.id] === opt.id
            return (
              <li key={opt.id}>
                <button
                  type="button"
                  onClick={() => selectOption(current.id, opt.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg border min-h-touch transition-colors ${
                    selected
                      ? 'border-primary-500 bg-primary-50 text-primary-900'
                      : 'border-slate-200 bg-surface-elevated hover:bg-surface-muted'
                  }`}
                >
                  <span className="font-medium text-ink-secondary mr-2">{opt.id}.</span>
                  {opt.text}
                </button>
              </li>
            )
          })}
        </ul>
      </Card>

      {submitMutation.isError && (
        <p className="text-body-sm text-error">Could not save results. Try again.</p>
      )}

      <Button fullWidth onClick={handlePrimary} disabled={!canAdvance || submitMutation.isPending}>
        {index < exercises.length - 1 ? 'Next' : submitMutation.isPending ? 'Submitting…' : 'Finish'}
      </Button>
    </div>
  )
}
