'use client'

import { Card, CardDescription, CardTitle } from '@/components/ui/Card'
import type { WritingTrainingItem } from '@/lib/schemas/exam/writingTrainingItem.schema'

const SUBTYPE_LABEL: Record<WritingTrainingItem['subtype'], string> = {
  form: 'Formulier',
  message: 'Bericht',
  text_to_audience: 'Tekst voor iedereen',
}

export function WritingPromptCard({
  item,
  variant = 'training',
  progress,
  timerRemainingSec,
  /** True = exam hall: no rubric hints, no task-type chips, no per-task timer row. */
  examSimulationMinimal = false,
}: {
  item: WritingTrainingItem
  variant?: 'training' | 'simulation'
  progress?: { current: number; total: number; partLabelNl: string }
  timerRemainingSec?: number | null
  examSimulationMinimal?: boolean
}) {
  if (examSimulationMinimal && progress) {
    return (
      <Card variant="outlined" padding="md" className="border-slate-300 bg-white shadow-sm">
        <div className="mb-3 space-y-2">
          <p className="text-caption font-semibold uppercase tracking-wide text-slate-600">Schrijfexamen — simulatie</p>
          <div className="flex justify-between items-center gap-2 text-body-sm text-ink-secondary">
            <span className="font-semibold text-ink-primary">
              Deel {progress.current} van {progress.total}
            </span>
          </div>
          <div className="h-1 rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-slate-800 transition-[width] duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
        <CardTitle className="text-body font-bold text-ink-primary leading-snug">{item.titleNl}</CardTitle>
        <CardDescription className="mt-3 text-body text-ink-secondary leading-relaxed whitespace-pre-wrap">
          {item.scenarioNl}
        </CardDescription>
        <p className="mt-4 text-body text-ink-primary leading-relaxed">{item.instructionNl}</p>
      </Card>
    )
  }

  return (
    <Card variant="outlined" padding="md" className="border-slate-200 bg-surface-elevated shadow-sm">
      {progress ? (
        <div className="mb-3 space-y-2">
          <div className="flex justify-between items-center gap-2 text-caption text-ink-secondary">
            <span className="font-medium text-ink-primary">
              Deel {progress.current} van {progress.total} — {progress.partLabelNl}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-slate-700 transition-[width] duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      ) : null}
      {timerRemainingSec != null ? (
        <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/90 px-3 py-2">
          <span className="text-caption font-medium text-ink-secondary">Resterende tijd (deze opdracht)</span>
          <span className="text-body font-semibold tabular-nums text-ink-primary" aria-live="polite">
            {Math.floor(timerRemainingSec / 60)}:{String(timerRemainingSec % 60).padStart(2, '0')}
          </span>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-caption font-semibold uppercase tracking-wide text-slate-500">Schrijven</span>
        <span
          className={
            variant === 'simulation'
              ? 'rounded-md bg-slate-800 text-white border border-slate-700 px-2 py-0.5 text-caption font-semibold'
              : 'rounded-md bg-primary-50 text-primary-800 border border-primary-200/80 px-2 py-0.5 text-caption font-semibold'
          }
        >
          {variant === 'simulation' ? 'Simulatie' : 'Training'}
        </span>
        <span className="rounded-md bg-slate-100 text-ink-secondary border border-slate-200 px-2 py-0.5 text-caption">
          {SUBTYPE_LABEL[item.subtype]}
        </span>
      </div>
      <CardTitle className="text-body font-bold text-ink-primary leading-snug">{item.titleNl}</CardTitle>
      <CardDescription className="mt-3 text-body text-ink-secondary leading-relaxed whitespace-pre-wrap">
        {item.scenarioNl}
      </CardDescription>
      <p className="mt-4 text-body font-medium text-ink-primary">{item.instructionNl}</p>
      <div
        className={
          variant === 'simulation'
            ? 'mt-3 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5'
            : 'mt-3 rounded-lg bg-amber-50/80 border border-amber-200/60 px-3 py-2.5'
        }
      >
        <p className={`text-caption font-semibold ${variant === 'simulation' ? 'text-slate-800' : 'text-amber-900'}`}>
          {variant === 'simulation' ? 'Wat de opdracht vraagt' : 'Wat moet erin (puntenlijst)'}
        </p>
        <ul
          className={`mt-2 list-disc pl-5 space-y-1.5 text-body-sm leading-snug ${
            variant === 'simulation' ? 'text-slate-800' : 'text-amber-950/90'
          }`}
        >
          {item.requirements.map((r) => (
            <li key={r.id}>{r.textNl}</li>
          ))}
        </ul>
      </div>
      {variant === 'training' && item.minWordsHint != null && item.maxWordsHint != null ? (
        <p className="mt-3 text-caption text-ink-tertiary">
          Richtlijn: ongeveer {item.minWordsHint}–{item.maxWordsHint} woorden (geen harde limiet in training).
        </p>
      ) : null}
      {variant === 'simulation' && !examSimulationMinimal ? (
        <p className="mt-3 text-caption text-ink-tertiary leading-snug">
          Geen woordrichtlijn of modelantwoord tijdens de simulatie. Werk de opdracht uit binnen de tijd hierboven.
        </p>
      ) : null}
    </Card>
  )
}
