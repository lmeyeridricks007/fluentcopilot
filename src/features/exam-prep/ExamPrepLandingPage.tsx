'use client'

import { useEffect } from 'react'
import { ExamPrepHero } from '@/features/exam-prep/components/ExamPrepHero'
import { ExamPrepCompareStrip } from '@/features/exam-prep/components/ExamPrepCompareStrip'
import { ExamReadinessSummary } from '@/features/exam-prep/components/ExamReadinessSummary'
import { ExamPrepStartHero } from '@/features/exam-prep/components/ExamPrepStartHero'
import { ExamPrepSectionHeader } from '@/features/exam-prep/components/ExamPrepSectionHeader'
import { GatedExamTypeCard } from '@/features/exam-prep/components/GatedExamTypeCard'
import { Card, CardDescription, CardTitle } from '@/components/ui/Card'
import { useProductEntitlements } from '@/features/entitlements/useProductEntitlements'
import { EXAM_PREP_TYPES } from '@/features/exam-prep/examPrepCatalog'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { OnboardingEntryHandoff } from '@/features/onboarding/OnboardingEntryHandoff'
import { ResumeContinueCard } from '@/features/resume/ResumeContinueCard'
import { useRetentionProfile } from '@/features/retention/useRetentionProfile'

export function ExamPrepLandingPage() {
  const { isPremiumPlan } = useProductEntitlements()
  const { completedLessonIds } = useRetentionProfile()

  useEffect(() => {
    track(ANALYTICS_EVENTS.exam_prep_landing_viewed, {})
  }, [])

  return (
    <div className="px-4 py-6 pb-28 space-y-7 max-w-lg mx-auto w-full">
      <OnboardingEntryHandoff expectedRoute="/app/exam-prep" />
      {!isPremiumPlan ? (
        <Card variant="flat" padding="sm" className="border border-amber-200/90 bg-amber-50/40">
          <CardTitle className="text-body-sm font-semibold text-ink-primary">Basic plan — preview</CardTitle>
          <CardDescription className="text-body-sm mt-1 leading-relaxed">
            Browse what exam prep covers. Opening a skill area needs Premium (full training, simulations, and practice
            exams). Talk, Library, and Coach stay open on Basic.
          </CardDescription>
        </Card>
      ) : null}
      <ExamPrepHero />
      <ExamPrepStartHero />
      <ExamReadinessSummary />
      <section aria-label="Exam skill areas" className="space-y-3">
        <ExamPrepSectionHeader
          title="Exam skills"
          subtitle="Open a skill hub for training, simulation, and practice exams (A2 / inburgering-style)."
        />
        <ul className="space-y-3 list-none p-0 m-0">
          {EXAM_PREP_TYPES.map((t) => (
            <li key={t.id}>
              <GatedExamTypeCard type={t} href={`/app/exam-prep/${t.id}`} />
            </li>
          ))}
        </ul>
      </section>
      <ExamPrepCompareStrip />
      <ResumeContinueCard surface="exam_prep" completedLessonIds={completedLessonIds} />
    </div>
  )
}
