'use client'

import { ReviewSessionView } from '@/features/review/ReviewSessionView'
import { ReviewCompletionScreen } from '@/features/review/ReviewCompletionScreen'
import { useReviewSession } from '@/features/review/useReviewSession'

export function DailyReviewScreen({ onBack }: { onBack?: () => void }) {
  const s = useReviewSession({ mode: 'daily' })

  if (!s.loading && s.done && s.total > 0) {
    return (
      <ReviewCompletionScreen
        correct={s.correctCount}
        wrong={s.wrongCount}
        sessionMeta={s.sessionMeta}
        onAgain={() => void s.reload()}
        onBack={onBack}
      />
    )
  }

  return (
    <ReviewSessionView
      title="Daily review"
      subtitle="Quick reinforcement"
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
  )
}
