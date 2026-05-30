import { describe, expect, it } from 'vitest'
import type { ScenarioConfig } from '../../models/contracts'
import {
  STORYTELLING_SCENARIO_ID,
  maybeBuildStorytellingSpeakLiveScenarioRuntime,
  parseStorytellingScenarioRuntimeConfig,
} from './storytellingScenario'
import { STORYTELLING_GOAL_IDS } from './storytellingEvaluationContract'

const scenarioStub = { slug: STORYTELLING_SCENARIO_ID } as unknown as ScenarioConfig

describe('storytellingScenario', () => {
  it('builds runtime with storytelling id and arc goals', () => {
    const r = maybeBuildStorytellingSpeakLiveScenarioRuntime({
      scenario: scenarioStub,
      level: 'A2',
      overrides: {},
    })
    expect(r).not.toBeNull()
    expect(r!.id).toBe(STORYTELLING_SCENARIO_ID)
    expect(r!.goals.map((g) => g.id)).toEqual([
      STORYTELLING_GOAL_IDS.opening,
      STORYTELLING_GOAL_IDS.middle,
      STORYTELLING_GOAL_IDS.ending,
    ])
  })

  it('maybeBuild returns null for other slugs', () => {
    expect(
      maybeBuildStorytellingSpeakLiveScenarioRuntime({
        scenario: { slug: 'small_talk' } as ScenarioConfig,
        level: 'A2',
        overrides: {},
      }),
    ).toBeNull()
  })

  it('parse accepts persisted storytelling runtime', () => {
    const r = maybeBuildStorytellingSpeakLiveScenarioRuntime({
      scenario: scenarioStub,
      level: 'A2',
      overrides: { subType: 'daily_story', variation: 'what_you_did_yesterday' },
    })
    expect(r).not.toBeNull()
    const parsed = parseStorytellingScenarioRuntimeConfig(r)
    expect(parsed?.id).toBe(STORYTELLING_SCENARIO_ID)
  })
})
