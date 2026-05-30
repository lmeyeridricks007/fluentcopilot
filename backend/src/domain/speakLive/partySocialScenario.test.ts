import { describe, expect, it } from 'vitest'
import type { ScenarioConfig } from '../../models/contracts'
import {
  buildPartySocialScenario,
  maybeBuildPartySocialSpeakLiveScenarioRuntime,
  parsePartySocialScenarioRuntimeConfig,
  PARTY_SOCIAL_SCENARIO_ID,
} from './partySocialScenario'
import { PARTY_SOCIAL_GOAL_IDS } from './partySocialEvaluationContract'

const partyScenarioStub = { slug: PARTY_SOCIAL_SCENARIO_ID } as unknown as ScenarioConfig

describe('partySocialScenario', () => {
  it('builds runtime with party id and goals', () => {
    const rng = () => 0.3
    const r = buildPartySocialScenario({ level: 'A2', random: rng })
    expect(r.id).toBe(PARTY_SOCIAL_SCENARIO_ID)
    expect(r.goals.map((g) => g.id)).toEqual([
      PARTY_SOCIAL_GOAL_IDS.flow,
      PARTY_SOCIAL_GOAL_IDS.questions,
      PARTY_SOCIAL_GOAL_IDS.energy,
    ])
    expect((r.openingLine ?? '').length).toBeGreaterThan(5)
  })

  it('maybeBuild returns null for other scenarios', () => {
    expect(
      maybeBuildPartySocialSpeakLiveScenarioRuntime({
        scenario: { slug: 'small_talk' } as unknown as ScenarioConfig,
        level: 'A2',
        overrides: null,
      }),
    ).toBeNull()
  })

  it('maybeBuild returns runtime for party_social slug', () => {
    const r = maybeBuildPartySocialSpeakLiveScenarioRuntime({
      scenario: partyScenarioStub,
      level: 'A2',
      overrides: null,
    })
    expect(r?.id).toBe(PARTY_SOCIAL_SCENARIO_ID)
  })

  it('parsePartySocialScenarioRuntimeConfig accepts serialized shape', () => {
    const r = buildPartySocialScenario({ level: 'A1', subType: 'house_party', variation: 'asking_questions' })
    const parsed = parsePartySocialScenarioRuntimeConfig(r)
    expect(parsed?.subType).toBe('house_party')
    expect(parsed?.variation).toBe('asking_questions')
  })
})
