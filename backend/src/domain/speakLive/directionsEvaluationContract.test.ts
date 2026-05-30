import { describe, expect, it } from 'vitest'
import { buildDirectionsGettingSomewhereScenario } from './directionsGettingSomewhereScenario'
import {
  directionsCompletionContractSatisfied,
  directionsGoalIsStretchTier,
  DIRECTIONS_GOAL_IDS,
} from './directionsEvaluationContract'

describe('directionsCompletionContractSatisfied', () => {
  it('asking: requires ask + name', () => {
    const rt = buildDirectionsGettingSomewhereScenario({
      level: 'A2',
      subType: 'station',
      variation: 'asking_for_directions',
      random: () => 0.2,
    })
    const ids = DIRECTIONS_GOAL_IDS.asking_for_directions
    const label = (id: string) => rt.goals.find((g) => g.id === id)!.label
    expect(directionsCompletionContractSatisfied(rt, [label(ids.askDirectionDirectly)])).toBe(false)
    expect(
      directionsCompletionContractSatisfied(rt, [label(ids.askDirectionDirectly), label(ids.nameDestinationClearly)])
    ).toBe(true)
  })

  it('understanding: requires handle + (acknowledge OR clarify)', () => {
    const rt = buildDirectionsGettingSomewhereScenario({
      level: 'A2',
      subType: 'pharmacy',
      variation: 'understanding_instructions',
      random: () => 0.3,
    })
    const ids = DIRECTIONS_GOAL_IDS.understanding_instructions
    const L = (id: string) => rt.goals.find((g) => g.id === id)!.label
    expect(directionsCompletionContractSatisfied(rt, [L(ids.handleDirectionalLanguage)])).toBe(false)
    expect(
      directionsCompletionContractSatisfied(rt, [L(ids.handleDirectionalLanguage), L(ids.acknowledgeOrProcessRouteStep)])
    ).toBe(true)
    expect(
      directionsCompletionContractSatisfied(rt, [L(ids.handleDirectionalLanguage), L(ids.askForClarificationIfNeeded)])
    ).toBe(true)
  })

  it('confirming: requires confirm + sequence', () => {
    const rt = buildDirectionsGettingSomewhereScenario({
      level: 'B1',
      subType: 'city_centre',
      variation: 'confirming_route',
      random: () => 0.4,
    })
    const ids = DIRECTIONS_GOAL_IDS.confirming_route
    const L = (id: string) => rt.goals.find((g) => g.id === id)!.label
    expect(directionsCompletionContractSatisfied(rt, [L(ids.confirmRouteCorrectly)])).toBe(false)
    expect(
      directionsCompletionContractSatisfied(rt, [L(ids.confirmRouteCorrectly), L(ids.useSequenceLanguage)])
    ).toBe(true)
  })
})

describe('directionsGoalIsStretchTier', () => {
  it('classifies opening and follow-up as stretch for asking', () => {
    const rt = buildDirectionsGettingSomewhereScenario({
      level: 'A2',
      variation: 'asking_for_directions',
      random: () => 0.1,
    })
    const opening = rt.goals.find((g) => g.id === 'use_polite_or_natural_opening')!.label
    const follow = rt.goals.find((g) => g.id === 'follow_up_or_confirm')!.label
    const ask = rt.goals.find((g) => g.id === 'ask_direction_directly')!.label
    expect(directionsGoalIsStretchTier(opening, 'asking_for_directions')).toBe(true)
    expect(directionsGoalIsStretchTier(follow, 'asking_for_directions')).toBe(true)
    expect(directionsGoalIsStretchTier(ask, 'asking_for_directions')).toBe(false)
  })
})
