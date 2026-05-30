import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { MOCK_LESSONS } from '@/mocks/lessons'
import { getA2LessonRecordById } from '@/demo-data/curriculum/a2Catalog'

export function FlashcardsPage() {
  const params = useParams()
  const router = useRouter()
  const lessonId = typeof params.lessonId === 'string' ? params.lessonId : params.lessonId?.[0] ?? ''
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [, setKnown] = useState<Set<string>>(new Set())

  useEffect(() => {
    setIndex(0)
    setFlipped(false)
  }, [lessonId])

  const lesson = MOCK_LESSONS.find((l) => l.id === lessonId)
  const record = lessonId ? getA2LessonRecordById(lessonId) : undefined

  const cards = useMemo(() => {
    if (!record) return []
    return record.pedagogy.target_vocabulary_lemmas.map((w, i) => ({
      id: `v-${i}`,
      front: w,
      back: 'Target lemma — use it in a phrase from this lesson’s guided steps.',
    }))
  }, [record])

  useEffect(() => {
    if (cards.length === 0) return
    setIndex((i) => Math.min(i, cards.length - 1))
  }, [cards.length])

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

  if (!record || cards.length === 0) {
    return (
      <div className="p-4 space-y-4">
        <p className="text-ink-secondary">
          No flashcard vocabulary for this lesson in the A2 catalog. Regenerate the bundle with{' '}
          <code className="text-body-sm bg-slate-100 px-1 rounded">python3 scripts/generate_a2_nl_curriculum.py</code>
          .
        </p>
        <Button variant="ghost" onClick={() => router.push(`/app/learn/${lessonId}`)}>
          Back to lesson
        </Button>
      </div>
    )
  }

  const safeIndex = Math.min(index, cards.length - 1)
  const current = cards[safeIndex]
  const isLast = safeIndex === cards.length - 1

  return (
    <div className="px-4 py-6 space-y-6">
      <h1 className="text-title font-bold text-ink-primary">Flashcards</h1>
      <ProgressBar value={safeIndex + 1} max={cards.length} showLabel />

      <div
        className="min-h-[200px] perspective-1000"
        onClick={() => setFlipped((f) => !f)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setFlipped((f) => !f)}
        aria-label={flipped ? `Back: ${current.back}` : `Front: ${current.front}`}
      >
        <Card
          variant="elevated"
          className="flex flex-col items-center justify-center min-h-[200px] cursor-pointer hover:bg-surface-muted transition-colors touch-manipulation"
        >
          <p className="text-body-sm text-ink-tertiary mb-2">{flipped ? 'Hint' : 'Dutch'}</p>
          <p className="text-title font-bold text-ink-primary text-center">
            {flipped ? current.back : current.front}
          </p>
          <p className="text-caption text-ink-tertiary mt-4">Tap to flip</p>
        </Card>
      </div>

      <div className="flex gap-2">
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => setKnown((k) => new Set(k).add(current.id))}
        >
          I knew it
        </Button>
        <Button variant="ghost" className="flex-1">
          Review again
        </Button>
      </div>

      <div className="flex justify-between items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setIndex((i) => Math.max(0, i - 1))
            setFlipped(false)
          }}
          disabled={safeIndex === 0}
          aria-label="Previous card"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <span className="text-body-sm text-ink-secondary">
          {safeIndex + 1} / {cards.length}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (isLast) router.push(`/app/learn/${lessonId}`)
            else {
              setIndex((i) => i + 1)
              setFlipped(false)
            }
          }}
          aria-label={isLast ? 'Finish' : 'Next card'}
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {isLast && (
        <Button fullWidth onClick={() => router.push(`/app/learn/${lessonId}`)}>
          Done
        </Button>
      )}
    </div>
  )
}
