import { describe, expect, it } from 'vitest'
import { SKILL_SCORE_STATE_THRESHOLDS, scoreToState } from './skillScoreStateMapping'

describe('skillScoreStateMapping', () => {
  it('exposes ordered thresholds', () => {
    expect(SKILL_SCORE_STATE_THRESHOLDS.needsWorkMax).toBeLessThan(SKILL_SCORE_STATE_THRESHOLDS.buildingMax)
    expect(SKILL_SCORE_STATE_THRESHOLDS.buildingMax).toBeLessThan(SKILL_SCORE_STATE_THRESHOLDS.improvingMax)
    expect(SKILL_SCORE_STATE_THRESHOLDS.improvingMax).toBeLessThan(SKILL_SCORE_STATE_THRESHOLDS.solidMax)
  })

  it('clamps edge scores into states', () => {
    expect(scoreToState(0)).toBe('needs_work')
    expect(scoreToState(100)).toBe('strong')
  })
})
