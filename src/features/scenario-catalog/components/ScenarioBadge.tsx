import { clsx } from 'clsx'
import { Sparkles, Heart, Crown, Lock } from 'lucide-react'

type BadgeVariant = 'recommended' | 'weak' | 'premium' | 'locked'

const styles: Record<BadgeVariant, string> = {
  recommended: 'bg-primary-100 text-primary-800 border-primary-200/80',
  weak: 'bg-rose-50 text-rose-800 border-rose-200/80',
  premium: 'bg-amber-50 text-amber-900 border-amber-200/80',
  locked: 'bg-slate-100 text-ink-secondary border-slate-200/80',
}

export function ScenarioBadge({
  variant,
  children,
  icon,
}: {
  variant: BadgeVariant
  children: React.ReactNode
  icon?: 'sparkles' | 'heart' | 'crown' | 'lock'
}) {
  const Icon =
    icon === 'heart'
      ? Heart
      : icon === 'crown'
        ? Crown
        : icon === 'lock'
          ? Lock
          : icon === 'sparkles'
            ? Sparkles
            : null
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-caption font-semibold',
        styles[variant]
      )}
    >
      {Icon ? <Icon className="w-3 h-3 shrink-0" aria-hidden /> : null}
      {children}
    </span>
  )
}
