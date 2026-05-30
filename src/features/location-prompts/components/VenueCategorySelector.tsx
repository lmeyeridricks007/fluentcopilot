/**
 * FD-08 — toggles for venue categories in settings.
 */

import { VENUE_DISPLAY_NAMES } from '../mocks/prompts'
import type { VenueType } from '../types'

interface VenueCategorySelectorProps {
  selected: Record<VenueType, boolean>
  onChange: (venue: VenueType, enabled: boolean) => void
  disabled?: boolean
}

const VENUE_TYPES: VenueType[] = [
  'cafe',
  'restaurant',
  'supermarket',
  'train_station',
  'pharmacy',
  'office',
  'school_daycare',
  'municipality',
]

export function VenueCategorySelector({ selected, onChange, disabled }: VenueCategorySelectorProps) {
  return (
    <div className="space-y-2" role="group" aria-label="Venue categories">
      {VENUE_TYPES.map((venue) => (
        <label
          key={venue}
          className="flex items-center justify-between gap-3 py-2 cursor-pointer"
        >
          <span className="text-body text-ink-primary">
            {VENUE_DISPLAY_NAMES[venue] ?? venue}
          </span>
          <input
            type="checkbox"
            checked={selected[venue]}
            onChange={(e) => onChange(venue, e.target.checked)}
            disabled={disabled}
            className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
          />
        </label>
      ))}
    </div>
  )
}
