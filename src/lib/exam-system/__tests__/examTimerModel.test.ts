import { describe, expect, it } from 'vitest'
import { computeFullExamWallRemaining } from '../examTimerModel'

describe('computeFullExamWallRemaining', () => {
  it('counts down elapsed wall seconds from the simulation budget', () => {
    const startedAtMs = 1_000_000
    expect(
      computeFullExamWallRemaining({
        totalEstimateSec: 120,
        startedAtMs,
        nowMs: startedAtMs + 30_000,
      }),
    ).toBe(90)
    expect(
      computeFullExamWallRemaining({
        totalEstimateSec: 120,
        startedAtMs,
        nowMs: startedAtMs + 119_000,
      }),
    ).toBe(1)
    expect(
      computeFullExamWallRemaining({
        totalEstimateSec: 120,
        startedAtMs,
        nowMs: startedAtMs + 200_000,
      }),
    ).toBe(0)
  })
})
