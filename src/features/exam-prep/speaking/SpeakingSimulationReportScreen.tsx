'use client'

import Link from 'next/link'
import { Card, CardDescription, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import type { SpeakingSimulationSummaryUi } from '@/lib/exam-prep/speaking/speakingSimulationResultAggregator'
import { SPEAKING_CATEGORY_LABELS } from '@/lib/exam-scoring/speakingScoringPolicy'
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
        Op basis van je gemiddelde score over deze simulatie — scenario’s, drills en lessen die aansluiten op je zwakke punten.
      </p>
      <div className="mt-4">
        <ExamPrepNextStepLinks
          actions={actions}
          examType="speaking"
          examMode="simulation"
          legacyAnalyticsClickEvent={ANALYTICS_EVENTS.speaking_exam_next_action_clicked}
          analyticsContext={{ session_id: sessionId, exam_mode: 'simulation', context: 'simulation_report' }}
        />
      </div>
    </Card>
  )
}

export function SpeakingSimulationReportScreen({
  summary,
  onRetrySimulation,
  onBackToIntro,
  practiceExamMode = false,
  retentionReward,
  sessionEndedBySessionTimer = false,
}: {
  summary: SpeakingSimulationSummaryUi
  onRetrySimulation: () => void
  onBackToIntro: () => void
  /** When true, omit default CTAs — parent supplies practice-exam footer. */
  practiceExamMode?: boolean
  retentionReward?: ExamPrepRetentionSummary | null
  /** True when total session time hit zero and remaining answers were auto-submitted. */
  sessionEndedBySessionTimer?: boolean
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
    perQuestion,
    nextBestActions,
  } = summary

  const bestNl = SPEAKING_CATEGORY_LABELS[bestCategoryKey as keyof typeof SPEAKING_CATEGORY_LABELS]?.nl ?? bestCategoryKey
  const weakNl = SPEAKING_CATEGORY_LABELS[weakestCategoryKey as keyof typeof SPEAKING_CATEGORY_LABELS]?.nl ?? weakestCategoryKey

  return (
    <div className="space-y-5">
      {sessionEndedBySessionTimer ? (
        <Card variant="outlined" padding="md" className="border-amber-300/80 bg-amber-50/50">
          <p className="text-body-sm font-semibold text-amber-950">De examentijd is afgelopen</p>
          <p className="mt-1 text-body-sm text-amber-900/90 leading-relaxed">
            Openstaande vragen zijn automatisch ingeleverd (eventueel leeg). Het rapport hieronder geldt voor de hele sessie.
          </p>
        </Card>
      ) : null}
      <Card variant="outlined" padding="md" className="border-slate-300 bg-slate-50/80">
        <p className="text-caption font-semibold text-slate-700 uppercase tracking-wide">Simulatie afgerond</p>
        <CardTitle className="mt-1 text-title font-bold text-ink-primary leading-snug">{plan.titleNl}</CardTitle>
        <CardDescription className="mt-2 text-body text-ink-secondary leading-relaxed">
          {plan.questionCount} vragen · gemiddeld {averageNormalizedPercent}% · {passesCount}/{plan.questionCount} op vraagniveau
          voldoende
          {timedOutCount > 0 ? ` · ${timedOutCount}× tijdslimiet` : null}
        </CardDescription>
      </Card>

      <ExamPrepRewardBanner reward={retentionReward ?? null} />

      <Card variant="outlined" padding="md" className="border-slate-400/80 bg-white">
        <p className="text-caption font-semibold text-slate-600 uppercase tracking-wide">Examenlezing (simulatie)</p>
        <div className="mt-2 flex flex-wrap items-baseline gap-2">
          <span className="text-body font-semibold text-ink-primary">{simulationReadiness.headlineNl}</span>
        </div>
        <p className="mt-2 text-body-sm text-ink-secondary leading-relaxed">{simulationReadiness.detailNl}</p>
      </Card>

      {!practiceExamMode ? <ExamReadinessCard surface="speaking_simulation_report" focusModule="speaking" /> : null}

      <Card variant="outlined" padding="md" className="border-slate-200 bg-surface-elevated">
        <CardTitle className="text-body font-semibold text-ink-primary">Sterktes en aandachtspunten</CardTitle>
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
        <CardTitle className="text-body font-semibold text-ink-primary">Rubrieken (gemiddeld over de simulatie)</CardTitle>
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
              <span className="font-medium text-ink-primary">{idx + 1}. </span>
              <span>{row.promptShortNl}</span>
              <span className="block text-caption text-ink-tertiary mt-0.5">
                {row.normalizedPercent}% · band {row.difficultyBand} · {row.pass ? 'voldoende' : 'nog oefenen'}
                {row.timedOut ? ' · tijd afgelopen' : null}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {!practiceExamMode ? (
        <p className="text-caption text-ink-tertiary px-0.5 leading-snug">
          Wat nu trainen vóór je volgende simulatie: kijk naar je zwakste rubriek en je timeouts — herhaal daarna deze simulatie.
        </p>
      ) : null}

      {!practiceExamMode ? <SimulationNextBestActions actions={nextBestActions} sessionId={plan.sessionId} /> : null}

      {!practiceExamMode ? (
        <div className="flex flex-col gap-2 pt-1">
          <Button type="button" className="w-full min-h-touch" onClick={onRetrySimulation}>
            Nieuwe simulatie
          </Button>
          <Link
            href="/app/exam-prep/speaking/training"
            className="inline-flex w-full min-h-touch items-center justify-center rounded-lg border border-slate-300 bg-white text-body font-semibold text-ink-primary hover:bg-slate-50"
            onClick={() =>
              track(ANALYTICS_EVENTS.speaking_exam_simulation_next_training_clicked, {
                session_id: plan.sessionId,
                exam_mode: 'simulation',
              })
            }
          >
            Naar training (met uitleg)
          </Link>
          <Button type="button" variant="secondary" className="w-full min-h-touch" onClick={onBackToIntro}>
            Terug naar uitleg simulatie
          </Button>
          <Link
            href="/app/exam-prep/speaking"
            className="inline-flex w-full min-h-touch items-center justify-center rounded-lg font-medium bg-surface-muted text-ink-primary hover:bg-slate-200 px-4 py-2.5 text-body-sm"
          >
            Spreken — examen (hub)
          </Link>
        </div>
      ) : null}
    </div>
  )
}
