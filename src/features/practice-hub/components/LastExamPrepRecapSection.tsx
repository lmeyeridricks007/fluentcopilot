'use client'

import { useEffect, useState } from 'react'
import { Card, CardTitle } from '@/components/ui/Card'
import { loadLastExamNextActions, type LastExamNextActionsPayload } from '@/lib/exam-recommendations/examLastRecommendationsStorage'
import { ExamPrepNextStepLinks } from '@/features/exam-prep/components/ExamPrepNextStepLinks'
import { SectionHeader } from './SectionHeader'

export function LastExamPrepRecapSection() {
  const [payload, setPayload] = useState<LastExamNextActionsPayload | null>(null)

  useEffect(() => {
    setPayload(loadLastExamNextActions())
  }, [])

  if (!payload?.actions.length) return null

  return (
    <section aria-label="Exam prep follow-up">
      <SectionHeader
        title="From your last exam prep"
        subtitle="We saved these smart next steps — scenarios, drills, lessons, review"
      />
      <Card variant="outlined" padding="md" className="border-primary-100/80 bg-primary-50/15">
        <CardTitle className="text-body font-semibold text-ink-primary">Continue improving</CardTitle>
        <p className="mt-2 text-body-sm text-ink-secondary leading-relaxed">
          Based on your most recent exam training or simulation in this session.
        </p>
        <div className="mt-4">
          <ExamPrepNextStepLinks
            actions={payload.actions}
            examType={payload.examType}
            examMode={payload.mode}
            enableSideEffects={false}
            analyticsContext={{ surface: 'practice_hub', exam_type: payload.examType }}
          />
        </div>
      </Card>
    </section>
  )
}
