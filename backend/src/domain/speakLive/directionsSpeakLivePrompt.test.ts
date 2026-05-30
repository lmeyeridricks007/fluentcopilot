import { describe, expect, it } from 'vitest'
import { buildDirectionsGettingSomewhereScenario } from './directionsGettingSomewhereScenario'
import {
  buildDirectionsSpeakLiveLlmContract,
  buildDirectionsSpeakLiveMicroDirective,
  buildDirectionsSpeakLiveUltraLeanInsert,
} from '../../prompts/partials/directionsSpeakLivePrompt'

describe('directionsSpeakLivePrompt', () => {
  it('builds non-empty contract for each variation', () => {
    for (const variation of ['asking_for_directions', 'understanding_instructions', 'confirming_route'] as const) {
      const rt = buildDirectionsGettingSomewhereScenario({
        level: 'A2',
        subType: 'station',
        variation,
        random: () => 0.5,
      })
      const c = buildDirectionsSpeakLiveLlmContract(rt)
      expect(c.length).toBeGreaterThan(200)
      expect(c).toContain('Directions scenario')
      expect(c).toContain(variation)
    }
  })

  it('micro directive stays compact', () => {
    const rt = buildDirectionsGettingSomewhereScenario({
      level: 'A1',
      subType: 'pharmacy',
      variation: 'asking_for_directions',
      random: () => 0.1,
    })
    const m = buildDirectionsSpeakLiveMicroDirective(rt)
    expect(m.length).toBeLessThanOrEqual(400)
    expect(m).toContain('Dir:')
  })

  it('ultra-lean insert respects max length', () => {
    const rt = buildDirectionsGettingSomewhereScenario({
      level: 'B1',
      subType: 'city_centre',
      variation: 'understanding_instructions',
      random: () => 0.2,
    })
    const u = buildDirectionsSpeakLiveUltraLeanInsert(rt)
    expect(u.length).toBeLessThanOrEqual(902)
  })
})
