'use client'

import type { LearnerFacingMetric } from './evaluationHumanCopy'

function bandBadge(band: LearnerFacingMetric['band']): { label: string; className: string } {
  const map: Record<LearnerFacingMetric['band'], { label: string; className: string }> = {
    exceptional: { label: 'Great', className: 'bg-emerald-100 text-emerald-900 border-emerald-200' },
    strong: { label: 'Good', className: 'bg-teal-100 text-teal-900 border-teal-200' },
    solid: { label: 'Getting there', className: 'bg-amber-100 text-amber-900 border-amber-200' },
    developing: { label: 'Keep practising', className: 'bg-orange-100 text-orange-900 border-orange-200' },
    foundational: { label: 'Focus here', className: 'bg-rose-100 text-rose-900 border-rose-200' },
  }
  return map[band]
}

export type LearnerFacingMetricStripProps = {
  metrics: LearnerFacingMetric[]
  /** Hide the small numeric hint (e.g. compact card header). */
  hideScores?: boolean
}

/**
 * Human-first score strip: titles learners care about, prose per dimension, numbers de-emphasized.
 */
export function LearnerFacingMetricStrip({ metrics, hideScores }: LearnerFacingMetricStripProps) {
  return (
    <div className="space-y-2.5">
      {metrics.map((m) => {
        const badge = bandBadge(m.band)
        return (
          <div
            key={m.id}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 shadow-inner shadow-slate-200/50"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11px] font-semibold text-ink-primary leading-snug min-w-0 flex-1">{m.title}</p>
              <span
                className={`shrink-0 text-[9px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 border ${badge.className}`}
              >
                {badge.label}
              </span>
            </div>
            <p className="text-[12px] text-ink-secondary leading-relaxed mt-1.5">{m.body}</p>
            {!hideScores ? (
              <p className="text-[10px] text-ink-tertiary mt-1 tabular-nums">{m.score} / 100</p>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
