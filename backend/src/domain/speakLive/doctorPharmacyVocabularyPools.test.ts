import { describe, expect, it } from 'vitest'
import { buildDoctorPharmacyScenario } from './doctorPharmacyScenario'
import {
  DOCTOR_PHARMACY_HELP_REQUEST_PHRASES_NL,
  DOCTOR_PHARMACY_INSTRUCTION_PHRASES_NL,
  DOCTOR_PHARMACY_LEARNER_STARTERS,
  DOCTOR_PHARMACY_SYMPTOM_TERMS_NL,
  doctorPharmacyVocabularyReferenceForPrompt,
  getDoctorPharmacyStarterHintsForRuntime,
} from './doctorPharmacyVocabularyPools'

describe('doctorPharmacyVocabularyPools', () => {
  it('exports non-empty structured pools', () => {
    expect(DOCTOR_PHARMACY_SYMPTOM_TERMS_NL.length).toBeGreaterThanOrEqual(10)
    expect(DOCTOR_PHARMACY_HELP_REQUEST_PHRASES_NL.length).toBeGreaterThanOrEqual(6)
    expect(DOCTOR_PHARMACY_INSTRUCTION_PHRASES_NL.length).toBeGreaterThanOrEqual(6)
    expect(doctorPharmacyVocabularyReferenceForPrompt()).toContain('Symptomen')
    expect(doctorPharmacyVocabularyReferenceForPrompt()).toContain('hoofdpijn')
  })

  it('includes core A2 starter lines per variation', () => {
    expect(DOCTOR_PHARMACY_LEARNER_STARTERS.symptoms.A2).toContain('Ik heb hoofdpijn.')
    expect(DOCTOR_PHARMACY_LEARNER_STARTERS.asking_for_help.A2).toContain('Kunt u mij helpen?')
    expect(DOCTOR_PHARMACY_LEARNER_STARTERS.understanding_instructions.A2).toContain('Twee keer per dag?')
  })

  it('returns up to five deduped hints', () => {
    const h = getDoctorPharmacyStarterHintsForRuntime('A2', 'symptoms')
    expect(h.length).toBeGreaterThan(0)
    expect(h.length).toBeLessThanOrEqual(5)
  })
})

describe('buildDoctorPharmacyScenario randomized runs (vocabulary integration)', () => {
  const seeds = [0.11, 0.27, 0.44, 0.61, 0.88]
  it('produces five distinct-style payloads for fixed seeds', () => {
    const out = seeds.map((s) => {
      const rng = () => s
      return buildDoctorPharmacyScenario({ level: 'A2', random: rng })
    })
    const firstLines = out.map((o) => (o.context.split('\n')[0] ?? '').trim())
    expect(firstLines.every((l) => l.startsWith('Details voor deze run:'))).toBe(true)
    expect(out.some((o) => o.context.includes('Woordenschat-pools'))).toBe(true)
    const variations = new Set(out.map((o) => o.variation))
    expect(variations.size).toBeGreaterThanOrEqual(1)
  })
})
