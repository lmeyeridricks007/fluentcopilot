/**
 * Content engine — schema validator tests.
 */

import { describe, it, expect } from 'vitest'
import { validateSchema } from '../validators/schemaValidator.js'
import type { VocabularyItem, Dialogue } from '../types/artifacts.js'

describe('validateSchema', () => {
  it('passes for valid VocabularyItem', () => {
    const artifact: VocabularyItem = {
      lemma: 'hallo',
      locale: 'nl',
      cefr_level: 'A1',
      translations: [{ locale: 'en', text: 'hello' }],
    }
    const results = validateSchema(artifact, { locale: 'nl' })
    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('schema')
    expect(results[0].passed).toBe(true)
  })

  it('fails for VocabularyItem missing required lemma', () => {
    const artifact = {
      locale: 'nl',
      cefr_level: 'A1',
      translations: [{ locale: 'en', text: 'hello' }],
    } as unknown as VocabularyItem
    const results = validateSchema(artifact, { locale: 'nl' })
    expect(results).toHaveLength(1)
    expect(results[0].passed).toBe(false)
    expect(results[0].message).toContain('lemma')
  })

  it('passes for valid Dialogue', () => {
    const artifact: Dialogue = {
      scenario_code: 'cafe',
      locale: 'nl',
      turns: [
        { speaker: 'A', text: 'Hallo', translation: 'Hello' },
        { speaker: 'B', text: 'Hallo!', translation: 'Hi!' },
      ],
    }
    const results = validateSchema(artifact, { locale: 'nl' })
    expect(results).toHaveLength(1)
    expect(results[0].passed).toBe(true)
  })

  it('fails for Dialogue with empty turns', () => {
    const artifact: Dialogue = {
      scenario_code: 'cafe',
      locale: 'nl',
      turns: [],
    }
    const results = validateSchema(artifact, { locale: 'nl' })
    expect(results).toHaveLength(1)
    expect(results[0].passed).toBe(false)
  })
})
