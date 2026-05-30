import { describe, expect, it } from 'vitest'
import { buildDoctorPharmacyScenario } from './doctorPharmacyScenario'
import { buildBookingReservationsScenario } from './bookingReservationsScenario'
import {
  appendCumulativeSpeakLiveMemoryTurn,
  parseSpeakLiveState,
  serializeSpeakLiveState,
  defaultSpeakLiveState,
} from './speakLiveFsm'

describe('appendCumulativeSpeakLiveMemoryTurn', () => {
  it('appends turn lines for doctor_pharmacy', () => {
    const out = appendCumulativeSpeakLiveMemoryTurn({
      scenarioSlug: 'doctor_pharmacy',
      rollingSummaryEnglish: 'Prior',
      userTextTrimmed: 'Ik heb hoofdpijn.',
      assistantTextTrimmed: 'Sinds wanneer?',
    })
    expect(out).toContain('Prior')
    expect(out).toContain('U: Ik heb hoofdpijn.')
    expect(out).toContain('A: Sinds wanneer?')
  })

  it('appends for ordering_food and supports assistant-only line', () => {
    expect(
      appendCumulativeSpeakLiveMemoryTurn({
        scenarioSlug: 'ordering_food',
        rollingSummaryEnglish: '',
        userTextTrimmed: '',
        assistantTextTrimmed: 'Goedemiddag — wat mag het zijn?',
      })
    ).toContain('A: Goedemiddag')
    expect(
      appendCumulativeSpeakLiveMemoryTurn({
        scenarioSlug: 'ordering_food',
        rollingSummaryEnglish: 'Prior',
        userTextTrimmed: 'Koffie graag.',
        assistantTextTrimmed: 'Met melk?',
      })
    ).toMatch(/Prior/)
    expect(
      appendCumulativeSpeakLiveMemoryTurn({
        scenarioSlug: 'ordering_food',
        rollingSummaryEnglish: 'Prior',
        userTextTrimmed: 'Koffie graag.',
        assistantTextTrimmed: 'Met melk?',
      })
    ).toContain('U: Koffie graag.')
  })
})

describe('parseSpeakLiveState scenarioRuntimeConfig', () => {
  it('round-trips doctor_pharmacy runtime', () => {
    const rc = buildDoctorPharmacyScenario({ level: 'A2', subType: 'doctor_visit', variation: 'symptoms', random: () => 0.2 })
    const state = { ...defaultSpeakLiveState(), scenarioRuntimeConfig: rc }
    const parsed = parseSpeakLiveState(serializeSpeakLiveState(state))
    expect(parsed?.scenarioRuntimeConfig?.id).toBe('doctor_pharmacy')
    expect(parsed?.scenarioRuntimeConfig?.variation).toBe('symptoms')
    expect(parsed?.scenarioRuntimeConfig?.subType).toBe('doctor_visit')
  })

  it('round-trips booking_reservations runtime', () => {
    const rc = buildBookingReservationsScenario({
      level: 'A2',
      subType: 'restaurant_booking',
      variation: 'making_booking',
      random: () => 0.3,
    })
    const state = { ...defaultSpeakLiveState(), scenarioRuntimeConfig: rc }
    const parsed = parseSpeakLiveState(serializeSpeakLiveState(state))
    expect(parsed?.scenarioRuntimeConfig?.id).toBe('booking_reservations')
    expect(parsed?.scenarioRuntimeConfig?.subType).toBe('restaurant_booking')
  })
})
