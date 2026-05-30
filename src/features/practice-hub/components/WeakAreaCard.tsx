'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { TrendingDown, TrendingUp, Minus, Heart, Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { trackWeakAreaShownOnce } from '../weakAreaShownAnalytics'
import type { WeakAreaVm } from '../types'

function TrendIcon({ trend }: { trend?: WeakAreaVm['trend'] }) {
  if (trend === 'up') return <TrendingUp className="w-4 h-4 text-success" aria-hidden />
  if (trend === 'down') return <TrendingDown className="w-4 h-4 text-warning" aria-hidden />
  return <Minus className="w-4 h-4 text-ink-tertiary" aria-hidden />
}

export function WeakAreaCard({
  area,
  suppressWeakAreaShown = false,
}: {
  area: WeakAreaVm
  /** When true, skip session-deduped `weak_area_shown` (e.g. Improve drill hosts the impression). */
  suppressWeakAreaShown?: boolean
}) {
  const hasCoach = Boolean(area.actions?.length)

  useEffect(() => {
    if (suppressWeakAreaShown) return
    trackWeakAreaShownOnce({
      weak_area_id: area.id,
      weak_area_label: area.label,
      surface: 'weak_area_card',
      action_count: area.actions?.length ?? (area.href ? 1 : 0),
    })
  }, [suppressWeakAreaShown, area.actions?.length, area.href, area.id, area.label])

  const onPracticeNav = (href: string, actionId?: string) => {
    track(ANALYTICS_EVENTS.weak_area_practice_started, {
      weak_area_id: area.id,
      href,
      action_id: actionId,
    })
  }

  const multiActions = area.actions && area.actions.length > 1

  return (
    <Card variant="outlined" padding="sm" className="border-slate-200/90 bg-surface-elevated relative group">
      {!multiActions ? (
        <Link
          href={area.href}
          onClick={() => onPracticeNav(area.href)}
          className="absolute inset-0 z-0 rounded-[inherit]"
          aria-label={`${area.headline ?? area.label}: ${area.ctaLabel}`}
        />
      ) : null}
      <div className={`flex items-start gap-3 ${!multiActions ? 'relative z-10' : ''}`}>
        <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center shrink-0">
          {hasCoach ? (
            <Sparkles className="w-4 h-4 text-primary-600" aria-hidden />
          ) : (
            <Heart className="w-4 h-4 text-rose-500" aria-hidden />
          )}
        </div>
        <div className="flex-1 min-w-0 pointer-events-none">
          <div className="flex items-center justify-between gap-2">
            <p className="text-body-sm font-semibold text-ink-primary">{area.headline ?? area.label}</p>
            <span className="shrink-0" title="Trend from recent practice signals">
              <TrendIcon trend={area.trend} />
            </span>
          </div>
          <p className="text-caption text-ink-secondary mt-1 leading-snug">{area.whyItMatters}</p>
          {area.seenInLabel ? (
            <p className="text-caption text-ink-tertiary mt-1 leading-snug">{area.seenInLabel}</p>
          ) : null}
          {area.trendProgressLabel ? (
            <p className="text-caption font-medium text-primary-700 mt-1">{area.trendProgressLabel}</p>
          ) : null}
          {area.basedOn ? (
            <p className="text-caption text-ink-tertiary mt-1 leading-snug italic">{area.basedOn}</p>
          ) : null}
          {area.bestNextHint ? (
            <p className="text-caption text-ink-secondary mt-1">{area.bestNextHint}</p>
          ) : null}
          {multiActions ? (
            <ul className="mt-2 space-y-1.5 pointer-events-auto">
              {area.actions!.map((a) => (
                <li key={a.id}>
                  <Link
                    href={a.href}
                    onClick={() => onPracticeNav(a.href, a.id)}
                    className="text-body-sm font-medium text-primary-600 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:rounded inline-flex items-center gap-1"
                  >
                    {a.label}
                    {a.estimatedMinutes != null ? (
                      <span className="text-caption font-normal text-ink-tertiary">~{a.estimatedMinutes} min</span>
                    ) : null}
                    <span aria-hidden>→</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <span className="inline-flex mt-2 text-body-sm font-semibold text-primary-600 pointer-events-none">
              {area.ctaLabel} →
            </span>
          )}
        </div>
      </div>
    </Card>
  )
}
