import { describe, expect, it } from 'vitest'
import { mapDifficultyBandToCefr } from './trainStationLiveSessionModel'

describe('mapDifficultyBandToCefr', () => {
  it('maps A1 / B1 / default A2', () => {
    expect(mapDifficultyBandToCefr('A1 beginner')).toBe('A1')
    expect(mapDifficultyBandToCefr('B1+')).toBe('B1')
    expect(mapDifficultyBandToCefr('A2')).toBe('A2')
    expect(mapDifficultyBandToCefr(undefined)).toBe('A2')
  })
})
