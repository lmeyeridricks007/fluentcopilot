'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Card, CardDescription, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { useSpeakingExamSectionReveal } from '@/features/exam-prep/speaking/useSpeakingExamSectionReveal'
import type { SpeakingSessionSummaryUi } from '@/lib/exam-prep/speaking/speakingSessionSummaryBuilder'
import { SPEAKING_CATEGORY_LABELS } from '@/lib/exam-scoring/speakingScoringPolicy'
import type { NextBestAction } from '@/lib/schemas/exam/feedbackBlock.schema'
import { ExamPrepNextStepLinks } from '@/features/exam-prep/components/ExamPrepNextStepLinks'
import { ExamPrepRewardBanner } from '@/features/exam-prep/components/ExamPrepRewardBanner'
import type { ExamPrepRetentionSummary } from '@/lib/exam-rewards/types'

function SessionNextBestActions({
  actions,
  sessionId,
  scenarioGroup,
}: {
  actions: NextBestAction[]
  sessionId: string
  scenarioGroup: string
}) {
  if (actions.length === 0) return null
  return (
    <Card variant="outlined" padding="md" className="border-slate-200 bg-surface-elevated">
      <CardTitle className="text-body font-semibold text-ink-primary">Aanbevolen vervolg</CardTitle>
      <p className="mt-2 text-body-sm text-ink-secondary leading-relaxed">
        Op basis van je gemiddelde score over deze sessie — scenario’s, korte drills en lessen in de app.
      </p>
      <div className="mt-4">
        <ExamPrepNextStepLinks
          actions={actions}
          examType="speaking"
          examMode="training"
          legacyAnalyticsClickEvent={ANALYTICS_EVENTS.speaking_exam_next_action_clicked}
          analyticsContext={{
            session_id: sessionId,
            scenario_group: scenarioGroup,
            exam_mode: 'training',
            context: 'session_summary',
          }}
        />
      </div>
    </Card>
  )
}

