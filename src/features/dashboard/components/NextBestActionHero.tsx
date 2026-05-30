'use client'

import Link from 'next/link'
import { ChevronRight, Zap } from 'lucide-react'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import type { NextBestActionVm } from '@/lib/dashboard/nextBestAction'
import { heroPrimaryCta, heroShellClass } from '@/lib/design/cardTiers'
import { playOptInTapSound } from '@/lib/device/deviceFeedback'
import { clsx } from 'clsx'

export function NextBestActionHero({
  action,
  surface,
}: {
  action: NextBestActionVm
  surface: string
}) {
  const pct =
    action.missionProgress != null && action.missionProgress.target > 0
      ? Math.min(100, (action.missionProgress.current / action.missionProgress.target) * 100)
      : null

  return (
    <section
      aria-label="Next best action"
      className={clsx('relative isolate overflow-hidden p-4 sm:p-5 text-white', heroShellClass)}
    >
      <div
        className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-violet-300/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-16 -left-12 h-44 w-44 rounded-full bg-primary-900/35 blur-3xl"
        aria-hidden
      />
      <div className="relative space-y-2.5 fc-home-rise">
        <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.14em] text-primary-100/90 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 opacity-90" aria-hidden />
          {action.eyebrow}
        </p>
        <h2 className="text-[1.35rem] sm:text-[1.7rem] font-bold leading-[1.12] tracking-tight text-white pr-1">
          {action.title}
        </h2>
        <p className="text-[13px] sm:text-body-sm text-primary-50/90 leading-snug font-normal line-clamp-2 max-w-prose">
          {action.subline}
        </p>
        {pct != null ? (
          <div className="space-y-1 pt-0.5">
            <ProgressBar value={pct} max={100} className="h-2.5" variant="onDark" />
            {action.xpHint != null ? (
              <p className="text-[11px] leading-tight text-primary-100/88 font-medium">
                +{action.xpHint} XP on finish — small win, adds up.
              </p>
            ) : null}
          </div>
        ) : null}
        <div className="mt-2 border-t border-white/12 pt-3 space-y-2">
          <Link
            href={action.href}
            onClick={() => {
              playOptInTapSound()
              track(ANALYTICS_EVENTS.dashboard_next_action_clicked, {
                surface,
                kind: action.kind,
                href: action.href,
              })
            }}
            className={clsx(
              heroPrimaryCta,
              'group min-h-[54px] px-4 py-3.5 text-body text-ink-primary',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'
            )}
          >
            {action.ctaLabel}
            <ChevronRight
              className="w-4 h-4 opacity-75 group-hover:translate-x-0.5 transition-transform duration-200"
              aria-hidden
            />
          </Link>
        </div>
      </div>
    </section>
  )
}
