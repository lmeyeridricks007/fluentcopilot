import { describe, expect, it } from 'vitest'
import { detectLanguageCoachWeaknessSignals } from './languageCoachWeaknessSignals'

/**
 * Focused suite for the perfectum / imperfectum rules added to fix the "report not specific"
 * complaint where Dutch perfectum struggles never produced a `past_tense` tag because the
 * legacy rule only fired on English time markers ("yesterday", "tomorrow"). These tests pin
 * the new high-precision rules so we don't regress them while keeping false positives low.
 */
describe('detectLanguageCoachWeaknessSignals — Dutch perfectum / imperfectum', () => {
  describe('wrong auxiliary: hebben with a zijn-only participle', () => {
    it('flags "ik heb gegaan naar de winkel" as past_tense', () => {
      const { tags } = detectLanguageCoachWeaknessSignals('Ik heb gegaan naar de winkel.')
      expect(tags).toContain('past_tense')
    })

    it('flags "we hebben geweest in Parijs" as past_tense', () => {
      const { tags } = detectLanguageCoachWeaknessSignals('We hebben geweest in Parijs vorige week.')
      expect(tags).toContain('past_tense')
    })

    it('flags "hij heeft gebleven thuis" as past_tense', () => {
      const { tags } = detectLanguageCoachWeaknessSignals('Hij heeft gebleven thuis vandaag.')
      expect(tags).toContain('past_tense')
    })

    it('flags "ik heb opgestaan vroeg" as past_tense', () => {
      const { tags } = detectLanguageCoachWeaknessSignals('Ik heb opgestaan heel vroeg vanmorgen.')
      expect(tags).toContain('past_tense')
    })

    it('does NOT flag the correct "ik ben gegaan naar de winkel"', () => {
      const { tags } = detectLanguageCoachWeaknessSignals('Ik ben gegaan naar de winkel.')
      expect(tags).not.toContain('past_tense')
    })
  })

  describe('wrong auxiliary: zijn with a hebben-only participle', () => {
    it('flags "ik ben gewerkt vandaag" as past_tense', () => {
      const { tags } = detectLanguageCoachWeaknessSignals('Ik ben gewerkt vandaag op kantoor.')
      expect(tags).toContain('past_tense')
    })

    it('flags "we zijn gegeten in dat restaurant" as past_tense', () => {
      const { tags } = detectLanguageCoachWeaknessSignals('We zijn gegeten in dat nieuwe restaurant.')
      expect(tags).toContain('past_tense')
    })

    it('flags "ik ben geleerd Nederlands" as past_tense', () => {
      const { tags } = detectLanguageCoachWeaknessSignals('Ik ben geleerd Nederlands twee jaar lang.')
      expect(tags).toContain('past_tense')
    })

    it('does NOT flag the correct "ik heb gewerkt vandaag"', () => {
      const { tags } = detectLanguageCoachWeaknessSignals('Ik heb vandaag gewerkt op kantoor.')
      expect(tags).not.toContain('past_tense')
    })
  })

  describe('bare infinitive in perfectum slot', () => {
    it('flags "ik heb werken" as past_tense', () => {
      const { tags } = detectLanguageCoachWeaknessSignals('Ik heb werken op kantoor vandaag.')
      expect(tags).toContain('past_tense')
    })

    it('flags "we hebben eten in een restaurant" as past_tense', () => {
      const { tags } = detectLanguageCoachWeaknessSignals('We hebben eten in een leuk restaurant.')
      expect(tags).toContain('past_tense')
    })

    it('does NOT flag a normal modal + infinitive ("ik wil werken")', () => {
      const { tags } = detectLanguageCoachWeaknessSignals('Ik wil werken bij dat bedrijf.')
      expect(tags).not.toContain('past_tense')
    })
  })

  describe('present-tense verb with explicit past time marker', () => {
    it('flags "gisteren ga ik naar de winkel" as past_tense', () => {
      const { tags } = detectLanguageCoachWeaknessSignals('Gisteren ga ik naar de winkel.')
      expect(tags).toContain('past_tense')
    })

    it('flags "ik werk vorige week heel hard" as past_tense', () => {
      const { tags } = detectLanguageCoachWeaknessSignals('Ik werk vorige week heel hard.')
      expect(tags).toContain('past_tense')
    })

    it('does NOT flag "gisteren ben ik naar de winkel gegaan" (correct perfectum)', () => {
      const { tags } = detectLanguageCoachWeaknessSignals('Gisteren ben ik naar de winkel gegaan.')
      expect(tags).not.toContain('past_tense')
    })

    it('does NOT flag "gisteren werkte ik heel hard" (correct imperfectum)', () => {
      const { tags } = detectLanguageCoachWeaknessSignals('Gisteren werkte ik heel hard.')
      expect(tags).not.toContain('past_tense')
    })
  })

  describe('English past-tense reach', () => {
    it('flags "i went to the store yesterday" as past_tense + english_fallback', () => {
      const { tags } = detectLanguageCoachWeaknessSignals('I went to the store yesterday.')
      expect(tags).toContain('past_tense')
      expect(tags).toContain('english_fallback')
    })

    it('flags "i have been to Amsterdam" as past_tense + english_fallback', () => {
      const { tags } = detectLanguageCoachWeaknessSignals('I have been to Amsterdam two times.')
      expect(tags).toContain('past_tense')
      expect(tags).toContain('english_fallback')
    })
  })

  describe('legacy English-time-marker rule (regression guard)', () => {
    it('still flags "yesterday I go to the shop" as past_tense', () => {
      const { tags } = detectLanguageCoachWeaknessSignals('yesterday I go to the shop')
      expect(tags).toContain('past_tense')
    })

    it('does NOT flag "yesterday ik ben geweest" (learner already used Dutch past)', () => {
      const { tags } = detectLanguageCoachWeaknessSignals('yesterday ik ben geweest in Utrecht.')
      expect(tags).not.toContain('past_tense')
    })
  })

  describe('cold-start / no-text safety', () => {
    it('returns empty tags for empty input', () => {
      const out = detectLanguageCoachWeaknessSignals('')
      expect(out.tags).toEqual([])
      expect(out.newFactLinesEnglish).toEqual([])
      expect(out.focusChip).toBeNull()
    })

    it('returns empty tags for whitespace-only input', () => {
      const { tags } = detectLanguageCoachWeaknessSignals('   \t  \n')
      expect(tags).toEqual([])
    })
  })

  describe('focus chip for past_tense', () => {
    it('emits "verleden tijd" as the focus chip when past_tense is the top tag', () => {
      const { focusChip } = detectLanguageCoachWeaknessSignals('Ik heb gegaan naar Amsterdam vorige week.')
      expect(focusChip).toBe('verleden tijd')
    })
  })
})
