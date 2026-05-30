/**
 * Content engine — request schema tests.
 */

import { describe, it, expect } from 'vitest'
import { generationRequestSchema, batchOptionsSchema } from '../schemas/requests.js'

describe('generationRequestSchema', () => {
  it('accepts valid request', () => {
    const result = generationRequestSchema.safeParse({
      artifact_type: 'VocabularyItem',
      locale: 'nl',
      params: { cefr_level: 'A1', max_items: 10 },
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing locale', () => {
    const result = generationRequestSchema.safeParse({
      artifact_type: 'Dialogue',
      params: {},
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid artifact_type', () => {
    const result = generationRequestSchema.safeParse({
      artifact_type: 'InvalidType',
      locale: 'nl',
      params: {},
    })
    expect(result.success).toBe(false)
  })
})

describe('batchOptionsSchema', () => {
  it('applies defaults', () => {
    const result = batchOptionsSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.chunk_size).toBe(10)
      expect(result.data.concurrency).toBe(3)
    }
  })
})
