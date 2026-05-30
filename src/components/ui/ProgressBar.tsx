import { clsx } from 'clsx'

interface ProgressBarProps {
  value: number
  max?: number
  variant?: 'default' | 'success' | 'warning' | 'onDark'
  className?: string
  showLabel?: boolean
}

export function ProgressBar({
  value,
  max = 100,
  variant = 'default',
  className,
  showLabel,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className={clsx('w-full', className)}>
      <div
        className={clsx(
          'h-2 w-full rounded-full overflow-hidden',
          variant === 'onDark' ? 'bg-white/20' : 'bg-surface-muted'
        )}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={clsx(
            'h-full rounded-full transition-[width] duration-500 ease-out',
            {
              'bg-primary-500': variant === 'default',
              'bg-success': variant === 'success',
              'bg-warning': variant === 'warning',
              'bg-amber-300': variant === 'onDark',
            }
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-caption text-ink-secondary mt-1">
          {Math.round(pct)}%
        </span>
      )}
    </div>
  )
}
