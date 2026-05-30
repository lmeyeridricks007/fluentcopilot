'use client'

import { useParams, useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { MOCK_LESSONS } from '@/mocks/lessons'
import { getA2LessonRecordById } from '@/demo-data/curriculum/a2Catalog'
import { PlainDutchStepListen } from './PlainDutchStepListen'

export function QuizPage() {
  const params = useParams()
  const router = useRouter()
  const lessonId = typeof params.lessonId === 'string' ? params.lessonId : params.lessonId?.[0] ?? ''

  const lesson = MOCK_LESSONS.find((l) => l.id === lessonId)
  const record = lessonId ? getA2LessonRecordById(lessonId) : undefined

  if (!lesson) {
    return (
      <div className="p-4">
        <p className="text-ink-secondary">Lesson not found.</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.push('/app/learn')}>
          Back to lessons
        </Button>
      </div>
    )
  }

  if (!record) {
    return (
      <div className="p-4 space-y-4">
        <p className="text-ink-secondary">
          No curriculum record for this lesson. Regenerate the bundle with{' '}
          <code className="text-body-sm bg-slate-100 px-1 rounded">python3 scripts/generate_a2_nl_curriculum.py</code>
          .
        </p>
        <Button variant="ghost" onClick={() => router.push('/app/learn')}>
          Back to lessons
        </Button>
      </div>
    )
  }

  const ideas = record.assessment.quiz_ideas
  if (ideas.length === 0) {
    return (
      <div className="p-4 space-y-4">
        <p className="text-ink-secondary">This lesson has no quiz ideas in the catalog yet.</p>
        <Button variant="ghost" onClick={() => router.push(`/app/learn/${lessonId}`)}>
          Back to lesson
        </Button>
      </div>
    )
  }

  const objective = record.pedagogy.objective
  const success = record.assessment.success_criteria

  return (
    <div className="px-4 py-6 space-y-6">
      <h1 className="text-title font-bold text-ink-primary">Quick check</h1>
      <p className="text-body-sm text-ink-secondary">
        Short recap for <span className="font-medium text-ink-primary">{lesson.title}</span>. There are no trick
        questions — it is fine to peek back at the lesson steps.
      </p>

      <Card variant="outlined" padding="md">
        <p className="text-caption font-medium text-ink-tertiary uppercase tracking-wide">You aimed to</p>
        <div className="mt-1">
          <PlainDutchStepListen text={objective} />
        </div>
      </Card>

      <Card variant="outlined" padding="md">
        <p className="text-caption font-medium text-ink-tertiary uppercase tracking-wide">Try these</p>
        <ol className="mt-3 list-decimal list-inside space-y-3 text-body text-ink-primary">
          {ideas.map((idea, i) => (
            <li key={i} className="leading-relaxed pl-1">
              <PlainDutchStepListen text={idea} />
            </li>
          ))}
        </ol>
      </Card>

      <Card variant="outlined" padding="md">
        <p className="text-caption font-medium text-ink-tertiary uppercase tracking-wide">You are doing well if…</p>
        <div className="mt-1">
          <PlainDutchStepListen text={success} />
        </div>
      </Card>

      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={() => router.push(`/app/learn/${lessonId}`)}>
          Back to lesson
        </Button>
        <Button className="flex-1" onClick={() => router.push('/app/learn')}>
          Done
        </Button>
      </div>
    </div>
  )
}
