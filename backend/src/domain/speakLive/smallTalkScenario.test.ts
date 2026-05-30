import { describe, expect, it } from 'vitest'
import {
  buildSmallTalkScenario,
  maybeBuildSmallTalkSpeakLiveScenarioRuntime,
  parseSmallTalkScenarioRuntimeConfig,
  SMALL_TALK_SCENARIO_ID,
} from './smallTalkScenario'
import { SMALL_TALK_GOAL_IDS } from './smallTalkEvaluationContract'

describe('smallTalkScenario', () => {
  it('builds runtime with flow-first goals and evaluation contract', () => {
    const out = buildSmallTalkScenario({
      level: 'A2',
      subType: 'casual_chat',
      variation: 'talking_about_weekend',
      random: () => 0.42,
    })
    expect(out.id).toBe(SMALL_TALK_SCENARIO_ID)
    expect(out.goals.length).toBe(3)
    expect(out.goals.some((g) => g.id === SMALL_TALK_GOAL_IDS.stayInFlow)).toBe(true)
    expect(out.evaluationContract?.completionRequiredPassGoalIds).toEqual([SMALL_TALK_GOAL_IDS.stayInFlow])
    expect(out.openingLine?.length).toBeGreaterThan(5)
  })

  it('maybeBuild returns null for other slugs', () => {
    const scenario = { slug: 'ordering_food' } as import('../../models/contracts').ScenarioConfig
    expect(
      maybeBuildSmallTalkSpeakLiveScenarioRuntime({
        scenario,
        level: 'A2',
        overrides: null,
      }),
    ).toBeNull()
  })

  it('parse accepts persisted runtime', () => {
    const rt = buildSmallTalkScenario({ level: 'B1', random: () => 0.1 })
    expect(parseSmallTalkScenarioRuntimeConfig(rt)?.id).toBe(SMALL_TALK_SCENARIO_ID)
  })
})
