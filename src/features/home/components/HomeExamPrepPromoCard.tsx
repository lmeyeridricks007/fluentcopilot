'use client'

import Link from 'next/link'
import { ChevronRight, ClipboardList } from 'lucide-react'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { tier2ExamShell, cardSurfacePress, examModeCta } from '@/lib/design/cardTiers'
import { playOptInTapSound } from '@/lib/device/deviceFeedback'
import { clsx } from 'clsx'

export function HomeExamPrepPromoCard({
  isPremiumPlan,
  emphasis = 'primary',
}: {
  isPremiumPlan: boolean
  emphasis?: 'primary' | 'secondary'
}) {
  const outcomeLine = isPremiumPlan
    ? 'Train → simulate → run mocks. Prep under exam pressure.'
    : 'Preview training — unlock the full exam runway with Premium.'

  return (
    <section aria-label="Exam prep mode" className={tier2ExamShell(emphasis)}>
      <Link
        href="/app/exam-prep"
        onClick={() => {
          playOptInTapSound()
          track(ANALYTICS_EVENTS.dashboard_next_action_clicked, {
            surface: 'home_exam_prep_promo',
            kind: 'exam_prep_hub',
            href: '/app/exam-prep',
          })
        }}
        className={clsx(
          'flex items-start gap-3 min-h-[4.5rem] rounded-xl -m-1 p-1 -outline-offset-2',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600',
          cardSurfacePress
        )}
      >
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-primary-600 to-primary-800 text-white flex items-center justify-center shrink-0 shadow-[0_10px_28px_-8px_rgba(91,33,182,0.55)] ring-1 ring-white/30">
          <ClipboardList className="w-7 h-7" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 flex flex-col gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary-800/75">Enter focused mode</p>
            <h2 className="text-lg font-bold text-ink-primary mt-0.5 leading-snug tracking-tight">A2 exam mode</h2>
            <p className="text-[11px] text-ink-tertiary mt-1 font-medium leading-snug">
              Speaking · writing · listening · reading · KNM
            </p>
            <p className="text-[12px] text-ink-secondary/95 mt-1.5 leading-snug">{outcomeLine}</p>
          </div>
          <span className={clsx(examModeCta, 'min-h-[50px] px-4 text-body-sm pointer-events-none')}>
            Enter exam mode
            <ChevronRight className="w-4 h-4 opacity-95" aria-hidden />
          </span>
        </div>
      </Link>
    </section>
  )
}
