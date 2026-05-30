import { clsx } from 'clsx'

type StatusVariant = 'pass' | 'fail' | 'warning' | 'pending' | 'approved' | 'rejected' | 'published' | 'draft'

interface StatusBadgeProps {
  status: string
  variant?: StatusVariant
  className?: string
}

const VARIANT_CLASSES: Record<StatusVariant, string> = {
  pass: 'bg-emerald-100 text-emerald-800',
  fail: 'bg-red-100 text-red-800',
  warning: 'bg-amber-100 text-amber-800',
  pending: 'bg-slate-100 text-slate-700',
  approved: 'bg-blue-100 text-blue-800',
  rejected: 'bg-red-100 text-red-800',
  published: 'bg-emerald-100 text-emerald-800',
  draft: 'bg-slate-100 text-slate-600',
}

export function StatusBadge({ status, variant = 'pending', className }: StatusBadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded text-caption font-medium',
        VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.pending,
        className
      )}
    >
      {status}
    </span>
  )
}
