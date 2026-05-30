'use client'

import { Card, CardTitle } from '@/components/ui/Card'
import type { WritingTrainingFeedbackUi } from '@/lib/exam-prep/writing/types'

/** Compact per-category scan before the full rubric accordion. */
export function WritingCategoryFeedbackList({ ui }: { ui: WritingTrainingFeedbackUi }) {
  return (
    <div className="space-y-2">
      <h2 className="text-body font-semibold text-ink-primary">Snel overzicht per rubriek</h2>
      <p className="text-caption text-ink-tertiary leading-snug">Korte coachregels — tik hieronder open voor details en scores.</p>
      <ul className="space-y-2">
        {ui.categoryRows.map((row) => {
          const pct = row.max > 0 ? Math.round((row.score / row.max) * 100) : 0
          return (
            <li key={row.key}>
              <Card variant="flat" padding="sm" className="border border-slate-200/90 bg-slate-50/60">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-body-sm font-semibold text-ink-primary leading-snug">{row.labelNl}</CardTitle>
                  <span className="text-caption font-semibold text-ink-secondary tabular-nums shrink-0">
                    {row.score}/{row.max}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full rounded-full bg-primary-500/90" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-2 text-body-sm text-ink-secondary leading-snug">{row.learnerFeedbackNl}</p>
              </Card>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
