import { clsx } from 'clsx'

export function ProgressSummary({
  label,
  value,
  max,
  className,
}: {
  label: string
  value: number
  max: number
  className?: string
}) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100))
  return (
    <div className={clsx('space-y-1', className)}>
      <div className="flex justify-between gap-2 text-caption text-ink-secondary">
        <span>{label}</span>
        <span className="font-medium text-ink-primary tabular-nums">
          {value}/{max}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-200/90 overflow-hidden">
        <div
          className="h-full origin-left rounded-full bg-gradient-to-r from-primary-600 via-primary-500 to-primary-400 transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
