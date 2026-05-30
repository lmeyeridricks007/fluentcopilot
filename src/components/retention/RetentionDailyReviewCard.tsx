'use client'

import { useEffect } from 'react'
import { RotateCcw, ChevronRight } from 'lucide-react'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { clsx } from 'clsx'
import { tier3KeepGoingRow, tier3ReviewShell } from '@/lib/design/cardTiers'

export function RetentionDailyReviewCard({
  dueCount,
  estMinutes,
  onStart,
  variant = 'card',
}: {
  dueCount: number
  estMinutes: number
  onStart: () => void
  /** `list` = row inside a grouped list (Home native quick actions) */
  variant?: 'card' | 'list'
}) {
  useEffect(() => {
    if (dueCount > 0) {
      track(ANALYTICS_EVENTS.review_card_shown, { surface: 'home', dueCount })
    }
  }, [dueCount])

  const accent = dueCount > 0 ? 'primary' : undefined

  const onClick = () => {
    track(ANALYTICS_EVENTS.dashboard_card_clicked, { card: 'daily_review', dueCount })
    onStart()
  }

  if (variant === 'list') {
    return (
      <button
        type="button"
        className={clsx(tier3KeepGoingRow, dueCount > 0 && 'bg-primary-50/12')}
        onClick={onClick}
      >
        <div className="w-7 h-7 rounded-lg bg-primary-100/90 flex items-center justify-center shrink-0">
          <RotateCcw className="w-3.5 h-3.5 text-primary-700" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-ink-primary leading-tight">
            {dueCount > 0 ? 'Next: daily review' : 'Daily review'}
          </p>
          <p className="text-[10px] text-ink-secondary mt-0.5 leading-snug">
            {dueCount > 0 ? `${dueCount} due · ~${estMinutes} min` : 'All clear for now'}
          </p>
        </div>
        <ChevronRight className="w-[18px] h-[18px] text-slate-400 shrink-0" aria-hidden />
      </button>
    )
  }

  return (
    <div className={clsx(tier3ReviewShell(accent), 'p-3 sm:p-3.5')}>
      <button
        type="button"
        className={clsx(
          'flex w-full items-center gap-3 text-left min-h-touch rounded-lg -m-0.5 p-0.5',
          'touch-manipulation active:opacity-90 transition-opacity'
        )}
        onClick={onClick}
      >
        <div className="w-9 h-9 rounded-xl bg-primary-100/80 flex items-center justify-center shrink-0 ring-1 ring-primary-200/30">
          <RotateCcw className="w-4 h-4 text-primary-700" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-body-sm font-semibold text-ink-primary">
            {dueCount > 0 ? 'Daily review ready' : 'Daily review'}
          </p>
          <p className="text-caption text-ink-secondary mt-0.5 leading-snug">
            {dueCount > 0 ? `${dueCount} due · ~${estMinutes} min` : 'Nothing due yet'}
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-ink-tertiary/80 shrink-0" aria-hidden />
      </button>
    </div>
  )
}
