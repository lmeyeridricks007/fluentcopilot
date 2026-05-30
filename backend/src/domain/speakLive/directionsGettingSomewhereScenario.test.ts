import type { ScenarioRuntimeConfig } from '../../models/contracts'
import { describe, expect, it } from 'vitest'
import {
  buildDirectionsGettingSomewhereScenario,
  DIRECTIONS_GETTING_SOMEWHERE_SCENARIO_ID,
  DIRECTIONS_SPEAK_LIVE_OPENING_CONTRACT_VERSION,
  DIRECTIONS_VARIATIONS,
  isDirectionsSpeakLiveRuntimeOpeningStale,
} from './directionsGettingSomewhereScenario'

describe('buildDirectionsGettingSomewhereScenario', () => {
  it('builds runtime with weighted goals for each variation', () => {
    for (const variation of DIRECTIONS_VARIATIONS) {
      const rng = () => 0.3
      const out = buildDirectionsGettingSomewhereScenario({
        level: 'A2',
        subType: 'station',
        variation,
        random: rng,
      })
      expect(out.id).toBe(DIRECTIONS_GETTING_SOMEWHERE_SCENARIO_ID)
      expect(out.directionsOpeningContractVersion).toBe(DIRECTIONS_SPEAK_LIVE_OPENING_CONTRACT_VERSION)
      expect(out.directionsLearnerSpeaksFirst).toBe(true)
      expect(out.openingLine).toBeUndefined()
      expect(out.goals.length).toBe(4)
      const sum = out.goals.reduce((s, g) => s + g.weight, 0)
      expect(sum).toBe(100)
      expect(out.context.length).toBeGreaterThan(40)
      expect(out.learnerSituationSummary?.length).toBeGreaterThan(20)
      expect(out.learnerSituationSummary).toMatch(/U begint/i)
    }
  })

  it('respects destination override', () => {
    const out = buildDirectionsGettingSomewhereScenario({
      level: 'A1',
      subType: 'pharmacy',
      variation: 'asking_for_directions',
      random: () => 0.99,
    })
    expect(out.subType).toBe('pharmacy')
    expect(out.variation).toBe('asking_for_directions')
  })

  it('opening variant examples are post-learner only (include marker, no assistant-first scripts)', () => {
    const out = buildDirectionsGettingSomewhereScenario({
      level: 'A2',
      subType: 'bus_stop',
      variation: 'understanding_instructions',
      random: () => 0.41,
    })
    const variants = out.assistantBehavior?.openingVariants ?? []
    const joined = variants.join('\n')
    expect(joined).toMatch(/geen assistentbericht|niet in de thread|ná de eerste zin/i)
    expect(joined).not.toMatch(/^Waar wilt u naartoe\?$/m)
  })

  it('first opening variant row explains learner-first thread', () => {
    const out = buildDirectionsGettingSomewhereScenario({
      level: 'A2',
      subType: 'bus_stop',
      variation: 'understanding_instructions',
      random: () => 0.22,
    })
    const first = out.assistantBehavior?.openingVariants?.[0] ?? ''
    expect(first).toMatch(/---/)
    expect(first.toLowerCase()).toMatch(/oefenaar|assistent|thread|nog geen/)
  })
})

describe('isDirectionsSpeakLiveRuntimeOpeningStale', () => {
  it('returns false for non-directions slugs', () => {
    expect(isDirectionsSpeakLiveRuntimeOpeningStale('ordering_food', null)).toBe(false)
  })

  it('returns true when state is missing or runtime config is missing', () => {
    expect(isDirectionsSpeakLiveRuntimeOpeningStale('directions_getting_somewhere', null)).toBe(true)
    expect(isDirectionsSpeakLiveRuntimeOpeningStale('directions_getting_somewhere', {})).toBe(true)
  })

  it('returns true when contract version is absent or below current', () => {
    expect(
      isDirectionsSpeakLiveRuntimeOpeningStale('directions_getting_somewhere', {
        scenarioRuntimeConfig: {
          id: DIRECTIONS_GETTING_SOMEWHERE_SCENARIO_ID,
          directionsLearnerSpeaksFirst: true,
        } as ScenarioRuntimeConfig,
      })
    ).toBe(true)
    expect(
      isDirectionsSpeakLiveRuntimeOpeningStale('directions_getting_somewhere', {
        scenarioRuntimeConfig: {
          id: DIRECTIONS_GETTING_SOMEWHERE_SCENARIO_ID,
          directionsOpeningContractVersion: 2,
          directionsLearnerSpeaksFirst: true,
        } as ScenarioRuntimeConfig,
      })
    ).toBe(true)
  })

  it('returns true when learner-first flag is missing', () => {
    expect(
      isDirectionsSpeakLiveRuntimeOpeningStale('directions_getting_somewhere', {
        scenarioRuntimeConfig: {
          id: DIRECTIONS_GETTING_SOMEWHERE_SCENARIO_ID,
          directionsOpeningContractVersion: DIRECTIONS_SPEAK_LIVE_OPENING_CONTRACT_VERSION,
        } as ScenarioRuntimeConfig,
      })
    ).toBe(true)
  })

  it('returns false when contract version and learner-first flag match current', () => {
    expect(
      isDirectionsSpeakLiveRuntimeOpeningStale('directions_getting_somewhere', {
        scenarioRuntimeConfig: {
          id: DIRECTIONS_GETTING_SOMEWHERE_SCENARIO_ID,
          directionsOpeningContractVersion: DIRECTIONS_SPEAK_LIVE_OPENING_CONTRACT_VERSION,
          directionsLearnerSpeaksFirst: true,
        } as ScenarioRuntimeConfig,
      })
    ).toBe(false)
  })
})
