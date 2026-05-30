import { describe, expect, it } from 'vitest'
import { buildPublicTransportScenario } from './publicTransportScenario'
import { buildPublicTransportSpeakLiveSceneContract } from './publicTransportSpeakLivePrompt'
import { buildPublicTransportSpeakLiveLlmContract } from './publicTransportEvaluationContract'
import { scenarioContextPartial } from '../../prompts/partials/scenarioContext'
import type { ScenarioConfig } from '../../models/contracts'

function scenarioConfigFromRuntime(runtime: ReturnType<typeof buildPublicTransportScenario>): ScenarioConfig {
  return {
    id: 'sc-pt',
    slug: 'train-station',
    title: 'Train station',
    description: runtime.learnerSituationSummary ?? '',
    goals: runtime.goals.map((g) => g.label),
    starterSuggestions: runtime.hints ?? [],
    userRole: 'Reiziger',
    difficultyBand: runtime.level,
    tags: [],
    allowedModes: ['guided'],
    openingMessage: runtime.openingLine ?? null,
    runtimeConfig: runtime,
  }
}

describe('buildPublicTransportSpeakLiveSceneContract', () => {
  it('includes subtype, variation, level, and friction sections for four combinations', () => {
    const cases = [
      { level: 'A2' as const, subType: 'train' as const, variation: 'route_and_platform' as const, want: ['TRAIN', 'route_and_platform', 'Level: A2', 'Light friction'] },
      { level: 'A1' as const, subType: 'bus' as const, variation: 'buying_ticket' as const, want: ['BUS', 'buying_ticket', 'Level: A1'] },
      { level: 'B1' as const, subType: 'tram' as const, variation: 'delays_and_disruptions' as const, want: ['TRAM', 'delays_and_disruptions', 'Level: B1'] },
      { level: 'A2' as const, subType: 'metro' as const, variation: 'route_and_platform' as const, want: ['METRO', 'route_and_platform'] },
    ] as const

    for (const { level, subType, variation, want } of cases) {
      const rt = buildPublicTransportScenario({
        level,
        subType,
        variation,
        destination: 'Utrecht Centraal',
        random: () => 0.05,
      })
      const block = buildPublicTransportSpeakLiveSceneContract(rt)
      for (const fragment of want) {
        expect(block).toContain(fragment)
      }
      expect(block).toContain('Utrecht Centraal')
    }
  })

  it('scenarioContextPartial chains scene contract and evaluation contract for train-station public_transport', () => {
    const rt = buildPublicTransportScenario({
      level: 'A2',
      subType: 'train',
      variation: 'buying_ticket',
      destination: 'Rotterdam',
      random: () => 0.1,
    })
    const partial = scenarioContextPartial(scenarioConfigFromRuntime(rt))
    expect(partial).toContain('--- Public transport · system role')
    expect(partial).toContain('--- Variation: buying_ticket ---')
    expect(partial).toContain('--- Public transport (Speak Live) · evaluation contract')
    expect(buildPublicTransportSpeakLiveLlmContract(rt)).toContain('Weighted goals')
  })
})
