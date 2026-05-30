import { describe, expect, it } from 'vitest'
import {
  LOW_CONFIDENCE_FOCUS_FLOOR,
  effectiveWeaknessItemScore,
  incomingConfidenceMultiplier,
} from './learningMemoryMergeScoring'

describe('incomingConfidenceMultiplier', () => {
  it('boosts speak_live audio-backed pronunciation sources over transcript-only', () => {
    const audio = incomingConfidenceMultiplier('live_word_assessment', 'speak_live')
    const transcript = incomingConfidenceMultiplier('live_transcript_coaching', 'speak_live')
    const uncertain = incomingConfidenceMultiplier('wrong_word_uncertain', 'speak_live')
    expect(audio).toBe(1)
    expect(transcript).toBeGreaterThan(uncertain)
    expect(audio).toBeGreaterThan(transcript)
  })

  it('read_aloud pronunciation path is stronger than generic read_aloud', () => {
    const strong = incomingConfidenceMultiplier('segment_pronunciation', 'read_aloud')
    const weak = incomingConfidenceMultiplier('other', 'read_aloud')
    expect(strong).toBeGreaterThan(weak)
  })
})

describe('effectiveWeaknessItemScore', () => {
  it('penalizes improving rows so low-confidence noise cannot dominate via recovery alone', () => {
    const base = { severityScore: 2, confidence: 0.55, occurrences: 5, recoveryScore: 0.3 }
    const improving = { ...base, improving: true as const }
    expect(effectiveWeaknessItemScore(improving)).toBeLessThan(effectiveWeaknessItemScore({ ...base, improving: false }))
  })

  it('respects LOW_CONFIDENCE_FOCUS_FLOOR usage in callers (document threshold)', () => {
    expect(LOW_CONFIDENCE_FOCUS_FLOOR).toBeGreaterThan(0.3)
    expect(LOW_CONFIDENCE_FOCUS_FLOOR).toBeLessThan(0.5)
  })
})
