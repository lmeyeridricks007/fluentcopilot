import { clsx } from 'clsx'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'elevated' | 'outlined' | 'flat'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function Card({
  className,
  variant = 'elevated',
  padding = 'md',
  ...props
}: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-card overflow-hidden',
        {
          'bg-surface-elevated shadow-card ring-1 ring-slate-900/[0.04]':
            variant === 'elevated',
          'bg-surface-elevated border border-slate-200/80': variant === 'outlined',
          'bg-surface-muted': variant === 'flat',
          'p-0': padding === 'none',
          'p-4': padding === 'sm',
          'p-5': padding === 'md',
          'p-6 sm:p-7': padding === 'lg',
        },
        className
      )}
      {...props}
    />
  )
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('mb-3', className)} {...props} />
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={clsx('text-title font-bold text-ink-primary tracking-tight', className)}
      {...props}
    />
  )
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={clsx('text-body-sm text-ink-secondary mt-1', className)} {...props} />
  )
}
