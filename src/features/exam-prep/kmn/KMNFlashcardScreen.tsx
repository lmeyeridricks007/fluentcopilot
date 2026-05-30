'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { ReviewSessionView } from '@/features/review/ReviewSessionView'
import { useKmnFlashReviewSession } from '@/features/exam-prep/kmn/useKmnFlashReviewSession'
import { isKmnTopicId } from '@/lib/exam-prep/kmn/kmnContentBuilder'
import type { KmnTopicId } from '@/lib/exam-prep/kmn/types'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'

export function KMNFlashcardScreen({ topicId }: { topicId: string }) {
  const router = useRouter()
  const valid = isKmnTopicId(topicId)
  const tid = topicId as KmnTopicId
  const { loading, current, feedback, index, total, done, reload, telemetry, submitCard } = useKmnFlashReviewSession(tid)

  if (!valid) {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto">
        <Link href="/app/exam-prep/kmn" className="text-primary-600 text-body-sm">
          Terug
        </Link>
      </div>
    )
  }

  if (done && total > 0) {
    return (
      <div className="px-4 py-8 pb-28 max-w-lg mx-auto space-y-4">
        <Link
          href={`/app/exam-prep/kmn/${tid}`}
          className="inline-flex items-center gap-1 text-body-sm font-medium text-primary-600 min-h-touch"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Terug naar onderwerp
        </Link>
        <Card variant="outlined" className="border-violet-200 bg-violet-50/40 p-4">
          <CardTitle className="text-body font-bold">Ronde klaar</CardTitle>
          <p className="mt-2 text-body-sm text-ink-secondary">
            Kaarten staan in uw review-wachtrij (SRS). Open later “Review” in de app om ze opnieuw te zien wanneer ze
            weer due zijn.
          </p>
          <Button type="button" className="mt-4 w-full min-h-touch" onClick={() => void reload()}>
            Nog een ronde
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <ReviewSessionView
      title="KMN — flashcards"
      subtitle={`Thema: ${tid} · Spaced repetition`}
      onBack={() => router.push(`/app/exam-prep/kmn/${tid}`)}
      loading={loading}
      seeding={false}
      index={index}
      current={current}
      feedback={feedback}
      total={total}
      loadDemo={() => {}}
      telemetry={telemetry}
      submitCard={submitCard}
    />
  )
}
