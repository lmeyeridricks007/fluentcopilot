/**
 * Content engine — pipeline stub tests.
 */

import { describe, it, expect } from 'vitest'
import { StubGenerationPipeline } from '../pipelines/orchestrator.js'
import type { GenerationRequest } from '../types/requests.js'

describe('StubGenerationPipeline', () => {
  const pipeline = new StubGenerationPipeline()

  it('returns success for valid request', async () => {
    const request: GenerationRequest = {
      artifact_type: 'VocabularyItem',
      locale: 'nl',
      params: { cefr_level: 'A1', max_items: 5 },
    }
    const result = await pipeline.run(request)
    expect(result.success).toBe(true)
    expect(result.stored_artifacts).toEqual([])
  })

  it('returns failure when locale missing', async () => {
    const request = {
      artifact_type: 'Dialogue',
      params: { scenario_code: 'cafe' },
    } as unknown as GenerationRequest
    const result = await pipeline.run(request)
    expect(result.success).toBe(false)
    expect(result.errors).toBeDefined()
    expect(result.errors?.length).toBeGreaterThan(0)
  })
})
