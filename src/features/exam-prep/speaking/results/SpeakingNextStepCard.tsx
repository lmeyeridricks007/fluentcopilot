'use client'

import { Card, CardTitle } from '@/components/ui/Card'
import { ANALYTICS_EVENTS } from '@/lib/analytics'
import type { NextBestAction } from '@/lib/schemas/exam/feedbackBlock.schema'
import { ExamPrepNextStepLinks } from '@/features/exam-prep/components/ExamPrepNextStepLinks'

export function SpeakingNextStepCard({
  nextStepNl,
  actions,
  questionId,
}: {
  nextStepNl: string
  actions: NextBestAction[]
  questionId: string
}) {
  return (
    <Card variant="outlined" padding="md" className="border-slate-200 bg-surface-elevated">
      <CardTitle className="text-body font-semibold text-ink-primary">Aanbevolen volgende stap</CardTitle>
      <p className="mt-2 text-body-sm text-ink-secondary leading-relaxed">{nextStepNl}</p>
      {actions.length > 0 ? (
        <div className="mt-4">
          <ExamPrepNextStepLinks
            actions={actions}
            examType="speaking"
            examMode="training"
            legacyAnalyticsClickEvent={ANALYTICS_EVENTS.speaking_exam_next_action_clicked}
            analyticsContext={{ question_id: questionId, exam_mode: 'training', context: 'question_feedback' }}
          />
        </div>
      ) : null}
      <p className="mt-3 text-caption text-ink-tertiary">
        Meer oefening: Practice → Skill tracks, of opnieuw deze trainingsvraag.
      </p>
    </Card>
  )
}
