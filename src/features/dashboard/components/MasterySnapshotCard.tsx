'use client'

import Link from 'next/link'
import { ChevronRight, MapPin, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { clsx } from 'clsx'
import { Card } from '@/components/ui/Card'
import type { MasterySnapshotRowVm } from '@/lib/dashboard/dashboardTypes'

function bandPill(band: MasterySnapshotRowVm['band']): string {
  if (band === 'strong') return 'bg-emerald-50 text-emerald-900 border-emerald-200'
  if (band === 'improving') return 'bg-amber-50 text-amber-900 border-amber-200'
  return 'bg-slate-50 text-ink-primary border-slate-200'
}

const ABILITY_MAP_LINK = '/app/progress#mastery-map'

export function MasterySnapshotCard({
  rows,
  variant = 'full',
  maxRows,
}: {
  rows: MasterySnapshotRowVm[]
  /** `preview`: fewer rows, lighter chrome for Improve. */
  variant?: 'full' | 'preview'
  maxRows?: number
}) {
  const preview = variant === 'preview'
  const cap = maxRows ?? (preview ? 3 : undefined)
  const visibleRows = cap != null ? rows.slice(0, cap) : rows

  if (rows.length === 0) {
    return (
      <Card variant="outlined" padding={preview ? 'sm' : 'md'} className="border-dashed">
        <p className="text-body-sm text-ink-secondary text-center">
          Practice a few scenarios — your real-life ability map will populate here.
        </p>
        <Link
          href="/app/practice/scenarios"
          className="block text-center text-body-sm font-semibold text-primary-700 mt-2 hover:underline"
        >
          Explore scenarios
        </Link>
      </Card>
    )
  }

  const list = (
    <ul className={clsx('space-y-2', preview && 'space-y-1')}>
      {visibleRows.map((r) => (
        <li key={r.id}>
          <Link
            href={r.href}
            className={clsx(
              'flex items-center gap-3 rounded-lg px-2 py-2 -mx-2 hover:bg-surface-muted/80 min-h-touch',
              preview && 'py-1.5'
            )}
          >
            <div className="flex-1 min-w-0">
              {!preview ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={clsx(
                      'text-caption font-semibold px-2 py-0.5 rounded-md border',
                      bandPill(r.band)
                    )}
                  >
                    {r.bandLabel}
                  </span>
                  <span className="text-caption text-ink-tertiary inline-flex items-center gap-1">
                    {r.trendArrow === 'up' ? (
                      <TrendingUp className="w-3.5 h-3.5 text-success" aria-hidden />
                    ) : r.trendArrow === 'down' ? (
                      <TrendingDown className="w-3.5 h-3.5 text-warning" aria-hidden />
                    ) : (
                      <Minus className="w-3.5 h-3.5 text-ink-tertiary" aria-hidden />
                    )}
                    {r.trendLabel}
                  </span>
                </div>
              ) : (
                <span
                  className={clsx(
                    'text-[10px] font-semibold px-1.5 py-0.5 rounded border inline-block mb-0.5',
                    bandPill(r.band)
                  )}
                >
                  {r.bandLabel}
                </span>
              )}
              <p
                className={clsx(
                  'font-medium text-ink-primary truncate',
                  preview ? 'text-body-sm mt-0.5' : 'text-body-sm mt-1'
                )}
              >
                {r.title}
              </p>
              {!preview && r.statusWhy ? (
                <p className="text-caption text-ink-secondary mt-0.5 line-clamp-2">{r.statusWhy}</p>
              ) : null}
              {!preview && r.momentumHint ? (
                <p className="text-caption font-medium text-primary-700 mt-1">{r.momentumHint}</p>
              ) : null}
              <p className="text-caption font-semibold text-primary-600 mt-0.5">
                {preview ? 'Practice now' : r.ctaLabel}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-ink-tertiary shrink-0" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  )

  if (preview) {
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-surface-elevated/60 px-3 py-3 sm:px-4">
        {list}
        <Link
          href={ABILITY_MAP_LINK}
          className="mt-3 inline-flex text-body-sm font-semibold text-primary-700 hover:underline"
        >
          See ability map
        </Link>
      </div>
    )
  }

  return (
    <Card variant="outlined" padding="md" className="border-slate-200/90">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4 text-primary-600" aria-hidden />
          </div>
          <div className="min-w-0">
            <h3 className="text-body font-semibold text-ink-primary leading-tight">Practical abilities</h3>
            <p className="text-caption text-ink-secondary">Snapshot — not a test score</p>
          </div>
        </div>
        <Link
          href={ABILITY_MAP_LINK}
          className="text-caption font-semibold text-primary-700 shrink-0 hover:underline"
        >
          See ability map
        </Link>
      </div>
      {list}
    </Card>
  )
}
