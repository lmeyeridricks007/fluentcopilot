'use client'

import { Lock } from 'lucide-react'
import type { StageSectionModel } from '../types'

/** Aspirational preview — compact, calm “ahead on your route” without a hard wall. */
export function LockedStagePreview({ stage }: { stage: StageSectionModel }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50/95 via-surface-elevated to-primary-50/25 px-3.5 py-3.5 flex gap-3 items-start shadow-sm ring-1 ring-slate-100/80">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100/80 text-primary-800 ring-1 ring-primary-200/60">
        <Lock className="w-4 h-4" aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary-800/90">
          Ahead on your path
        </p>
        <p className="text-body-sm font-semibold text-ink-primary mt-0.5">
          {stage.bandId} · {stage.title}
        </p>
        <p className="text-caption text-ink-secondary mt-1 line-clamp-2 leading-snug">
          {stage.description}
        </p>
        <p className="text-[11px] text-ink-tertiary mt-1.5">Unlocks as you finish prior stages.</p>
      </div>
    </div>
  )
}
