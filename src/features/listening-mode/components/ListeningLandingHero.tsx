'use client'

import { Headphones } from 'lucide-react'
import type { ListeningLevel } from '@/lib/listening-mode/schema'
import { levelCoachCopy } from '@/lib/listening-mode/listeningLevelRules'

type Props = {
  level: ListeningLevel
  onLevelChange: (lv: ListeningLevel) => void
}

export function ListeningLandingHero({ level, onLevelChange }: Props) {
  return (
    <header className="relative overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-gradient-to-br from-surface-elevated via-white to-teal-50/35 px-5 py-8 shadow-card sm:px-7 sm:py-9">
      <div
        className="pointer-events-none absolute -right-8 -top-16 h-44 w-44 rounded-full bg-teal-400/12 blur-3xl"
        aria-hidden
      />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-24 w-52 rounded-full bg-primary-500/5 blur-2xl" aria-hidden />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-800 ring-1 ring-teal-200/70 shadow-sm">
          <Headphones className="h-7 w-7" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-teal-900/75">Listening</p>
          <h1 className="mt-1.5 text-[1.65rem] font-bold leading-tight tracking-tight text-ink-primary sm:text-3xl">
            Understand real Dutch faster
          </h1>
          <p className="mt-3 max-w-xl text-body leading-relaxed text-ink-secondary">
            Short scenario-based listening drills for gist, details, and natural replies — the Dutch you hear at counters,
            platforms, and desks — not generic quiz noise.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {(['A1', 'A2', 'B1'] as const).map((lv) => (
              <button
                key={lv}
                type="button"
                onClick={() => onLevelChange(lv)}
                className={`rounded-full px-3.5 py-1.5 text-caption font-semibold transition ${
                  level === lv
                    ? 'bg-primary-700 text-white shadow-md shadow-primary-900/15'
                    : 'border border-slate-200/90 bg-surface-muted text-ink-primary hover:bg-slate-100/90'
                }`}
              >
                {lv}
              </button>
            ))}
          </div>
          <p className="mt-3 text-caption text-ink-tertiary">{levelCoachCopy(level)}</p>
        </div>
      </div>
    </header>
  )
}
