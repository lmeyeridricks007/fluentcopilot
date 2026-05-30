'use client'

import { clsx } from 'clsx'

export function MasteryIndicator({
  label,
  value01,
  className,
}: {
  label: string
  value01: number
  className?: string
}) {
  const pct = Math.round(Math.max(0, Math.min(1, value01)) * 100)
  return (
    <div className={clsx('rounded-lg border border-slate-200 bg-surface-elevated px-3 py-2', className)}>
      <div className="flex justify-between text-caption text-ink-tertiary mb-1">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
