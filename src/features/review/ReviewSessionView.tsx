'use client'

import { useEffect, useState } from 'react'
import { clsx } from 'clsx'
import { ReviewHeader } from '@/components/review/ReviewHeader'
import { ReviewProgressBar } from '@/components/review/ReviewProgressBar'
import { ReviewFeedbackToast } from '@/components/review/ReviewFeedbackToast'
import { ReviewCard } from '@/components/review/ReviewCard'
import { ReviewListeningPlayBar } from '@/components/review/ReviewListeningPlayBar'
import { ReviewEmptyState } from '@/components/review/ReviewEmptyState'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import type { ReviewSessionCard } from '@/lib/review-engine/types'
import type { ReviewCardPayload } from '@/components/review/ReviewCard'

export function ReviewSessionView({
  title,
  subtitle,
  onBack,
  loading,
  seeding,
  index,
  current,
  feedback,
  total,
  loadDemo,
  telemetry,
  submitCard,
}: {
  title: string
  subtitle?: string
  onBack?: () => void
  loading: boolean
  seeding: boolean
  index: number
  current?: ReviewSessionCard
  feedback: { correct: boolean } | null
  total: number
  loadDemo: () => void
  telemetry: (event: 'card_started' | 'hint_used') => void
  submitCard: (p: ReviewCardPayload) => void | Promise<void>
}) {
  const [listeningHeard, setListeningHeard] = useState(false)

  useEffect(() => {
    setListeningHeard(false)
  }, [current?.instanceId])

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      current?.uiMode === 'listening_mcq' &&
      !!current.listeningTextNl?.trim() &&
      !window.speechSynthesis
    ) {
      setListeningHeard(true)
    }
  }, [current?.instanceId, current?.uiMode, current?.listeningTextNl])

  if (loading) {
    return (
      <div className="px-4 py-10">
        <LoadingScreen />
      </div>
    )
  }

  if (total === 0) {
    return (
      <div className="px-4 py-6 space-y-4">
        <ReviewHeader title={title} subtitle={subtitle} onBack={onBack} />
        <ReviewEmptyState onLoadDemo={() => void loadDemo()} loading={seeding} />
      </div>
    )
  }

  if (!current) {
    return null
  }

  const listenChoicesBlocked =
    current.uiMode === 'listening_mcq' && !!current.listeningTextNl?.trim() && !listeningHeard

  return (
    <div className="px-4 py-4 pb-28 max-w-lg mx-auto space-y-5 min-h-[70vh]">
      <ReviewHeader title={title} subtitle={subtitle} onBack={onBack} />
      <ReviewProgressBar current={index + 1} total={total} />
      <ReviewFeedbackToast
        visible={!!feedback}
        correct={feedback?.correct ?? false}
        message={feedback?.correct ? 'Nice!' : 'Keep going — spacing will help.'}
      />
      <section
        className={clsx(
          'rounded-2xl border border-slate-200 bg-surface-elevated p-4 shadow-sm transition-all duration-300',
          feedback?.correct && 'ring-2 ring-emerald-200/80',
          feedback && !feedback.correct && 'ring-2 ring-rose-200/80'
        )}
      >
        <p className="text-caption text-ink-tertiary mb-2 capitalize">
          {current.itemType === 'kmn' ? 'KMN' : current.itemType}
        </p>
        <h2 className="text-body-lg font-semibold text-ink-primary leading-snug mb-4 whitespace-pre-wrap break-words">
          {current.prompt.trim() || 'Complete this review card.'}
        </h2>
        {current.uiMode === 'listening_mcq' && current.listeningTextNl ? (
          <div className="mb-4">
            <ReviewListeningPlayBar
              key={current.instanceId}
              text={current.listeningTextNl}
              onFirstPlayEnd={() => setListeningHeard(true)}
            />
          </div>
        ) : null}
        {listenChoicesBlocked ? (
          <p className="text-caption text-ink-tertiary mb-2" aria-live="polite">
            Play the audio once to unlock the choices.
          </p>
        ) : null}
        <div key={current.instanceId} className="transition-opacity duration-300">
          <ReviewCard
            card={current}
            listenChoicesBlocked={listenChoicesBlocked}
            onSubmit={(p) => void submitCard(p)}
            telemetry={telemetry}
          />
        </div>
      </section>
    </div>
  )
}
