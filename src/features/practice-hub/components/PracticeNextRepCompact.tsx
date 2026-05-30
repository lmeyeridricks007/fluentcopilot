'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { playOptInTapSound } from '@/lib/device/deviceFeedback'
import type { NextBestActionVm } from '@/lib/dashboard/nextBestAction'
import { NEXT_BEST_CTA } from '@/lib/dashboard/nextBestActionCtas'

/** Secondary “next rep” when the primary block is continue / pick up — avoids a second full hero. */
export function PracticeNextRepCompact({
  action,
  surface,
}: {
  action: NextBestActionVm
  surface: string
}) {
  return (
    <Link
      href={action.href}
      onClick={() => {
        playOptInTapSound()
        track(ANALYTICS_EVENTS.dashboard_next_action_clicked, {
          surface,
          kind: action.kind,
          href: action.href,
          variant: 'compact_secondary',
        })
      }}
      className="block min-h-touch focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 rounded-2xl"
    >
      <Card
        variant="outlined"
        padding="md"
        className="h-full border-primary-200/80 bg-gradient-to-br from-primary-50/50 to-surface-elevated transition-colors active:scale-[0.99] hover:border-primary-300"
      >
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary-800/85">Your next rep</p>
        <p className="text-body font-semibold text-ink-primary mt-1 leading-snug">{action.title}</p>
        <p className="text-caption text-ink-secondary mt-1 line-clamp-2 leading-snug">{action.subline}</p>
        <p className="mt-3 flex items-center text-body-sm font-semibold text-primary-800">
          {NEXT_BEST_CTA.practiceNow}
          <ChevronRight className="w-4 h-4 ml-0.5" aria-hidden />
        </p>
      </Card>
    </Link>
  )
}
