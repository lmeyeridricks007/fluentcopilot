import type { ScenarioRuntimeConfig } from '../../models/contracts'
import { describe, expect, it } from 'vitest'
import { buildStoreServiceIssueEvaluationContract, storeServiceCompletionContractSatisfied } from './storeServiceIssueEvaluationContract'
import {
  buildStoreServiceIssueScenario,
  isStoreServiceIssueSpeakLiveRuntimeOpeningStale,
  STORE_SERVICE_ISSUE_SCENARIO_ID,
  STORE_SERVICE_ISSUE_SPEAK_LIVE_OPENING_CONTRACT_VERSION,
} from './storeServiceIssueScenario'

describe('buildStoreServiceIssueScenario', () => {
  it('builds stable runtime id and weighted goals for returning_item', () => {
    const out = buildStoreServiceIssueScenario({
      level: 'A2',
      subType: 'store_return',
      variation: 'returning_item',
      detailFocus: 'too_small',
      random: () => 0.3,
    })
    expect(out.id).toBe(STORE_SERVICE_ISSUE_SCENARIO_ID)
    expect(out.subType).toBe('store_return')
    expect(out.variation).toBe('returning_item')
    expect(out.goals.length).toBe(4)
    expect(out.goals[0]!.weight).toBe(35)
    expect(out.evaluationContract?.variationId).toBe('returning_item')
    expect(out.context.toLowerCase()).toContain('kern van deze run')
  })

  it('tags opening contract version on runtime', () => {
    const out = buildStoreServiceIssueScenario({
      level: 'A2',
      subType: 'store_return',
      random: () => 0.5,
    })
    expect(out.storeServiceIssueOpeningContractVersion).toBe(STORE_SERVICE_ISSUE_SPEAK_LIVE_OPENING_CONTRACT_VERSION)
  })

  it('isStoreServiceIssueSpeakLiveRuntimeOpeningStale when version missing or too old', () => {
    expect(isStoreServiceIssueSpeakLiveRuntimeOpeningStale('ordering_food', {})).toBe(false)
    expect(isStoreServiceIssueSpeakLiveRuntimeOpeningStale('store_service_issue', null)).toBe(true)
    expect(
      isStoreServiceIssueSpeakLiveRuntimeOpeningStale('store_service_issue', {
        scenarioRuntimeConfig: { id: STORE_SERVICE_ISSUE_SCENARIO_ID } as ScenarioRuntimeConfig,
      })
    ).toBe(true)
    const fresh = buildStoreServiceIssueScenario({ level: 'A2', random: () => 0.1 })
    expect(isStoreServiceIssueSpeakLiveRuntimeOpeningStale('store_service_issue', { scenarioRuntimeConfig: fresh })).toBe(false)
  })

  it('contract satisfied when required Dutch labels are completed', () => {
    const runtime = buildStoreServiceIssueScenario({
      level: 'A2',
      variation: 'complaint',
      random: () => 0.11,
    })
    const ec = runtime.evaluationContract ?? buildStoreServiceIssueEvaluationContract('complaint')
    const labels = runtime.goals.map((g) => g.label)
    expect(ec.completionRequiredPassGoalIds.length).toBe(2)
    expect(
      storeServiceCompletionContractSatisfied(runtime, [labels[0]!, labels[2]!])
    ).toBe(true)
    expect(storeServiceCompletionContractSatisfied(runtime, [labels[0]!])).toBe(false)
  })
})