export function SpeakingSessionSummaryScreen({
  summary,
  onNewSession,
  retentionReward,
}: {
  summary: SpeakingSessionSummaryUi
  onNewSession: () => void
  retentionReward?: ExamPrepRetentionSummary | null
}) {
  const { plan, averageNormalizedPercent, passesCount, categoryAverages, bestCategoryKey, weakestCategoryKey, patternNotesNl, confidence, perQuestion, nextBestActions } =
    summary

  const getConfProps = useMemo(
    () => () => ({
      session_id: plan.sessionId,
      scenario_group: plan.scenarioGroupId,
      confidence_percent: confidence.percent,
      readiness_band: confidence.readinessSignal.band,
      exam_mode: 'training' as const,
    }),
    [plan.sessionId, plan.scenarioGroupId, confidence.percent, confidence.readinessSignal.band]
  )

  const refConfidence = useSpeakingExamSectionReveal(ANALYTICS_EVENTS.speaking_exam_confidence_viewed, getConfProps, true)

  const bestNl = SPEAKING_CATEGORY_LABELS[bestCategoryKey as keyof typeof SPEAKING_CATEGORY_LABELS]?.nl ?? bestCategoryKey
  const weakNl = SPEAKING_CATEGORY_LABELS[weakestCategoryKey as keyof typeof SPEAKING_CATEGORY_LABELS]?.nl ?? weakestCategoryKey

  return (
    <div className="space-y-5">
      <Card variant="outlined" padding="md" className="border-primary-200/60 bg-primary-50/35">
        <p className="text-caption font-semibold text-primary-900 uppercase tracking-wide">Sessie afgerond</p>
        <CardTitle className="mt-1 text-title font-bold text-ink-primary leading-snug">{plan.topicTitleNl}</CardTitle>
        <CardDescription className="mt-2 text-body text-ink-secondary leading-relaxed">
          {plan.questionCount} vragen · gemiddeld {averageNormalizedPercent}% · {passesCount}/{plan.questionCount} keer voldoende
        </CardDescription>
      </Card>

      <ExamPrepRewardBanner reward={retentionReward ?? null} />

      <div ref={refConfidence}>
        <Card variant="outlined" padding="md" className="border-violet-200/70 bg-violet-50/40">
          <p className="text-caption font-semibold text-violet-900 uppercase tracking-wide">Spreekvertrouwen (sessie)</p>
          <div className="mt-2 flex flex-wrap items-baseline gap-2">
            <span className="text-2xl font-bold text-ink-primary tabular-nums">{confidence.percent}%</span>
            <span className="text-body font-semibold text-ink-secondary">{confidence.headlineNl}</span>
          </div>
          <p className="mt-2 text-body-sm text-ink-secondary leading-relaxed">{confidence.detailNl}</p>
        </Card>
      </div>

      <Card variant="outlined" padding="md" className="border-slate-200 bg-surface-elevated">
        <CardTitle className="text-body font-semibold text-ink-primary">Sterkte en aandacht</CardTitle>
        <ul className="mt-3 space-y-2 text-body-sm text-ink-secondary">
          <li>
            <span className="font-medium text-ink-primary">Best deze sessie: </span>
            {bestNl}
          </li>
          <li>
            <span className="font-medium text-ink-primary">Meeste groei: </span>
            {weakNl}
          </li>
        </ul>
      </Card>

      <Card variant="outlined" padding="md" className="border-slate-200 bg-surface-elevated">
        <CardTitle className="text-body font-semibold text-ink-primary">Patronen</CardTitle>
        <ul className="mt-3 list-disc pl-5 space-y-1.5 text-body-sm text-ink-secondary">
          {patternNotesNl.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </Card>

      <Card variant="outlined" padding="md" className="border-slate-200 bg-surface-elevated">
        <CardTitle className="text-body font-semibold text-ink-primary">Rubrieken (gemiddeld)</CardTitle>
        <div className="mt-3 space-y-2">
          {categoryAverages.map((c) => (
            <div key={c.categoryKey} className="flex items-center justify-between gap-2 text-body-sm">
              <span className="text-ink-secondary truncate">{c.labelNl}</span>
              <span className="font-medium text-ink-primary tabular-nums shrink-0">
                {c.averageScore}/{c.maxScore}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card variant="outlined" padding="md" className="border-slate-200 bg-surface-elevated">
        <CardTitle className="text-body font-semibold text-ink-primary">Per vraag</CardTitle>
        <ul className="mt-3 space-y-2">
          {perQuestion.map((row, idx) => (
            <li key={row.questionId} className="text-body-sm text-ink-secondary border-b border-slate-100 last:border-0 pb-2 last:pb-0">
              <span className="font-medium text-ink-primary">
                {idx + 1}.{' '}
              </span>
              <span>{row.promptShortNl}</span>
              <span className="block text-caption text-ink-tertiary mt-0.5">
                {Math.round(row.normalizedPercent)}% · band {row.difficultyBand} · {row.pass ? 'voldoende' : 'nog oefenen'}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <SessionNextBestActions actions={nextBestActions} sessionId={plan.sessionId} scenarioGroup={plan.scenarioGroupId} />

      <div className="flex flex-col gap-2 pt-1">
        <Button
          type="button"
          className="w-full min-h-touch"
          onClick={() => {
            track(ANALYTICS_EVENTS.speaking_exam_next_step_clicked, {
              step: 'new_session',
              session_id: plan.sessionId,
              scenario_group: plan.scenarioGroupId,
              exam_mode: 'training',
            })
            onNewSession()
          }}
        >
          Nieuwe sessie
        </Button>
        <Link
          href="/app/exam-prep/speaking"
          className="inline-flex w-full min-h-touch items-center justify-center rounded-lg border border-slate-300 bg-white text-body font-semibold text-ink-primary hover:bg-slate-50"
          onClick={() =>
            track(ANALYTICS_EVENTS.speaking_exam_next_step_clicked, {
              step: 'speaking_hub',
              session_id: plan.sessionId,
              scenario_group: plan.scenarioGroupId,
              exam_mode: 'training',
            })
          }
        >
          Terug naar spreken — examen
        </Link>
      </div>
    </div>
  )
}
