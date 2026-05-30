'use client'

import { clsx } from 'clsx'
import Link from 'next/link'
import { ChevronRight, Flame, Sparkles, Target } from 'lucide-react'
import type { ReadinessEvaluation } from '@/lib/post-a2/types'
import type { WeakAreaVm } from '@/features/practice-hub/types'
import { statusBandClass } from '@/lib/design/cardTiers'

export function HomeCompactStatusStrip({
  streak,
  totalXp,
  readiness,
  weakHeadline,
  pathLabel,
  progressHref = '/app/progress',
}: {
  streak: number
  totalXp: number
  readiness: ReadinessEvaluation
  weakHeadline: string | null
  pathLabel: string
  progressHref?: string
}) {
  const readinessShort = readiness.headline || 'On track'
  const weakShort = weakHeadline ? ` · ${weakHeadline}` : ''

  return (
    <section aria-label="Your status" className={statusBandClass}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-ink-secondary">
        <span
          className={clsx(
            'inline-flex items-center gap-0.5 font-semibold whitespace-nowrap',
            streak > 0 ? 'text-amber-900/90' : 'text-ink-secondary'
          )}
        >
          <Flame
            className={clsx('w-3 h-3 shrink-0', streak > 0 ? 'text-amber-500' : 'text-slate-400')}
            aria-hidden
          />
          {streak > 0 ? `${streak}-day streak` : 'Streak: start today'}
        </span>
        <span className="text-slate-300" aria-hidden>
          ·
        </span>
        <span className="inline-flex items-center gap-0.5 whitespace-nowrap font-medium text-ink-primary/85">
          <Sparkles className="w-3 h-3 text-primary-600/80 shrink-0" aria-hidden />
          {totalXp.toLocaleString()} XP
        </span>
        <span className="text-slate-300" aria-hidden>
          ·
        </span>
        <span className="inline-flex items-center gap-0.5 min-w-0">
          <Target className="w-3 h-3 text-slate-500 shrink-0" aria-hidden />
          <span className="truncate max-w-[9rem] sm:max-w-none">{pathLabel}</span>
        </span>
      </div>
      <div className="mt-1.5 flex items-start justify-between gap-2">
        <p className="text-[11px] text-ink-secondary leading-snug min-w-0 line-clamp-2">
          <span className="font-medium text-ink-primary/85">{readinessShort}</span>
          {weakShort ? <span className="text-ink-tertiary">{weakShort}</span> : null}
        </p>
        <Link
          href={progressHref}
          className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-primary-700 shrink-0 touch-manipulation active:opacity-70 py-0.5"
        >
          See progress
          <ChevronRight className="w-3 h-3" aria-hidden />
        </Link>
      </div>
    </section>
  )
}

export function weakHeadlineFromAreas(areas: WeakAreaVm[]): string | null {
  const top = areas[0]
  if (!top) return null
  return top.headline ?? top.label ?? null
}
