import { describe, expect, it } from 'vitest'
import { buildBookingReservationsScenario } from './bookingReservationsScenario'
import {
  BOOKING_APPOINTMENT_KIND_POOL,
  BOOKING_HAIRDRESSER_SERVICE_POOL,
  BOOKING_RESTAURANT_PARTY_POOL,
  BOOKING_TIME_DAY_LANGUAGE_POOL,
  commonConfirmationsForLevel,
} from './bookingReservationsVocabularyPools'
import { getBookingReservationsStarterHintsForRuntime } from './bookingReservationsLearnerStarters'

describe('bookingReservationsVocabularyPools', () => {
  it('exports non-empty structured pools', () => {
    expect(BOOKING_RESTAURANT_PARTY_POOL.length).toBeGreaterThan(0)
    expect(BOOKING_HAIRDRESSER_SERVICE_POOL.length).toBeGreaterThan(0)
    expect(BOOKING_APPOINTMENT_KIND_POOL.length).toBeGreaterThan(0)
    expect(BOOKING_TIME_DAY_LANGUAGE_POOL.length).toBeGreaterThanOrEqual(9)
    expect(commonConfirmationsForLevel('A2').length).toBeGreaterThan(0)
  })

  it('merges common confirmations into confirming starter hints', () => {
    const hints = getBookingReservationsStarterHintsForRuntime('A2', 'confirming_details')
    expect(hints.length).toBeLessThanOrEqual(5)
    const blob = hints.join(' ').toLowerCase()
    expect(blob).toMatch(/klopt|prima|dank|akkoord|half drie|lee|knippen/)
  })

  it('produces five detail lines from fixed rng constants (smoke)', () => {
    const configs = [
      { level: 'A2' as const, subType: 'restaurant_booking' as const, variation: 'asking_availability' as const, r: 0.11 },
      { level: 'A1' as const, subType: 'hairdresser_booking' as const, variation: 'making_booking' as const, r: 0.27 },
      { level: 'B1' as const, subType: 'appointment_booking' as const, variation: 'confirming_details' as const, r: 0.39 },
      { level: 'A2' as const, subType: 'restaurant_booking' as const, variation: 'making_booking' as const, r: 0.52 },
      { level: 'B1' as const, subType: 'hairdresser_booking' as const, variation: 'asking_availability' as const, r: 0.73 },
    ]
    const lines = configs.map((c) =>
      buildBookingReservationsScenario({ ...c, random: () => c.r }).context.split('\n')[0]
    )
    expect(lines.every((l) => l.startsWith('Details voor deze run:'))).toBe(true)
    expect(new Set(lines).size).toBeGreaterThan(1)
  })
})
