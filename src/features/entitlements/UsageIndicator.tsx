/**
 * Displays current usage (e.g. "2 / 5 lessons today"). Grey/hidden when premium or trial.
 */

import { useEntitlement } from './EntitlementContext'

interface UsageIndicatorProps {
  variant?: 'lessons' | 'scenarios' | 'both'
  className?: string
}

export function UsageIndicator({ variant = 'lessons', className = '' }: UsageIndicatorProps) {
  const { tier, usage } = useEntitlement()
  const unlimited = tier === 'premium' || tier === 'trial'

  if (unlimited) {
    return (
      <span className={`text-caption text-ink-tertiary ${className}`} aria-hidden>
        Unlimited
      </span>
    )
  }

  if (variant === 'lessons') {
    return (
      <span className={`text-caption text-ink-secondary ${className}`}>
        {usage.lessonsToday} / {usage.lessonsLimit} lessons today
      </span>
    )
  }

  if (variant === 'scenarios') {
    return (
      <span className={`text-caption text-ink-secondary ${className}`}>
        {usage.scenariosToday} / {usage.scenariosLimit} scenarios this week
      </span>
    )
  }

  return (
    <span className={`text-caption text-ink-secondary ${className}`}>
      {usage.lessonsToday}/{usage.lessonsLimit} lessons · {usage.scenariosToday}/{usage.scenariosLimit} scenarios
    </span>
  )
}
