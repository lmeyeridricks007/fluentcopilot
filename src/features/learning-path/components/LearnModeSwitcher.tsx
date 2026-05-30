'use client'

import { clsx } from 'clsx'

export type LearnMode = 'path' | 'review'

const MODES: { id: LearnMode; label: string }[] = [
  { id: 'path', label: 'Path' },
  { id: 'review', label: 'Review' },
]

export function LearnModeSwitcher({
  value,
  onChange,
  className,
}: {
  value: LearnMode
  onChange: (mode: LearnMode) => void
  className?: string
}) {
  return (
    <div
      role="tablist"
      aria-label="Learn mode"
      className={clsx(
        'flex rounded-full border border-slate-200/90 bg-surface-muted/80 p-0.5 max-w-md',
        className
      )}
    >
      {MODES.map(({ id, label }) => {
        const selected = value === id
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(id)}
            className={clsx(
              'relative flex-1 min-h-touch rounded-full px-2 text-center text-body-sm font-semibold transition-colors duration-200 motion-safe:transition-[color,transform] motion-safe:duration-200',
              selected && 'motion-safe:scale-[1.02]',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500',
              selected ? 'text-ink-primary' : 'text-ink-secondary hover:text-ink-primary'
            )}
          >
            {selected ? (
              <span
                className="absolute inset-0 rounded-full bg-surface-elevated shadow-sm border border-slate-200/60 transition-all duration-200 ease-out motion-safe:shadow-md"
                aria-hidden
              />
            ) : null}
            <span className="relative z-[1]">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
