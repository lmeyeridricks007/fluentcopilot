'use client'

import { useEffect } from 'react'
import { Crosshair, ChevronRight } from 'lucide-react'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { clsx } from 'clsx'
import { tier3KeepGoingRow, tier3ReviewShell } from '@/lib/design/cardTiers'

export function RetentionFixMistakesCard({
  sessionCount,
  hint,
  hasMistakeEvidence,
  onStart,
  variant = 'card',
}: {
  sessionCount: number
  hint: string | null
  hasMistakeEvidence: boolean
  onStart: () => void
  variant?: 'card' | 'list'
}) {
  useEffect(() => {
    track(ANALYTICS_EVENTS.fix_mistakes_shown, {
      sessionCount,
      hasHint: Boolean(hint),
      hasMistakeEvidence,
    })
  }, [sessionCount, hint, hasMistakeEvidence])

  const active = hasMistakeEvidence && sessionCount > 0

  const onClick = () => {
    track(ANALYTICS_EVENTS.fix_mistakes_started, { sessionCount })
    track(ANALYTICS_EVENTS.dashboard_card_clicked, { card: 'fix_mistakes' })
    onStart()
  }

  if (variant === 'list') {
    return (
      <button
        type="button"
        className={clsx(tier3KeepGoingRow, active && 'bg-amber-50/18')}
        onClick={onClick}
      >
        <div className="w-7 h-7 rounded-lg bg-amber-100/85 flex items-center justify-center shrink-0">
          <Crosshair className="w-3.5 h-3.5 text-amber-900/85" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-ink-primary leading-tight">Fix mistakes</p>
          <p className="text-[10px] text-ink-secondary mt-0.5 leading-snug line-clamp-2">
            {active
              ? hint ?? `~2–3 min · ${sessionCount} queued`
              : hasMistakeEvidence
                ? 'Queue empty'
                : 'After your next review'}
          </p>
        </div>
        <ChevronRight className="w-[18px] h-[18px] text-slate-400 shrink-0" aria-hidden />
      </button>
    )
  }

  return (
    <div className={clsx(tier3ReviewShell(active ? 'amber' : undefined), 'p-3 sm:p-3.5')}>
      <button
        type="button"
        className={clsx(
          'flex w-full items-center gap-3 text-left min-h-touch rounded-lg -m-0.5 p-0.5',
          'touch-manipulation active:opacity-90 transition-opacity'
        )}
        onClick={onClick}
      >
        <div className="w-9 h-9 rounded-xl bg-amber-100/70 flex items-center justify-center shrink-0 ring-1 ring-amber-200/35">
          <Crosshair className="w-4 h-4 text-amber-900/80" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-body-sm font-semibold text-ink-primary">Fix your mistakes</p>
          <p className="text-caption text-ink-secondary mt-0.5 leading-snug">
            {active
              ? hint
                ? `${hint} · ~2–3 min`
                : 'Quick reps'
              : hasMistakeEvidence
                ? 'Nothing queued'
                : 'Shows up after reviews'}
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-ink-tertiary/80 shrink-0" aria-hidden />
      </button>
    </div>
  )
}
