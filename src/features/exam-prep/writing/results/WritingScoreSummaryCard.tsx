'use client'

import { Card, CardDescription, CardTitle } from '@/components/ui/Card'
import type { ExamScoringEngineOutput } from '@/lib/exam-scoring/types'
import type { WritingTrainingFeedbackUi } from '@/lib/exam-prep/writing/types'

const READINESS_NL: Record<ExamScoringEngineOutput['readinessLabel'], string> = {
  needs_work: 'Nog opbouwen',
  improving: 'Groei zichtbaar',
  nearly_ready: 'Bijna examenklaar',
  strong: 'Sterk voor A2',
}

export function WritingScoreSummaryCard({ ui, engine }: { ui: WritingTrainingFeedbackUi; engine: ExamScoringEngineOutput }) {
  return (
    <Card variant="outlined" padding="md" className="border-primary-200/60 bg-primary-50/40">
      <p className="text-caption font-semibold text-primary-900 uppercase tracking-wide">Examen — schrijven (training)</p>
      <CardTitle className="mt-1 text-title font-bold text-ink-primary leading-snug">{ui.headline}</CardTitle>
      <CardDescription className="mt-2 text-body text-ink-secondary leading-relaxed">{ui.subline}</CardDescription>
      <div className="mt-4 flex flex-wrap gap-2 text-body-sm">
        <span className="rounded-md bg-white/90 border border-slate-200 px-2.5 py-1 font-semibold text-ink-primary">
          {ui.tenPointScale.toFixed(1)}/10
        </span>
        <span className="rounded-md bg-white/90 border border-slate-200 px-2.5 py-1 text-ink-secondary">
          {Math.round(ui.normalizedPercent)}% · {READINESS_NL[ui.readinessLabel]}
        </span>
        <span className="rounded-md bg-white/90 border border-slate-200 px-2.5 py-1 text-ink-secondary text-caption">
          Totaal {engine.totalScore}/{engine.maxScore} rubriek
        </span>
        {engine.certainty != null ? (
          <span className="rounded-md bg-white/90 border border-slate-200 px-2.5 py-1 text-ink-tertiary text-caption">
            Zekerheid: {Math.round(engine.certainty * 100)}%
          </span>
        ) : null}
      </div>
    </Card>
  )
}
