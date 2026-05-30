import { describe, expect, it } from 'vitest'
import type { ScenarioRuntimeConfig } from '../../models/contracts'
import {
  DOCTOR_PHARMACY_GOAL_IDS,
  doctorPharmacyCompletionContractSatisfied,
} from './doctorPharmacyEvaluationContract'
import {
  DOCTOR_PHARMACY_SCENARIO_ID,
  DOCTOR_PHARMACY_SPEAK_LIVE_OPENING_CONTRACT_VERSION,
  buildDoctorPharmacyScenario,
  hydrateDoctorPharmacyLearnerSituationSummary,
  isDoctorPharmacySpeakLiveRuntimeOpeningStale,
  normalizeDoctorPharmacyHealthFocus,
  normalizeDoctorPharmacySubtype,
  normalizeDoctorPharmacyVariation,
} from './doctorPharmacyScenario'

describe('buildDoctorPharmacyScenario', () => {
  it('builds stable runtime for fixed rng and overrides', () => {
    const rng = () => 0.42
    const out = buildDoctorPharmacyScenario({
      level: 'A2',
      subType: 'pharmacy',
      variation: 'asking_for_help',
      healthFocus: 'headache',
      random: rng,
    })
    expect(out.id).toBe(DOCTOR_PHARMACY_SCENARIO_ID)
    expect(out.subType).toBe('pharmacy')
    expect(out.variation).toBe('asking_for_help')
    expect(out.goals.length).toBe(4)
    expect(out.goals.reduce((s, g) => s + g.weight, 0)).toBe(100)
    expect(out.learnerSituationSummary).toMatch(/apotheek|Setting/i)
    expect((out.openingLine ?? '').length).toBeGreaterThan(3)
    expect(out.evaluationContract?.variationId).toBe('asking_for_help')
    expect(out.doctorPharmacyOpeningContractVersion).toBe(DOCTOR_PHARMACY_SPEAK_LIVE_OPENING_CONTRACT_VERSION)
    expect(out.evaluationContract?.completionRequiredPassGoalIds).toEqual([
      DOCTOR_PHARMACY_GOAL_IDS.asking_for_help.askForHelpClearly,
      DOCTOR_PHARMACY_GOAL_IDS.asking_for_help.stateTypeOfHelpNeeded,
    ])
  })

  it('evaluation contract requires confirmation goals for understanding_instructions', () => {
    const out = buildDoctorPharmacyScenario({
      level: 'A2',
      variation: 'understanding_instructions',
      random: () => 0.11,
    })
    expect(out.evaluationContract?.completionRequiredPassGoalIds).toEqual([
      DOCTOR_PHARMACY_GOAL_IDS.understanding_instructions.confirmInstructionClearly,
      DOCTOR_PHARMACY_GOAL_IDS.understanding_instructions.handleTimeOrQuantityLanguage,
    ])
  })

  it('doctorPharmacyCompletionContractSatisfied matches Dutch labels on runtime goals', () => {
    const runtime = buildDoctorPharmacyScenario({
      level: 'A2',
      variation: 'symptoms',
      random: () => 0.2,
    })
    const labels = runtime.goals.map((g) => g.label)
    expect(doctorPharmacyCompletionContractSatisfied(runtime, [labels[0]!, labels[1]!])).toBe(true)
    expect(doctorPharmacyCompletionContractSatisfied(runtime, [labels[0]!])).toBe(false)
  })

  it('isDoctorPharmacySpeakLiveRuntimeOpeningStale when version missing or too old', () => {
    expect(isDoctorPharmacySpeakLiveRuntimeOpeningStale('ordering_food', {})).toBe(false)
    expect(isDoctorPharmacySpeakLiveRuntimeOpeningStale('doctor_pharmacy', null)).toBe(true)
    expect(
      isDoctorPharmacySpeakLiveRuntimeOpeningStale('doctor_pharmacy', {
        scenarioRuntimeConfig: { id: 'doctor_pharmacy' } as ScenarioRuntimeConfig,
      }),
    ).toBe(true)
    const fresh = buildDoctorPharmacyScenario({ level: 'A2', random: () => 0.2 })
    expect(
      isDoctorPharmacySpeakLiveRuntimeOpeningStale('doctor_pharmacy', { scenarioRuntimeConfig: fresh }),
    ).toBe(false)
  })

  it('normalizes subtype, variation, and health focus aliases', () => {
    expect(normalizeDoctorPharmacySubtype('doctor')).toBe('doctor_visit')
    expect(normalizeDoctorPharmacyVariation('help')).toBe('asking_for_help')
    expect(normalizeDoctorPharmacyHealthFocus('hoofdpijn')).toBe('headache')
  })

  it('keeps Details-voor-deze-run on the first line for reliable parsing', () => {
    const out = buildDoctorPharmacyScenario({
      level: 'A2',
      subType: 'clinic_reception',
      variation: 'symptoms',
      random: () => 0.33,
    })
    const first = out.context.split('\n')[0] ?? ''
    expect(first).toMatch(/^Details voor deze run:/)
    const hydrated = hydrateDoctorPharmacyLearnerSituationSummary({ ...out, learnerSituationSummary: '' })
    expect(hydrated.learnerSituationSummary ?? '').toMatch(/Setting:|Jouw situatie/i)
  })
})
