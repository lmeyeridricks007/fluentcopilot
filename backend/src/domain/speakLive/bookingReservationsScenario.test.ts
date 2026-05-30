import { describe, expect, it } from 'vitest'
import {
  BOOKING_GOAL_IDS,
  bookingCompletionContractSatisfied,
} from './bookingReservationsEvaluationContract'
import {
  BOOKING_RESERVATIONS_SCENARIO_ID,
  buildBookingReservationsScenario,
  hydrateBookingReservationsLearnerSituationSummary,
  normalizeBookingSubtype,
  normalizeBookingVariation,
} from './bookingReservationsScenario'

describe('buildBookingReservationsScenario', () => {
  it('builds stable runtime for fixed rng and overrides', () => {
    const rng = () => 0.42
    const out = buildBookingReservationsScenario({
      level: 'A2',
      subType: 'restaurant_booking',
      variation: 'making_booking',
      random: rng,
    })
    expect(out.id).toBe(BOOKING_RESERVATIONS_SCENARIO_ID)
    expect(out.subType).toBe('restaurant_booking')
    expect(out.variation).toBe('making_booking')
    expect(out.goals.length).toBe(4)
    expect(out.goals.reduce((s, g) => s + g.weight, 0)).toBe(100)
    expect(out.learnerSituationSummary).toMatch(/restaurant/)
    expect((out.openingLine ?? '').length).toBeGreaterThan(3)
    expect(out.evaluationContract?.variationId).toBe('making_booking')
    expect(out.evaluationContract?.completionRequiredPassGoalIds).toEqual([
      BOOKING_GOAL_IDS.making_booking.stateBookingIntentClearly,
      BOOKING_GOAL_IDS.making_booking.provideKeyDetails,
    ])
  })

  it('evaluation contract requires availability + time for asking_availability', () => {
    const out = buildBookingReservationsScenario({
      level: 'A2',
      variation: 'asking_availability',
      random: () => 0.1,
    })
    expect(out.evaluationContract?.completionRequiredPassGoalIds).toEqual([
      BOOKING_GOAL_IDS.asking_availability.askAvailabilityClearly,
      BOOKING_GOAL_IDS.asking_availability.nameTimeOrPreferenceClearly,
    ])
  })

  it('bookingCompletionContractSatisfied matches Dutch labels on runtime goals', () => {
    const runtime = buildBookingReservationsScenario({
      level: 'A2',
      variation: 'confirming_details',
      random: () => 0.2,
    })
    const labels = runtime.goals.map((g) => g.label)
    expect(
      bookingCompletionContractSatisfied(runtime, [labels[0]!, labels[1]!])
    ).toBe(true)
    expect(bookingCompletionContractSatisfied(runtime, [labels[0]!])).toBe(false)
  })

  it('normalizes subtype and variation aliases', () => {
    expect(normalizeBookingSubtype('restaurant')).toBe('restaurant_booking')
    expect(normalizeBookingVariation('availability')).toBe('asking_availability')
  })

  it('keeps Details-voor-deze-run on the first line for reliable parsing', () => {
    const out = buildBookingReservationsScenario({
      level: 'A2',
      subType: 'restaurant_booking',
      variation: 'making_booking',
      random: () => 0.33,
    })
    const first = out.context.split('\n')[0] ?? ''
    expect(first).toMatch(/^Details voor deze run:/)
    const hydrated = hydrateBookingReservationsLearnerSituationSummary({ ...out, learnerSituationSummary: '' })
    expect(hydrated.learnerSituationSummary ?? '').toMatch(/Setting:|Jouw voorkeur/i)
  })
})
