import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  variant?: 'default' | 'muted'
}

export function StatCard({ label, value, icon: Icon, variant = 'default' }: StatCardProps) {
  return (
    <div
      className={
        variant === 'muted'
          ? 'rounded-lg border border-slate-200 bg-slate-50/50 p-4'
          : 'rounded-lg border border-slate-200 bg-white p-4 shadow-sm'
      }
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-caption text-ink-tertiary uppercase tracking-wide">{label}</p>
          <p className="text-title font-bold text-ink-primary mt-1">{value}</p>
        </div>
        {Icon && (
          <div className="rounded-lg bg-slate-100 p-2">
            <Icon className="w-5 h-5 text-ink-secondary" aria-hidden />
          </div>
        )}
      </div>
    </div>
  )
}
