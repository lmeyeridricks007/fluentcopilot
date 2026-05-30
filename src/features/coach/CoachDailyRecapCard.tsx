'use client'

import Link from 'next/link'
import {
  BookOpen,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Target,
  TrendingUp,
} from 'lucide-react'
import { clsx } from 'clsx'
import { APP_TALK_HUB } from '@/lib/routing/appRoutes'
import { playAppSound } from '@/lib/interaction/appSounds'

type RecapTone = 'sky' | 'emerald' | 'amber' | 'violet'

const toneStyles: Record<RecapTone, { ring: string; iconBg: string; bar: string }> = {
  sky: {
    ring: 'border-violet-200/90 bg-gradient-to-br from-violet-50/90 to-white',
    iconBg: 'bg-violet-100 text-violet-800',
    bar: 'bg-violet-500',
  },
  emerald: {
    ring: 'border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 to-white',
    iconBg: 'bg-emerald-100 text-emerald-800',
    bar: 'bg-emerald-500',
  },
  amber: {
    ring: 'border-amber-200/90 bg-gradient-to-br from-amber-50/90 to-orange-50/20',
    iconBg: 'bg-amber-100 text-amber-900',
    bar: 'bg-amber-500',
  },
  violet: {
    ring: 'border-violet-200/90 bg-gradient-to-br from-violet-50/90 to-fuchsia-50/15',
    iconBg: 'bg-violet-100 text-violet-900',
    bar: 'bg-violet-500',
  },
}

/** Concise daily recap — mock lines until recap service exists. */
export function CoachDailyRecapCard() {
  const rows: Array<{
    key: string
    label: string
    detail: string
    tone: RecapTone
    icon: typeof BookOpen
    accentLabel: string
  }> = [
    {
      key: 'practiced',
      label: 'Practiced',
      detail: 'Short café thread + one listening rep.',
      tone: 'sky',
      icon: BookOpen,
      accentLabel: 'Done today',
    },
    {
      key: 'improved',
      label: 'Improved',
      detail: 'Polite requests — fewer English fallbacks.',
      tone: 'emerald',
      icon: TrendingUp,
      accentLabel: 'Momentum',
    },
    {
      key: 'slipped',
      label: 'Slipped',
      detail: 'Word order after modal verbs.',
      tone: 'amber',
      icon: Target,
      accentLabel: 'Focus next',
    },
    {
      key: 'tomorrow',
      label: 'Tomorrow',
      detail: '6-minute train-station scene in Talk.',
      tone: 'violet',
      icon: CalendarDays,
      accentLabel: 'Queued',
    },
  ]

  return (
    <section
      className="overflow-hidden rounded-[1.75rem] border border-slate-200/90 bg-gradient-to-b from-white via-slate-50/40 to-white p-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/[0.04] sm:p-5"
      aria-label="Daily recap"
    >
      <div className="flex items-start gap-3 border-b border-slate-200/70 pb-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 to-slate-600 text-white shadow-md">
          <ClipboardList className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 pt-0.5">
          <p className="text-caption font-bold uppercase tracking-wide text-slate-600">Daily recap</p>
          <p className="mt-1 text-body-sm font-semibold text-ink-primary leading-snug">How today felt in Dutch</p>
          <p className="mt-1 text-caption text-ink-tertiary leading-relaxed">
            Snapshot of practice, lift-offs, and one sharp focus — still mock until recap syncs from your sessions.
          </p>
        </div>
      </div>

      <ul className="mt-4 space-y-2.5 list-none p-0 m-0">
        {rows.map((row) => {
          const Icon = row.icon
          const t = toneStyles[row.tone]
          return (
            <li
              key={row.key}
              className={clsx(
                'relative flex gap-3 overflow-hidden rounded-2xl border px-3 py-3 shadow-sm sm:px-3.5 sm:py-3.5',
                t.ring,
              )}
            >
              <span
                className={clsx('absolute left-0 top-3 bottom-3 w-1 rounded-full', t.bar)}
                aria-hidden
              />
              <span
                className={clsx(
                  'ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-inner',
                  t.iconBg,
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <p className="text-body-sm font-bold text-ink-primary">{row.label}</p>
                  <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-tertiary ring-1 ring-slate-200/80">
                    {row.accentLabel}
                  </span>
                </div>
                <p className="mt-1 text-caption leading-relaxed text-ink-secondary">{row.detail}</p>
              </div>
            </li>
          )
        })}
      </ul>

      <Link
        href={APP_TALK_HUB}
        onClick={() => playAppSound('tap')}
        className="mt-4 flex min-h-touch w-full items-center justify-between gap-3 rounded-2xl border border-primary-200/90 bg-gradient-to-r from-primary-50/90 to-violet-50/50 px-4 py-3 text-left shadow-sm ring-1 ring-primary-100/80 transition-colors hover:border-primary-300 hover:from-primary-50 hover:to-violet-50/70"
      >
        <span>
          <span className="block text-body-sm font-bold text-primary-950">Practice what slipped</span>
          <span className="mt-0.5 block text-caption font-medium text-primary-900/80">
            Jump into Talk — same thread or a fresh scenario
          </span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-primary-700" aria-hidden />
      </Link>
    </section>
  )
}
