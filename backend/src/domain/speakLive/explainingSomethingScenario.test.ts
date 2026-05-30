import { describe, expect, it } from 'vitest'
import type { ScenarioConfig } from '../../models/contracts'
import {
  buildExplainingSomethingScenario,
  EXPLAINING_SOMETHING_SCENARIO_ID,
  maybeBuildExplainingSomethingSpeakLiveScenarioRuntime,
  parseExplainingSomethingScenarioRuntimeConfig,
} from './explainingSomethingScenario'
import { EXPLAINING_SOMETHING_GOAL_IDS } from './explainingSomethingEvaluationContract'

const scenarioStub = { slug: EXPLAINING_SOMETHING_SCENARIO_ID } as unknown as ScenarioConfig

describe('explainingSomethingScenario', () => {
  it('builds runtime with explaining id and goals', () => {
    const r = buildExplainingSomethingScenario({ level: 'A2', random: () => 0.2 })
    expect(r.id).toBe(EXPLAINING_SOMETHING_SCENARIO_ID)
    expect(r.goals.map((g) => g.id)).toEqual([
      EXPLAINING_SOMETHING_GOAL_IDS.structure,
      EXPLAINING_SOMETHING_GOAL_IDS.completeness,
      EXPLAINING_SOMETHING_GOAL_IDS.listener,
    ])
    expect((r.openingLine ?? '').length).toBeGreaterThan(10)
  })

  it('maybeBuild returns null for other scenarios', () => {
    expect(
      maybeBuildExplainingSomethingSpeakLiveScenarioRuntime({
        scenario: { slug: 'small_talk' } as unknown as ScenarioConfig,
        level: 'A2',
        overrides: null,
      }),
    ).toBeNull()
  })

  it('maybeBuild returns runtime for explaining_something slug', () => {
    const r = maybeBuildExplainingSomethingSpeakLiveScenarioRuntime({
      scenario: scenarioStub,
      level: 'A2',
      overrides: null,
    })
    expect(r?.id).toBe(EXPLAINING_SOMETHING_SCENARIO_ID)
  })

  it('parseExplainingSomethingScenarioRuntimeConfig accepts serialized shape', () => {
    const r = buildExplainingSomethingScenario({
      level: 'A1',
      subType: 'explaining_process',
      variation: 'describing_process',
    })
    const parsed = parseExplainingSomethingScenarioRuntimeConfig(r)
    expect(parsed?.subType).toBe('explaining_process')
    expect(parsed?.variation).toBe('describing_process')
  })
})
