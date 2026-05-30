import { describe, expect, it } from 'vitest'
import type { ScenarioConfig } from '../../models/contracts'
import {
  maybeBuildOpinionsDiscussionsSpeakLiveScenarioRuntime,
  parseOpinionsDiscussionsScenarioRuntimeConfig,
  OPINIONS_DISCUSSIONS_SCENARIO_ID,
} from './opinionsDiscussionsScenario'
import { OPINIONS_DISCUSSIONS_GOAL_IDS } from './opinionsDiscussionsEvaluationContract'

const scenarioStub = { slug: OPINIONS_DISCUSSIONS_SCENARIO_ID } as unknown as ScenarioConfig

describe('opinionsDiscussionsScenario', () => {
  it('builds runtime with opinions_discussions id and goals', () => {
    const rc = maybeBuildOpinionsDiscussionsSpeakLiveScenarioRuntime({
      scenario: scenarioStub,
      level: 'A2',
      overrides: { subType: 'casual_opinion', variation: 'agree_disagree' },
    })!
    expect(rc.id).toBe('opinions_discussions')
    expect(rc.goals.map((g) => g.id)).toEqual([
      OPINIONS_DISCUSSIONS_GOAL_IDS.stance,
      OPINIONS_DISCUSSIONS_GOAL_IDS.reasoning,
      OPINIONS_DISCUSSIONS_GOAL_IDS.structure,
    ])
    expect(rc.openingLine?.trim().length).toBeGreaterThan(10)
  })

  it('maybeBuild returns null for other slugs', () => {
    expect(
      maybeBuildOpinionsDiscussionsSpeakLiveScenarioRuntime({
        scenario: { slug: 'small_talk' } as ScenarioConfig,
        level: 'A2',
        overrides: {},
      }),
    ).toBeNull()
  })

  it('parse accepts persisted runtime', () => {
    const r = maybeBuildOpinionsDiscussionsSpeakLiveScenarioRuntime({
      scenario: scenarioStub,
      level: 'B1',
      overrides: { subType: 'work_discussion', variation: 'give_reasons' },
    })
    expect(r).not.toBeNull()
    const parsed = parseOpinionsDiscussionsScenarioRuntimeConfig(r)
    expect(parsed?.id).toBe('opinions_discussions')
  })
})
