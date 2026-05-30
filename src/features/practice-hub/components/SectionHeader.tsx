import { clsx } from 'clsx'

interface SectionHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  className?: string
}

export function SectionHeader({ title, subtitle, action, className }: SectionHeaderProps) {
  return (
    <div className={clsx('flex items-end justify-between gap-3 mb-3 px-0.5', className)}>
      <div className="min-w-0">
        <h2 className="text-body-lg font-semibold text-ink-primary tracking-tight">{title}</h2>
        {subtitle ? (
          <p className="text-caption text-ink-secondary mt-0.5 leading-snug">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
