'use client'

import Link from 'next/link'
import { BookOpen, ChevronRight } from 'lucide-react'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { tier2PracticalShell, surfacePrimaryCta } from '@/lib/design/cardTiers'
import { playOptInTapSound } from '@/lib/device/deviceFeedback'
import { clsx } from 'clsx'

export function HomeLessonPathCard() {
  return (
    <section aria-label="Structured lessons" className={tier2PracticalShell}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0 ring-1 ring-primary-100/70">
          <BookOpen className="w-[1.15rem] h-[1.15rem] text-primary-700/90" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-2.5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-tertiary">Your path</p>
            <h2 className="text-body-lg font-bold text-ink-primary mt-0.5 leading-snug tracking-tight">Lessons</h2>
            <p className="text-[12px] text-ink-secondary mt-1 leading-snug">Structured path — open when you want depth.</p>
          </div>
          <Link
            href="/app/learn"
            onClick={() => {
              playOptInTapSound()
              track(ANALYTICS_EVENTS.dashboard_next_action_clicked, {
                surface: 'home_lesson_path',
                kind: 'learn_hub',
                href: '/app/learn',
              })
            }}
            className={clsx(
              surfacePrimaryCta,
              'min-h-[48px] px-4 text-body-sm',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500'
            )}
          >
            Open Learn
            <ChevronRight className="w-4 h-4 opacity-90" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  )
}
