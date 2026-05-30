import { clsx } from 'clsx'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center py-12 px-6 text-center',
        className
      )}
    >
      {icon && (
        <div className="w-16 h-16 rounded-full bg-surface-muted flex items-center justify-center text-ink-tertiary mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-body-lg font-semibold text-ink-primary">{title}</h3>
      {description && (
        <p className="mt-2 text-body-sm text-ink-secondary max-w-sm">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
