/**
 * FD-08 — venue type badge for prompt cards.
 */

import { clsx } from 'clsx'
import { VENUE_DISPLAY_NAMES } from '../mocks/prompts'
import type { VenueType } from '../types'

interface VenueTypeBadgeProps {
  venueType: VenueType
  className?: string
}

export function VenueTypeBadge({ venueType, className }: VenueTypeBadgeProps) {
  const label = VENUE_DISPLAY_NAMES[venueType] ?? venueType
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-caption font-medium bg-primary-100 text-primary-700',
        className
      )}
    >
      {label}
    </span>
  )
}
