'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardDescription, CardTitle } from '@/components/ui/Card'
import { passLikelihoodNl } from '@/lib/exam-readiness/passLikelihoodBuilder'
import { ExamReadinessCard } from '@/features/exam-prep/components/ExamReadinessCard'
import { ExamPrepNextStepLinks } from '@/features/exam-prep/components/ExamPrepNextStepLinks'
import type { NextBestAction } from '@/lib/schemas/exam/feedbackBlock.schema'
import type { PracticeExamModule } from '@/lib/exam-prep/practice-exams/types'
import type { PracticeExamReportHeadline } from '@/lib/exam-prep/practice-exams/practiceExamResultAggregator'
import { compareDeltaNl } from '@/lib/exam-prep/practice-exams/practiceExamResultAggregator'
import type { PracticeExamCompareDelta } from '@/lib/exam-prep/practice-exams/types'
import { countAttemptsForModule, progressForPracticeExamSet } from '@/lib/exam-prep/practice-exams/practiceExamProgressService'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'

function hubPath(module: PracticeExamModule): string {
  if (module === 'kmn') return '/app/exam-prep/kmn'
  return `/app/exam-prep/${module}`
}

function practiceListPath(module: PracticeExamModule): string {
  if (module === 'kmn') return '/app/exam-prep/kmn/practice-exams'
  return `/app/exam-prep/${module}/practice-exams`
}

export function PracticeExamReportFooter({
  module,
  setId,
  setTitleNl,
  headline,
  compareDelta,
  compareDeltaPoints,
  previousPercent,
  bestPercent,
  attemptNumber,
  nextActions,
  onRetakeSameSet,
}: {
  module: PracticeExamModule
  setId: string
  setTitleNl: string
  headline: PracticeExamReportHeadline
  compareDelta: PracticeExamCompareDelta
  compareDeltaPoints: number | null
  previousPercent: number | null
  bestPercent: number | null
  attemptNumber: number
  nextActions: NextBestAction[]
  onRetakeSameSet: () => void
}) {
  const passNl = passLikelihoodNl(headline.passLikelihood)
  const prog = progressForPracticeExamSet(setId)

  return (
    <div className="space-y-4">
      <Card variant="outlined" padding="md" className="border-violet-300/80 bg-violet-50/50">
        <p className="text-caption font-semibold text-violet-900 uppercase tracking-wide">Oefenexamen</p>
        <p className="text-caption text-ink-tertiary mt-0.5">{setTitleNl}</p>
        <CardTitle className="mt-1 text-body font-bold text-ink-primary">{headline.titleNl}</CardTitle>
        <CardDescription className="mt-2 text-body-sm text-ink-secondary leading-relaxed block">
          {headline.subNl}
        </CardDescription>
        <div className="mt-3 rounded-lg border border-violet-200/80 bg-white/90 px-3 py-2">
          <p className="text-body-sm font-semibold text-ink-primary">{passNl.title}</p>
          <p className="text-caption text-ink-secondary mt-1 leading-snug">{passNl.sub}</p>
        </div>
        <p className="mt-3 text-body-sm text-ink-secondary leading-relaxed">
          {compareDeltaNl(compareDelta, compareDeltaPoints)}
        </p>
        {previousPercent != null ? (
          <p className="mt-1 text-caption text-ink-tertiary">
            Vorige score op deze set: {Math.round(previousPercent)}% · nu poging {attemptNumber}
            {bestPercent != null ? ` · beste tot nu toe: ${Math.round(bestPercent)}%` : null}
          </p>
        ) : (
          <p className="mt-1 text-caption text-ink-tertiary">Poging {attemptNumber} op deze vaste set.</p>
        )}
        <Button
          type="button"
          className="mt-4 w-full min-h-touch"
          onClick={() => {
            track(ANALYTICS_EVENTS.practice_exam_retake_started, {
              exam_type: module,
              set_id: setId,
              attempt_number: attemptNumber,
            })
            onRetakeSameSet()
          }}
        >
          Opnieuw deze oefenexamen-set
        </Button>
        <Link
          href={practiceListPath(module)}
          className="mt-2 flex min-h-touch w-full items-center justify-center rounded-lg border border-slate-300 bg-white text-body-sm font-semibold text-ink-primary"
        >
          Andere oefenexamens
        </Link>
        <Link
          href={hubPath(module)}
          className="mt-2 flex min-h-touch w-full items-center justify-center rounded-lg text-body-sm font-medium text-primary-700"
        >
          Terug naar {module === 'kmn' ? 'KNM' : module}
        </Link>
      </Card>

      {nextActions.length > 0 ? (
        <Card variant="outlined" padding="md" className="border-slate-200 bg-surface-elevated">
          <CardTitle className="text-body font-semibold text-ink-primary">Aanbevolen vervolg</CardTitle>
          <p className="mt-2 text-body-sm text-ink-secondary leading-relaxed">
            Op basis van dit oefenexamen — niet officieel, wel praktisch voor uw training.
          </p>
          <div className="mt-4">
            <ExamPrepNextStepLinks
              actions={nextActions}
              examType={module}
              examMode="practice_exam"
              legacyAnalyticsClickEvent={ANALYTICS_EVENTS.exam_recommendation_clicked}
              analyticsContext={{ set_id: setId, context: 'practice_exam_report' }}
            />
          </div>
        </Card>
      ) : null}

      <ExamReadinessCard surface="exam_prep_type_hub" focusModule={module} />

      <p className="text-caption text-ink-tertiary text-center">
        Deze set: {prog.attemptCount} {prog.attemptCount === 1 ? 'poging' : 'pogingen'} · module {module}:{' '}
        {countAttemptsForModule(module)} oefenexamen-pogingen totaal.
      </p>
    </div>
  )
}
