'use client'

import { Card } from '@/components/ui/Card'
import { ReviewSessionView } from '@/features/review/ReviewSessionView'
import { ReviewCompletionScreen } from '@/features/review/ReviewCompletionScreen'
import { useReviewSession } from '@/features/review/useReviewSession'

export function MistakeFixScreen({ onBack }: { onBack?: () => void }) {
  const s = useReviewSession({ mode: 'mistake_fix', targetSize: 10 })

  if (!s.loading && s.done && s.total > 0) {
    return (
      <ReviewCompletionScreen
        correct={s.correctCount}
        wrong={s.wrongCount}
        sessionMeta={s.sessionMeta}
        onAgain={() => void s.reload()}
        onBack={onBack}
        completionContext="mistake_fix"
      />
    )
  }

  return (
    <div className="space-y-4">
      <Card variant="flat" padding="md" className="border border-slate-200/90 max-w-lg mx-auto w-full">
        <p className="text-caption font-semibold text-primary-800">Fix mistakes · 2–3 minutes</p>
        <ol className="mt-2 space-y-2 text-body-sm text-ink-secondary list-decimal pl-4">
          <li>See what you wrote or heard wrong</li>
          <li>Repair it in a short interaction</li>
          <li>Get a clear model and why it matters</li>
          <li>Retry once, then we log the win</li>
        </ol>
      </Card>
      <ReviewSessionView
        title="Fix mistakes"
        subtitle="Fast repair from your real slips — not generic drills."
        onBack={onBack}
        loading={s.loading}
        seeding={s.seeding}
        index={s.index}
        current={s.current}
        feedback={s.feedback}
        total={s.total}
        loadDemo={() => void s.loadDemo()}
        telemetry={s.telemetry}
        submitCard={s.submitCard}
      />
    </div>
  )
}
