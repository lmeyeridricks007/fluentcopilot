import { describe, expect, it } from 'vitest'
import {
  normalizeReferenceTtsCacheText,
  referenceTtsCacheKey,
} from './speakLiveReferenceTtsCache'

describe('normalizeReferenceTtsCacheText', () => {
  it('trims, NFC, and collapses line breaks without lowercasing', () => {
    expect(normalizeReferenceTtsCacheText('  Hoi,\nwereld  ')).toBe('Hoi, wereld')
    expect(normalizeReferenceTtsCacheText('Eén')).toBe('Eén')
  })
})

describe('referenceTtsCacheKey', () => {
  it('is deterministic for the same tuple', () => {
    const a = referenceTtsCacheKey({
      language: 'nl',
      voiceId: 'nl-NL-FennaNeural',
      normalizedText: 'Goedemorgen',
      ttsProvider: 'azure',
      ttsVersion: '1|expr=off',
    })
    const b = referenceTtsCacheKey({
      language: 'nl',
      voiceId: 'nl-NL-FennaNeural',
      normalizedText: 'Goedemorgen',
      ttsProvider: 'azure',
      ttsVersion: '1|expr=off',
    })
    expect(a).toBe(b)
    expect(a).toMatch(/^[a-f0-9]{64}$/)
  })

  it('differs when voice changes', () => {
    const base = {
      language: 'nl',
      normalizedText: 'Hallo',
      ttsProvider: 'azure' as const,
      ttsVersion: '1',
    }
    const k1 = referenceTtsCacheKey({ ...base, voiceId: 'nl-NL-FennaNeural' })
    const k2 = referenceTtsCacheKey({ ...base, voiceId: 'nl-NL-ColetteNeural' })
    expect(k1).not.toBe(k2)
  })

  it('differs when language changes', () => {
    const base = {
      voiceId: 'nova',
      normalizedText: 'Hallo',
      ttsProvider: 'openai' as const,
      ttsVersion: '1|m=tts-1|sp=0.9',
    }
    expect(referenceTtsCacheKey({ ...base, language: 'nl' })).not.toBe(
      referenceTtsCacheKey({ ...base, language: 'de' }),
    )
  })
})
