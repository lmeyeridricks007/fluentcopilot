'use client'

import Link from 'next/link'
import { AlertCircle, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import type { WeakAreaVm } from '@/features/practice-hub/types'

function trendWord(t: WeakAreaVm['trend']): string | null {
  if (t === 'up') return 'Improving'
  if (t === 'down') return 'Needs reps'
  return null
}

export function WeakAreasSummaryCard({ areas }: { areas: WeakAreaVm[] }) {
  if (areas.length === 0) {
    return (
      <Card variant="outlined" padding="md" className="border-dashed border-slate-200 bg-surface-muted/30">
        <p className="text-body-sm text-ink-secondary text-center leading-snug">
          No focused weak spots flagged yet. Self-checks in lessons unlock targeted nudges here.
        </p>
      <Link
        href="/app/practice"
        className="block text-center text-body-sm font-medium text-primary-600 mt-3 hover:underline"
      >
        Open Practice hub →
      </Link>
      </Card>
    )
  }

  return (
    <Card variant="outlined" padding="md" className="border-slate-200/90">
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" aria-hidden />
        <h3 className="text-body font-semibold text-ink-primary">Top focus areas</h3>
      </div>
      <ul className="space-y-3">
        {areas.map((w) => (
          <li key={w.id}>
            <Link
              href={w.href}
              className="flex items-start gap-2 rounded-lg p-2 -mx-2 hover:bg-surface-muted/80 transition-colors min-h-touch"
            >
              <div className="flex-1 min-w-0">
                <p className="text-body-sm font-medium text-ink-primary leading-snug">{w.headline ?? w.label}</p>
                <p className="text-caption text-ink-secondary mt-0.5 line-clamp-2">{w.whyItMatters}</p>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {w.trend ? (
                    <span className="text-caption text-ink-tertiary">{trendWord(w.trend)}</span>
                  ) : null}
                  <span className="text-caption font-medium text-primary-700">{w.ctaLabel}</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-ink-tertiary shrink-0 mt-0.5" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href="/app/practice"
        className="block text-center text-caption font-semibold text-primary-700 mt-3 hover:underline"
      >
        See full Practice hub →
      </Link>
    </Card>
  )
}
