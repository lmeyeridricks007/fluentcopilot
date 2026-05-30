'use client'

import { clsx } from 'clsx'

/** Compact Guided → Semi → Free progression (copy only; unlock logic lives elsewhere). */
export function GuidedModeProgressStepper() {
  const steps = [
    { id: 'guided', label: 'Guided', state: 'active' as const },
    { id: 'semi', label: 'Semi-guided', state: 'locked' as const },
    { id: 'free', label: 'Free', state: 'locked' as const },
  ]
  return (
    <div className="flex items-center gap-1.5" aria-label="Practice mode progression">
      {steps.map((s, i) => (
        <div key={s.id} className="flex items-center gap-1.5 min-w-0">
          {i > 0 ? <span className="text-ink-tertiary text-caption shrink-0">→</span> : null}
          <span
            className={clsx(
              'text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-lg truncate max-w-[5.5rem] sm:max-w-none',
              s.state === 'active' && 'bg-primary-100 text-primary-900 ring-1 ring-primary-200/80',
              s.state === 'locked' && 'bg-slate-100/90 text-ink-tertiary ring-1 ring-slate-200/70'
            )}
          >
            {s.label}
          </span>
        </div>
      ))}
    </div>
  )
}
