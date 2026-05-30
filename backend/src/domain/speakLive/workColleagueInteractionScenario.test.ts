import { describe, expect, it } from 'vitest'
import {
  buildWorkColleagueInteractionEvaluationContract,
  workColleagueCompletionContractSatisfied,
} from './workColleagueInteractionEvaluationContract'
import {
  buildWorkColleagueInteractionScenario,
  WORK_COLLEAGUE_INTERACTION_SCENARIO_ID,
} from './workColleagueInteractionScenario'

describe('buildWorkColleagueInteractionScenario', () => {
  it('builds stable runtime for fixed rng', () => {
    const rng = () => 0.41
    const out = buildWorkColleagueInteractionScenario({
      level: 'A2',
      subType: 'team_task',
      variation: 'clarifying_tasks',
      detailFocus: 'email',
      random: rng,
    })
    expect(out.id).toBe(WORK_COLLEAGUE_INTERACTION_SCENARIO_ID)
    expect(out.subType).toBe('team_task')
    expect(out.variation).toBe('clarifying_tasks')
    expect(out.persona && typeof out.persona === 'object' && 'taskFocus' in out.persona).toBe(true)
    expect((out.persona as { taskFocus?: string }).taskFocus).toBe('email')
    expect(out.goals.length).toBe(4)
    expect(out.evaluationContract?.completionRequiredPassGoalIds.length).toBeGreaterThan(0)
    expect(out.context).toMatch(/Kern van deze run/)
    expect(out.context).toMatch(/\[V\] Taalpool bij dit onderwerp/)
  })

  it('contract satisfied when required goal labels present', () => {
    const runtime = buildWorkColleagueInteractionScenario({
      level: 'A2',
      variation: 'asking_for_help',
      random: () => 0.2,
    })
    const ec = runtime.evaluationContract ?? buildWorkColleagueInteractionEvaluationContract('asking_for_help')
    const labels = runtime.goals
      .filter((g) => ec.completionRequiredPassGoalIds.includes(g.id))
      .map((g) => g.label)
    expect(workColleagueCompletionContractSatisfied(runtime, labels)).toBe(true)
  })

  it('clarifying_tasks completion requires clarify and (sequence/deadline OR next step)', () => {
    const runtime = buildWorkColleagueInteractionScenario({
      level: 'A2',
      variation: 'clarifying_tasks',
      random: () => 0.2,
    })
    const [clarifyLabel, seqLabel, confirmLabel] = runtime.goals.map((g) => g.label)
    expect(workColleagueCompletionContractSatisfied(runtime, [clarifyLabel, seqLabel])).toBe(true)
    expect(workColleagueCompletionContractSatisfied(runtime, [clarifyLabel, confirmLabel])).toBe(true)
    expect(workColleagueCompletionContractSatisfied(runtime, [clarifyLabel])).toBe(false)
    expect(workColleagueCompletionContractSatisfied(runtime, [seqLabel, confirmLabel])).toBe(false)
  })
})
