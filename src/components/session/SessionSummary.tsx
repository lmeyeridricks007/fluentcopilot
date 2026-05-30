'use client'

import Link from 'next/link'
import { clsx } from 'clsx'
import { Sparkles } from 'lucide-react'
import { playAppSound } from '@/lib/interaction/appSounds'

export type SessionSummaryNextAction = {
  title: string
  /** Supporting line (e.g. suggestion reason or loop subtitle). */
  subtitle?: string | null
  href: string
}

export type SessionSummaryProps = {
  /** XP granted for this session (0 still shows a muted line). */
  xpEarned: number
  /** One line, e.g. `4-day streak` — omit to hide the streak block. */
  streakLine?: string | null
  /** One line, e.g. `You improved route questions` — omit to hide skill impact. */
  skillImpactLine?: string | null
  /** Today suggestion or next training loop — shown above the CTA. */
  nextAction: SessionSummaryNextAction
  /** Primary CTA copy. */
  ctaLabel?: string
  className?: string
  onCtaClick?: () => void
}

const ctaClass =
  'inline-flex min-h-touch w-full items-center justify-center rounded-2xl bg-[#0F172A] px-5 py-3.5 text-[15px] font-bold text-white shadow-md transition hover:bg-slate-800 active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7c3aed]'

/**
 * Minimal post-session recap: XP, streak, one skill line, one next step, single CTA.
 * Parent supplies copy; no extra buttons inside this component.
 */
export function SessionSummary({
  xpEarned,
  streakLine,
  skillImpactLine,
  nextAction,
  ctaLabel = 'Next best rep',
  className,
  onCtaClick,
}: SessionSummaryProps) {
  const subtitle = nextAction.subtitle?.trim() || null

  return (
    <section
      className={clsx(
        'mx-auto w-full max-w-md rounded-[1.35rem] border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/60 px-5 py-6 shadow-[0_20px_48px_-28px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/[0.04] sm:px-6 sm:py-7',
        className,
      )}
      aria-label="Session summary"
    >
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
        <Sparkles className="h-4 w-4 text-[#7c3aed]" aria-hidden />
        <span>Session complete</span>
      </div>

      <div className="mt-6 space-y-8">
        {/* 1 — XP */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">XP earned</p>
          <p
            className={clsx(
              'mt-1 text-[2.35rem] font-bold leading-none tracking-tight tabular-nums sm:text-[2.6rem]',
              xpEarned > 0 ? 'text-[#7c3aed]' : 'text-slate-400',
            )}
          >
            {xpEarned > 0 ? `+${xpEarned} XP` : '—'}
          </p>
        </div>

        {/* 2 — Streak */}
        {streakLine ? (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Streak update</p>
            <p className="mt-1.5 text-xl font-semibold tracking-tight text-[#0F172A]">{streakLine}</p>
          </div>
        ) : null}

        {/* 3 — Skill impact */}
        {skillImpactLine ? (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Skill impact</p>
            <p className="mt-1.5 text-[15px] font-medium leading-snug text-slate-800">{skillImpactLine}</p>
          </div>
        ) : null}

        {/* 4 — Next action */}
        <div className="border-t border-slate-200/80 pt-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Next action</p>
          <p className="mt-2 text-[17px] font-bold leading-snug text-[#0F172A]">{nextAction.title}</p>
          {subtitle ? <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">{subtitle}</p> : null}
        </div>
      </div>

      <Link
        href={nextAction.href}
        className={clsx(ctaClass, 'mt-8')}
        onClick={() => {
          playAppSound('tap')
          onCtaClick?.()
        }}
      >
        {ctaLabel}
      </Link>
    </section>
  )
}
