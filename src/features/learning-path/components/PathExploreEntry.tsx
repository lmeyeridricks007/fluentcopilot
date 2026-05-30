'use client'

import Link from 'next/link'
import { ChevronRight, Compass } from 'lucide-react'

/** Secondary entry to Explore — path and review habits stay primary. */
export function PathExploreEntry() {
  return (
    <Link
      href="/app/learn/explore"
      className="flex items-center gap-3 rounded-xl border border-dashed border-slate-200/95 bg-surface-muted/30 px-3.5 py-3 min-h-touch transition-colors hover:border-slate-300 hover:bg-surface-muted/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 active:scale-[0.99]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-elevated text-primary-700 ring-1 ring-slate-200/80">
        <Compass className="w-5 h-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="text-[11px] font-bold uppercase tracking-wide text-primary-800/85">Explore</span>
        <span className="block text-body-sm font-semibold text-ink-primary mt-0.5">
          Curated extras when you want a specific angle
        </span>
        <span className="block text-caption text-ink-secondary mt-0.5 leading-snug">
          Optional discovery — your path remains the through-line.
        </span>
      </span>
      <ChevronRight className="w-5 h-5 text-ink-tertiary shrink-0" aria-hidden />
    </Link>
  )
}
