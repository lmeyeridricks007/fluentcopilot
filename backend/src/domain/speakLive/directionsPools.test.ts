import { describe, expect, it } from 'vitest'
import {
  DIRECTIONS_DESTINATION_TYPES,
  buildDirectionsGettingSomewhereScenario,
} from './directionsGettingSomewhereScenario'
import {
  DIRECTIONS_POOL_CITY_SOCIAL,
  DIRECTIONS_POOL_DAILY_LIFE,
  DIRECTIONS_POOL_TRANSPORT,
  getDirectionsStarterPhrases,
  pickDirectionsDestinationFromPools,
} from './directionsPools'

describe('directionsPools', () => {
  it('picks destinations that are valid scenario subTypes', () => {
    for (let i = 0; i < 40; i++) {
      const rng = () => (Math.sin(i) * 10000) % 1 * 0.5 + 0.25
      const raw = pickDirectionsDestinationFromPools(rng)
      expect((DIRECTIONS_DESTINATION_TYPES as readonly string[]).includes(raw)).toBe(true)
    }
  })

  it('randomized scenario uses pool destinations when no override', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 60; i++) {
      const rt = buildDirectionsGettingSomewhereScenario({ level: 'A2', random: Math.random })
      seen.add(rt.subType)
    }
    expect(seen.size).toBeGreaterThan(4)
  })

  it('union of pools covers all direction destinations', () => {
    const union = new Set([...DIRECTIONS_POOL_TRANSPORT, ...DIRECTIONS_POOL_DAILY_LIFE, ...DIRECTIONS_POOL_CITY_SOCIAL])
    for (const d of DIRECTIONS_DESTINATION_TYPES) {
      expect(union.has(d)).toBe(true)
    }
  })

  it('returns starters for each variation and level band', () => {
    for (const v of ['asking_for_directions', 'understanding_instructions', 'confirming_route'] as const) {
      for (const lv of ['A1', 'A2', 'B1'] as const) {
        const s = getDirectionsStarterPhrases(lv, v)
        expect(s.length).toBeGreaterThanOrEqual(4)
        expect(s.every((x) => x.trim().length > 0)).toBe(true)
      }
    }
  })
})
