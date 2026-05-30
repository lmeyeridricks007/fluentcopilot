import { describe, expect, it } from 'vitest'
import { buildPhoneCallScenario, maybeBuildPhoneCallSpeakLiveScenarioRuntime, parsePhoneCallScenarioRuntimeConfig } from './phoneCallScenario'
import { PHONE_CALL_SCENARIO_ID } from './phoneCallEvaluationContract'

describe('phoneCallScenario', () => {
  it('builds runtime with stable id', () => {
    const out = buildPhoneCallScenario({ level: 'A2', random: () => 0.42 })
    expect(out.id).toBe(PHONE_CALL_SCENARIO_ID)
    expect(out.goals.length).toBeGreaterThanOrEqual(4)
    expect(out.evaluationContract?.schemaVersion).toBe(1)
  })

  it('maybeBuild matches slug', () => {
    const scenario = { slug: PHONE_CALL_SCENARIO_ID } as import('../../models/contracts').ScenarioConfig
    const rt = maybeBuildPhoneCallSpeakLiveScenarioRuntime({ scenario, level: 'A1', overrides: { subType: 'information_call' } })
    expect(rt?.subType).toBe('information_call')
  })

  it('parses persisted runtime', () => {
    const built = buildPhoneCallScenario({ level: 'B1', random: () => 0.1 })
    const again = parsePhoneCallScenarioRuntimeConfig(built)
    expect(again?.id).toBe(PHONE_CALL_SCENARIO_ID)
  })
})
