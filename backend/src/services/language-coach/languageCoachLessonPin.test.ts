import { describe, expect, it } from 'vitest'
import {
  tryExtractPinnedLessonFocusFromLearnerTurn,
  updateLearnerPinnedLessonFocus,
  wantsToClearPinnedLessonFocus,
} from './languageCoachLessonPin'

describe('languageCoachLessonPin', () => {
  it('extracts English focus phrases', () => {
    expect(tryExtractPinnedLessonFocusFromLearnerTurn('Please focus on er.')).toBe('er')
    expect(tryExtractPinnedLessonFocusFromLearnerTurn("Let's work on word order")).toBe('word order')
  })

  it('extracts Dutch focus phrases', () => {
    expect(tryExtractPinnedLessonFocusFromLearnerTurn('Ik wil oefenen met de partikel er')).toBe('de partikel er')
    expect(tryExtractPinnedLessonFocusFromLearnerTurn('Werk aan woordvolgorde vandaag')).toBe('woordvolgorde vandaag')
  })

  it('rejects generic captures', () => {
    expect(tryExtractPinnedLessonFocusFromLearnerTurn('focus on it')).toBeNull()
  })

  it('clears on explicit move-on', () => {
    expect(wantsToClearPinnedLessonFocus("Let's talk about something else")).toBe(true)
    expect(wantsToClearPinnedLessonFocus('Ik wil het over iets anders hebben')).toBe(true)
    expect(updateLearnerPinnedLessonFocus('er', 'something else please')).toBeNull()
  })

  it('keeps previous pin when line is unrelated', () => {
    expect(updateLearnerPinnedLessonFocus('particle er', 'Ik vind het leuk.')).toBe('particle er')
  })
})
