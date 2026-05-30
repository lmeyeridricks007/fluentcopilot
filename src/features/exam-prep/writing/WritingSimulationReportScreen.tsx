'use client'

import Link from 'next/link'
import { Card, CardDescription, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import type { WritingSimulationSummaryUi } from '@/lib/exam-prep/writing/writingSimulationResultAggregator'
import { WRITING_CATEGORY_LABELS } from '@/lib/exam-scoring/writingScoringPolicy'
import type { NextBestAction } from '@/lib/schemas/exam/feedbackBlock.schema'
import { ExamPrepNextStepLinks } from '@/features/exam-prep/components/ExamPrepNextStepLinks'
import { ExamReadinessCard } from '@/features/exam-prep/components/ExamReadinessCard'
import { ExamPrepRewardBanner } from '@/features/exam-prep/components/ExamPrepRewardBanner'
import type { ExamPrepRetentionSummary } from '@/lib/exam-rewards/types'

function SimulationNextBestActions({ actions, sessionId }: { actions: NextBestAction[]; sessionId: string }) {
  if (actions.length === 0) return null
  return (
    <Card variant="outlined" padding="md" className="border-slate-200 bg-surface-elevated">
      <CardTitle className="text-body font-semibold text-ink-primary">Aanbevolen vervolg</CardTitle>
      <p className="mt-2 text-body-sm text-ink-secondary leading-relaxed">
        Op basis van uw gemiddelde score — scenario’s, drills en lessen die aansluiten op uw schrijfpunten.
      </p>
      <div className="mt-4">
        <ExamPrepNextStepLinks
          actions={actions}
          examType="writing"
          examMode="simulation"
          legacyAnalyticsClickEvent={ANALYTICS_EVENTS.writing_exam_next_action_clicked}
          analyticsContext={{
            session_id: sessionId,
            exam_mode: 'simulation',
            context: 'writing_simulation_report',
          }}
        />
      </div>
    </Card>
  )
}

export function WritingSimulationReportScreen({
  summary,
  onRetrySimulation,
  onBackToIntro,
  practiceExamMode = false,
  retentionReward,
  sessionEndedByGlobalTimer = false,
}: {
  summary: WritingSimulationSummaryUi
  onRetrySimulation: () => void
  onBackToIntro: () => void
  practiceExamMode?: boolean
  retentionReward?: ExamPrepRetentionSummary | null
  /** True when the pooled examentijd hit zero and remaining tasks were auto-submitted. */
  sessionEndedByGlobalTimer?: boolean
}) {
  const {
    plan,
    averageNormalizedPercent,
    passesCount,
    timedOutCount,
    simulationReadiness,
    categoryAverages,
    bestCategoryKey,
    weakestCategoryKey,
    patternNotesNl,
    strengths,
    weaknesses,
    perTask,
    nextBestActions,
  } = summary

  const bestNl = WRITING_CATEGORY_LABELS[bestCategoryKey as keyof typeof WRITING_CATEGORY_LABELS]?.nl ?? bestCategoryKey
  const weakNl = WRITING_CATEGORY_LABELS[weakestCategoryKey as keyof typeof WRITING_CATEGORY_LABELS]?.nl ?? weakestCategoryKey

  return (
    <div className="space-y-5">
      {sessionEndedByGlobalTimer ? (
        <Card variant="outlined" padding="md" className="border-amber-300/80 bg-amber-50/50">
          <p className="text-body-sm font-semibold text-amber-950">De examentijd is afgelopen</p>
          <p className="mt-1 text-body-sm text-amber-900/90 leading-relaxed">
            Openstaande delen zijn automatisch ingeleverd (eventueel leeg). Het rapport hieronder geeft uw resultaat voor de
            hele sessie.
          </p>
        </Card>
      ) : null}
      <Card variant="outlined" padding="md" className="border-slate-300 bg-slate-50/80">
        <p className="text-caption font-semibold text-slate-700 uppercase tracking-wide">Simulatie afgerond</p>
        <CardTitle className="mt-1 text-title font-bold text-ink-primary leading-snug">{plan.titleNl}</CardTitle>
        <CardDescription className="mt-2 text-body text-ink-secondary leading-relaxed">
          {plan.taskCount} opdrachten · gemiddeld {averageNormalizedPercent}% · {passesCount}/{plan.taskCount} op
          opdrachtniveau voldoende
          {timedOutCount > 0 ? ` · ${timedOutCount}× tijdslimiet` : null}
        </CardDescription>
      </Card>

      <ExamPrepRewardBanner reward={retentionReward ?? null} />

      <Card variant="outlined" padding="md" className="border-slate-400/80 bg-white">
        <p className="text-caption font-semibold text-slate-600 uppercase tracking-wide">Examenlezing</p>
        <p className="mt-2 text-body font-semibold text-ink-primary">{simulationReadiness.headlineNl}</p>
        <p className="mt-2 text-body-sm text-ink-secondary leading-relaxed">{simulationReadiness.detailNl}</p>
      </Card>

      {!practiceExamMode ? <ExamReadinessCard surface="writing_simulation_report" focusModule="writing" /> : null}

      <Card variant="outlined" padding="md" className="border-slate-200 bg-surface-elevated">
        <CardTitle className="text-body font-semibold text-ink-primary">Sterktes en aandacht</CardTitle>
        <ul className="mt-3 space-y-2 text-body-sm text-ink-secondary">
          {strengths.map((s, i) => (
            <li key={`s-${i}`}>
              <span className="font-medium text-ink-primary">+ </span>
              {s}
            </li>
          ))}
          {weaknesses.map((w, i) => (
            <li key={`w-${i}`}>
              <span className="font-medium text-ink-primary">→ </span>
              {w}
            </li>
          ))}
          <li>
            <span className="font-medium text-ink-primary">Rubriek: </span>
            sterk {bestNl} · aandacht {weakNl}
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
        <CardTitle className="text-body font-semibold text-ink-primary">Per opdracht</CardTitle>
        <ul className="mt-3 space-y-2">
          {perTask.map((row, idx) => (
            <li key={row.taskId} className="text-body-sm text-ink-secondary border-b border-slate-100 last:border-0 pb-2 last:pb-0">
              <span className="font-medium text-ink-primary">
                {idx + 1}. {row.partLabelNl}
              </span>
              <span className="block text-ink-secondary mt-0.5">{row.promptShortNl}</span>
              <span className="block text-caption text-ink-tertiary mt-0.5">
                {row.normalizedPercent}% · {row.pass ? 'voldoende' : 'nog oefenen'}
                {row.timedOut ? ' · tijd afgelopen' : null}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {!practiceExamMode ? (
        <p className="text-caption text-ink-tertiary px-0.5 leading-snug">
          Voor uw volgende simulatie: train uw zwakste rubriek en oefen met klok, daarna opnieuw deze volledige sessie.
        </p>
      ) : null}

      {!practiceExamMode ? <SimulationNextBestActions actions={nextBestActions} sessionId={plan.sessionId} /> : null}

      {!practiceExamMode ? (
        <div className="flex flex-col gap-2 pt-1">
          <Button type="button" className="w-full min-h-touch" onClick={onRetrySimulation}>
            Nieuwe simulatie
          </Button>
          <Link
            href="/app/exam-prep/writing/training"
            className="inline-flex w-full min-h-touch items-center justify-center rounded-lg border border-slate-300 bg-white text-body font-semibold text-ink-primary hover:bg-slate-50"
            onClick={() =>
              track(ANALYTICS_EVENTS.writing_exam_simulation_next_training_clicked, {
                session_id: plan.sessionId,
                exam_mode: 'simulation',
              })
            }
          >
            Naar training (met uitleg)
          </Link>
          <Button type="button" variant="secondary" className="w-full min-h-touch" onClick={onBackToIntro}>
            Terug naar uitleg
          </Button>
          <Link
            href="/app/exam-prep/writing"
            className="inline-flex w-full min-h-touch items-center justify-center rounded-lg font-medium bg-surface-muted text-ink-primary hover:bg-slate-200 px-4 py-2.5 text-body-sm"
          >
            Schrijven — examen (hub)
          </Link>
        </div>
      ) : null}
    </div>
  )
}
