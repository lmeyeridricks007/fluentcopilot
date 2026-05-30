'use client'

import Link from 'next/link'
import { ChevronRight, Mic } from 'lucide-react'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { tier2PracticalShell, surfacePrimaryCta } from '@/lib/design/cardTiers'
import { playOptInTapSound } from '@/lib/device/deviceFeedback'
import { clsx } from 'clsx'

export function HomePracticalFocusCard({
  featuredTitle,
  featuredSummary,
  featuredHref,
}: {
  featuredTitle: string | null
  featuredSummary: string | null
  featuredHref: string | null
}) {
  const hasContinue = Boolean(featuredHref && featuredTitle)
  const title = hasContinue
    ? `Continue: ${featuredTitle}`
    : featuredTitle ?? 'Practice Dutch in real situations'
  const summary =
    (featuredSummary && featuredSummary.length > 68
      ? `${featuredSummary.slice(0, 65)}…`
      : featuredSummary) ?? 'Useful Dutch for real life — cafés, admin, doctor visits.'

  const primaryHref = featuredHref ?? '/app/practice'

  return (
    <section aria-label="Practical Dutch" className={tier2PracticalShell}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0 ring-1 ring-primary-100/70">
          <Mic className="w-[1.15rem] h-[1.15rem] text-primary-700/90" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-2.5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-primary-800/70">Real life</p>
            <h2 className="text-body-lg font-bold text-ink-primary mt-0.5 leading-snug tracking-tight">{title}</h2>
            <p className="text-[12px] text-ink-secondary mt-1 leading-snug line-clamp-2">{summary}</p>
          </div>
          <Link
            href={primaryHref}
            onClick={() => {
              playOptInTapSound()
              track(ANALYTICS_EVENTS.dashboard_next_action_clicked, {
                surface: 'home_practical_focus',
                kind: 'practical_featured',
                href: primaryHref,
              })
            }}
            className={clsx(
              surfacePrimaryCta,
              'min-h-[50px] px-4 text-body-sm',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500'
            )}
          >
            {hasContinue ? 'Continue' : 'Start a rep'}
            <ChevronRight className="w-4 h-4 opacity-90" aria-hidden />
          </Link>
          <Link
            href="/app/practice"
            className="inline-flex items-center justify-center w-full py-0.5 text-[12px] font-medium text-primary-700/85 hover:underline active:opacity-80 touch-manipulation"
          >
            Browse all practice
          </Link>
        </div>
      </div>
    </section>
  )
}
