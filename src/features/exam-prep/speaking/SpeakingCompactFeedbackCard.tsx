'use client'

import { Card, CardDescription, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { SpeakingTrainingEvaluationBundle } from '@/lib/exam-prep/speaking/types'

const READINESS_NL = {
  needs_work: 'Nog opbouwen',
  improving: 'Groei zichtbaar',
  nearly_ready: 'Bijna examenklaar',
  strong: 'Sterk voor A2',
} as const

export function SpeakingCompactFeedbackCard({
  bundle,
  isLastInSession,
  onContinue,
  onRetry,
}: {
  bundle: SpeakingTrainingEvaluationBundle
  isLastInSession: boolean
  onContinue: () => void
  onRetry: () => void
}) {
  const ui = bundle.feedbackUi
  const tip =
    ui.improvements[0] ?? ui.strengths[0] ?? 'Ga door met de volgende vraag — je krijgt aan het eind een volledige samenvatting.'

  return (
    <Card variant="outlined" padding="md" className="border-slate-200 bg-surface-elevated shadow-sm">
      <p className="text-caption font-semibold uppercase tracking-wide text-slate-500">Korte feedback</p>
      <CardTitle className="mt-1 text-title font-bold text-ink-primary leading-snug">{ui.headline}</CardTitle>
      <CardDescription className="mt-2 text-body text-ink-secondary leading-relaxed">{ui.subline}</CardDescription>

      <div className="mt-4 flex flex-wrap gap-2 text-body-sm">
        <span className="rounded-md bg-primary-50 border border-primary-200/70 px-2.5 py-1 font-semibold text-primary-900">
          {Math.round(ui.normalizedPercent)}%
        </span>
        <span className="rounded-md bg-slate-100 border border-slate-200 px-2.5 py-1 text-ink-secondary">
          {READINESS_NL[ui.readinessLabel]}
        </span>
        <span className="rounded-md bg-slate-100 border border-slate-200 px-2.5 py-1 text-ink-secondary text-caption">
          Rubriek {bundle.engine.totalScore}/{bundle.engine.maxScore}
        </span>
      </div>

      <p className="mt-4 text-body-sm text-ink-secondary leading-snug border-t border-slate-100 pt-3">
        <span className="font-medium text-ink-primary">Tip: </span>
        {tip}
      </p>

      <div className="flex flex-col gap-2 mt-5">
        <Button type="button" className="w-full min-h-touch" onClick={onContinue}>
          {isLastInSession ? 'Naar sessiesamenvatting' : 'Volgende vraag'}
        </Button>
        <Button type="button" variant="secondary" className="w-full min-h-touch" onClick={onRetry}>
          Opnieuw deze vraag
        </Button>
      </div>
    </Card>
  )
}
