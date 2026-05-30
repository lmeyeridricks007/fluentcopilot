'use client'

import { Card, CardDescription, CardTitle } from '@/components/ui/Card'
import { SPEAKING_TRAINING_SUBTYPE_LABELS } from '@/lib/exam-prep/speaking/speakingTrainingBank'
import { SPEAKING_DIFFICULTY_BAND_COPY_NL } from '@/lib/exam-prep/speaking/speakingProgressionPolicy'
import type { SpeakingTrainingItem } from '@/lib/schemas/exam/speakingTrainingItem.schema'

export function SpeakingPromptCard({
  item,
  progress,
  variant = 'training',
  timerRemainingSec,
  examSectionTitleNl,
}: {
  item: SpeakingTrainingItem
  progress?: { current: number; total: number; topicNl?: string }
  variant?: 'training' | 'simulation'
  /** Shown in simulation mode — calm countdown, no alarm styling. */
  timerRemainingSec?: number | null
  /** DUO 2025 exam section label (simulation). */
  examSectionTitleNl?: string | null
}) {
  const subtype = SPEAKING_TRAINING_SUBTYPE_LABELS[item.subtype]
  const band = SPEAKING_DIFFICULTY_BAND_COPY_NL[item.difficultyBand as 1 | 2 | 3 | 4]

  return (
    <Card variant="outlined" padding="md" className="border-slate-200 bg-surface-elevated shadow-sm">
      {progress ? (
        <div className="mb-3 space-y-2">
          <div className="flex justify-between items-center gap-2 text-caption text-ink-secondary">
            <span className="font-medium text-ink-primary">
              Vraag {progress.current} van {progress.total}
            </span>
            {progress.topicNl && variant === 'training' ? (
              <span className="truncate text-right text-ink-tertiary" title={progress.topicNl}>
                {progress.topicNl}
              </span>
            ) : variant === 'simulation' ? (
              <span className="truncate text-right text-ink-tertiary">A2 spreken</span>
            ) : null}
          </div>
          <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary-600 transition-[width] duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      ) : null}
      {timerRemainingSec != null ? (
        <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/90 px-3 py-2">
          <span className="text-caption font-medium text-ink-secondary">Resterende tijd</span>
          <span className="text-body font-semibold tabular-nums text-ink-primary" aria-live="polite">
            {Math.floor(timerRemainingSec / 60)}:{String(timerRemainingSec % 60).padStart(2, '0')}
          </span>
        </div>
      ) : null}
      {variant === 'simulation' && examSectionTitleNl ? (
        <p className="text-caption font-semibold uppercase tracking-wide text-slate-600 mb-3">{examSectionTitleNl}</p>
      ) : (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-caption font-semibold uppercase tracking-wide text-slate-500">Spreken</span>
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
            {subtype.nl}
          </span>
          <span className="rounded-md bg-violet-50 text-violet-900 border border-violet-200/80 px-2 py-0.5 text-caption">
            {band.short}
          </span>
        </div>
      )}
      <CardTitle className="text-title font-bold text-ink-primary leading-snug">{item.promptDutch}</CardTitle>
      <CardDescription className="mt-3 text-body text-ink-secondary leading-relaxed">{item.instructionNl}</CardDescription>
      <p className="mt-3 text-body-sm text-ink-tertiary border-t border-slate-100 pt-3">
        <span className="font-medium text-ink-secondary">Instructie: </span>
        {variant === 'simulation' ? (
          <>
            Beantwoord in het Nederlands binnen de tijd. Geen hints tijdens deze simulatie — alleen aan het eind krijg je
            feedback.
            {item.expectsReason ? ' Geef een korte reden als de vraag daarom vraagt.' : null}
          </>
        ) : (
          <>
            Beantwoord de vraag in het Nederlands.
            {item.expectsReason ? ' Geef ook een korte reden als dat in de vraag staat.' : null}
          </>
        )}
      </p>
      {variant === 'training' && item.trainingTipsNl ? (
        <div className="mt-3 rounded-lg bg-amber-50/80 border border-amber-200/60 px-3 py-2">
          <p className="text-caption font-semibold text-amber-900">Tip (training)</p>
          <p className="text-body-sm text-amber-950/90 mt-0.5 leading-snug">{item.trainingTipsNl}</p>
        </div>
      ) : null}
    </Card>
  )
}
