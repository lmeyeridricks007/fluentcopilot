import { describe, expect, it } from 'vitest'
import {
  accumulateReferenceTtsDiagFromAttempt,
  type SpeakLiveReferenceTtsDiagCounters,
} from './liveSessionEvaluationOrchestrator'

describe('accumulateReferenceTtsDiagFromAttempt', () => {
  function fresh(): SpeakLiveReferenceTtsDiagCounters {
    return {
      referenceTtsRequestedCount: 0,
      referenceTtsCacheHits: 0,
      referenceTtsCacheMisses: 0,
      referenceTtsGeneratedCount: 0,
    }
  }

  it('counts hits and misses with generated only on successful non-cached synthesis', () => {
    const acc = fresh()
    accumulateReferenceTtsDiagFromAttempt(acc, { ok: true, cached: true })
    accumulateReferenceTtsDiagFromAttempt(acc, { ok: true, cached: false })
    accumulateReferenceTtsDiagFromAttempt(acc, { ok: true, cached: true })
    expect(acc).toEqual({
      referenceTtsRequestedCount: 3,
      referenceTtsCacheHits: 2,
      referenceTtsCacheMisses: 1,
      referenceTtsGeneratedCount: 1,
    })
  })

  it('counts failed attempts as requested + miss without generated', () => {
    const acc = fresh()
    accumulateReferenceTtsDiagFromAttempt(acc, { ok: false })
    accumulateReferenceTtsDiagFromAttempt(acc, { ok: true, cached: false })
    expect(acc.referenceTtsRequestedCount).toBe(2)
    expect(acc.referenceTtsCacheMisses).toBe(2)
    expect(acc.referenceTtsGeneratedCount).toBe(1)
    expect(acc.referenceTtsCacheHits).toBe(0)
  })
})
