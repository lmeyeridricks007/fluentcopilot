import { describe, expect, it } from 'vitest'
import {
  buildHousingLandlordEvaluationContract,
  housingLandlordCompletionContractSatisfied,
} from './housingLandlordEvaluationContract'
import { buildHousingLandlordScenario, HOUSING_LANDLORD_SCENARIO_ID, normalizeHousingLandlordDetailFocus } from './housingLandlordScenario'
import { getHousingLandlordStarterHintsForRuntime } from './housingLandlordLearnerStarters'

describe('buildHousingLandlordScenario', () => {
  it('builds stable runtime for fixed rng', () => {
    const rng = () => 0.41
    const out = buildHousingLandlordScenario({
      level: 'A2',
      subType: 'rental_agency',
      variation: 'asking_rent_contract',
      detailFocus: 'deposit_borg',
      random: rng,
    })
    expect(out.id).toBe(HOUSING_LANDLORD_SCENARIO_ID)
    expect(out.subType).toBe('rental_agency')
    expect(out.variation).toBe('asking_rent_contract')
    expect(out.persona && typeof out.persona === 'object' && 'detailFocus' in out.persona).toBe(true)
    expect((out.persona as { detailFocus?: string }).detailFocus).toBe('deposit_borg')
    expect(out.goals.length).toBe(4)
    expect(out.evaluationContract?.completionRequiredPassGoalIds.length).toBeGreaterThan(0)
    expect(out.context).toMatch(/Kern van deze run/)
    expect(out.context).toMatch(/\[1\] Systeemrol/)
    expect(out.context).toMatch(/\[4\] Variatie: asking_rent_contract/)
    expect(out.context).toMatch(/Bedoelt u de huur of de borg/)
    expect(out.context).toMatch(/\[5\] Woord- en thema-ankers/)
    expect(out.context).toMatch(/huur betalen/)
    expect(out.assistantBehavior?.responseStyle?.join('\n')).toMatch(/Subtype \(rental_agency\)/)
  })

  it('normalizes schimmel override to mold_moisture issue focus', () => {
    expect(normalizeHousingLandlordDetailFocus('schimmel', 'reporting_issue')).toBe('mold_moisture')
  })

  it('starter hints include level anchors for asking_rent_contract A1', () => {
    const hints = getHousingLandlordStarterHintsForRuntime('A1', 'asking_rent_contract', 'landlord', 'rent_due_date')
    expect(hints[0]).toMatch(/Wanneer moet ik de huur betalen/)
  })

  it('reporting_issue runtime context includes structured variation block and repair examples', () => {
    const out = buildHousingLandlordScenario({
      level: 'A2',
      subType: 'landlord',
      variation: 'reporting_issue',
      random: () => 0.2,
    })
    expect(out.context).toMatch(/\[4\] Variatie: reporting_issue/)
    expect(out.context).toMatch(/Wat is er precies mis/)
    expect(out.context).toMatch(/\[3\] Subtype: LANDLORD/)
  })

  it('reporting_issue contract satisfied when issue + help/action goal labels present', () => {
    const runtime = buildHousingLandlordScenario({
      level: 'A2',
      variation: 'reporting_issue',
      random: () => 0.2,
    })
    const ec = runtime.evaluationContract ?? buildHousingLandlordEvaluationContract('reporting_issue')
    const labels = runtime.goals
      .filter((g) => ec.completionRequiredPassGoalIds.includes(g.id))
      .map((g) => g.label)
    expect(housingLandlordCompletionContractSatisfied(runtime, labels)).toBe(true)
    const issueOnly = labels.slice(0, 1)
    expect(housingLandlordCompletionContractSatisfied(runtime, issueOnly)).toBe(false)
  })

  it('asking_rent_contract completion requires two core goals', () => {
    const runtime = buildHousingLandlordScenario({
      level: 'A2',
      variation: 'asking_rent_contract',
      random: () => 0.2,
    })
    const ec = runtime.evaluationContract ?? buildHousingLandlordEvaluationContract('asking_rent_contract')
    const [a, b] = runtime.goals
      .filter((g) => ec.completionRequiredPassGoalIds.includes(g.id))
      .map((g) => g.label)
    expect(housingLandlordCompletionContractSatisfied(runtime, [a, b])).toBe(true)
    expect(housingLandlordCompletionContractSatisfied(runtime, [a])).toBe(false)
  })
})
