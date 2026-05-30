/**
 * FD-09 — badge for activity source (manual, location, etc.).
 */

import { clsx } from 'clsx'
import { SOURCE_DISPLAY_NAMES } from '../mocks/activities'
import type { DailyActivitySource } from '../types'

interface ActivitySourceBadgeProps {
  sourceType: DailyActivitySource
  className?: string
}

export function ActivitySourceBadge({ sourceType, className }: ActivitySourceBadgeProps) {
  const label = SOURCE_DISPLAY_NAMES[sourceType] ?? sourceType
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-caption font-medium bg-slate-100 text-ink-secondary',
        className
      )}
    >
      {label}
    </span>
  )
}
