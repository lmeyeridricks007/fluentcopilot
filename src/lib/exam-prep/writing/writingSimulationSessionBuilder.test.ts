import { describe, expect, it } from 'vitest'
import {
  buildWritingSimulationSessionPlan,
  WRITING_SIMULATION_TASK_COUNT,
  WRITING_SIMULATION_TOTAL_DURATION_SEC,
  durationSecForWritingSimulationItem,
} from '@/lib/exam-prep/writing/writingSimulationSessionBuilder'
import { afterWritingTaskStored } from '@/lib/exam-prep/writing/writingSimulationController'

describe('writingSimulationSessionBuilder', () => {
  it('builds four tasks: form, message, message, text_to_audience', () => {
    const plan = buildWritingSimulationSessionPlan(7)
    expect(plan.taskCount).toBe(WRITING_SIMULATION_TASK_COUNT)
    expect(plan.seed).toBe(7)
    expect(plan.totalDurationSec).toBe(WRITING_SIMULATION_TOTAL_DURATION_SEC)
    expect(plan.tasks.map((t) => t.item.subtype)).toEqual(['form', 'message', 'message', 'text_to_audience'])
  })

  it('uses two different message task ids', () => {
    const plan = buildWritingSimulationSessionPlan(7)
    const m0 = plan.tasks[1]!.item.id
    const m1 = plan.tasks[2]!.item.id
    expect(m0).not.toBe(m1)
  })

  it('is deterministic for same seed', () => {
    const a = buildWritingSimulationSessionPlan(123)
    const b = buildWritingSimulationSessionPlan(123)
    expect(a.tasks.map((t) => t.item.id)).toEqual(b.tasks.map((t) => t.item.id))
  })

  it('durationSec matches subtype policy', () => {
    const plan = buildWritingSimulationSessionPlan(1)
    for (const t of plan.tasks) {
      expect(t.durationSec).toBe(durationSecForWritingSimulationItem(t.item))
    }
  })
})

describe('afterWritingTaskStored', () => {
  it('returns session_report on last task index', () => {
    expect(afterWritingTaskStored(3, 4)).toBe('session_report')
    expect(afterWritingTaskStored(2, 4)).toBe('next_task')
  })
})
