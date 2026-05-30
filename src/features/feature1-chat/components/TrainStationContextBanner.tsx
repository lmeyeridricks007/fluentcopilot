'use client'

import { X } from 'lucide-react'
import type { ScenarioConfig } from '../types'

export function TrainStationContextBanner({
  scenario,
  onDismiss,
}: {
  scenario: ScenarioConfig
  onDismiss: () => void
}) {
  return (
    <div className="mx-1 mb-2 rounded-xl border border-slate-200/90 bg-surface-muted/60 px-3 py-2 relative">
      <button
        type="button"
        onClick={onDismiss}
        className="absolute top-2 right-2 min-h-touch min-w-touch flex items-center justify-center rounded-lg text-ink-tertiary hover:bg-slate-200/50"
        aria-label="Hide context"
      >
        <X className="w-4 h-4" aria-hidden />
      </button>
      <p className="text-[10px] font-bold uppercase tracking-wide text-ink-tertiary pr-8">Scene</p>
      <p className="text-caption text-ink-primary font-semibold mt-0.5">{scenario.title}</p>
      <p className="text-caption text-ink-secondary mt-1 leading-snug">
        You are: <span className="text-ink-primary font-medium">{scenario.userRole}</span>
      </p>
      <p className="text-caption text-ink-secondary mt-0.5 leading-snug">
        Goal: ask about your train and respond naturally — then close politely.
      </p>
    </div>
  )
}
