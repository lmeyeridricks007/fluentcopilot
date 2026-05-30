'use client'

import { ReviewSessionView } from '@/features/review/ReviewSessionView'
import { ReviewCompletionScreen } from '@/features/review/ReviewCompletionScreen'
import { useReviewSession } from '@/features/review/useReviewSession'

export function ModuleReviewScreen({
  moduleId,
  onBack,
}: {
  moduleId: string
  onBack?: () => void
}) {
  const s = useReviewSession({ mode: 'module', moduleId })

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
      title="Module review"
      subtitle={`Band items for ${moduleId}`}
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
