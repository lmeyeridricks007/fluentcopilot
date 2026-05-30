/**
 * FD-09 — venue/situation picker for capture moment.
 */

import { VENUE_DISPLAY_NAMES } from '../mocks/activities'
import type { VenueType } from '../types'

const VENUE_OPTIONS: VenueType[] = [
  'cafe',
  'restaurant',
  'supermarket',
  'train_station',
  'pharmacy',
  'office',
  'school_daycare',
  'municipality',
  'doctor',
  'other',
]

interface VenueCategoryPickerProps {
  value?: VenueType
  onChange: (venue: VenueType) => void
  label?: string
}

export function VenueCategoryPicker({ value, onChange, label = 'Situation / place' }: VenueCategoryPickerProps) {
  return (
    <div role="group" aria-label={label}>
      {label && (
        <p className="text-body-sm font-medium text-ink-primary mb-2">{label}</p>
      )}
      <div className="flex flex-wrap gap-2">
        {VENUE_OPTIONS.map((venue) => (
          <button
            key={venue}
            type="button"
            onClick={() => onChange(venue)}
            className={`px-3 py-1.5 rounded-full text-body-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 ${
              value === venue
                ? 'bg-primary-600 text-white'
                : 'bg-slate-100 text-ink-secondary hover:bg-slate-200'
            }`}
          >
            {VENUE_DISPLAY_NAMES[venue] ?? venue}
          </button>
        ))}
      </div>
    </div>
  )
}
