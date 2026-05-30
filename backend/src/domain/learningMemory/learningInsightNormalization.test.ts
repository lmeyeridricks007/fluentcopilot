import { describe, expect, it } from 'vitest'
import {
  dedupeEvidenceItems,
  mapIssueSeverity,
  normalizePatternId,
  normalizePronunciationTarget,
  normalizeWordKey,
} from './learningInsightNormalization'

describe('learningInsightNormalization', () => {
  it('normalizeWordKey lowercases and trims', () => {
    expect(normalizeWordKey('  Het STATION  ')).toBe('het station')
  })

  it('normalizePatternId maps structural hints to stable ids', () => {
    expect(normalizePatternId('Missing preposition before the station name')).toBe('grammar_missing_or_weak_preposition')
    expect(normalizePatternId('xyz unknown phrase')).toMatch(/^pat_xyz/)
  })

  it('normalizePronunciationTarget combines word and family', () => {
    expect(normalizePronunciationTarget('Station', 'stress')).toContain('station')
    expect(normalizePronunciationTarget('Station', 'stress')).toContain('stress')
  })

  it('mapIssueSeverity respects labels', () => {
    expect(mapIssueSeverity({ label: 'high' })).toBe(3)
    expect(mapIssueSeverity({ label: 'low' })).toBe(1)
  })

  it('dedupeEvidenceItems preserves order', () => {
    expect(dedupeEvidenceItems(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c'])
  })
})
