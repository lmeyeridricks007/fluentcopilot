import { describe, expect, it } from 'vitest'
import {
  buildSpeakingSimulationSessionPlan,
  SPEAKING_SIMULATION_QUESTION_COUNT,
} from '@/lib/exam-prep/speaking/speakingSimulationSessionBuilder'
import { afterQuestionStored } from '@/lib/exam-prep/speaking/speakingSimulationController'
import { DUO_SPEAKING_2025_QUESTION_COUNT } from '@/lib/exam/duoExamStructure'

describe('speakingSimulationSessionBuilder', () => {
  it('builds DUO 2025 question count with section labels', () => {
    const plan = buildSpeakingSimulationSessionPlan(42)
    expect(SPEAKING_SIMULATION_QUESTION_COUNT).toBe(DUO_SPEAKING_2025_QUESTION_COUNT)
    expect(plan.questionCount).toBe(DUO_SPEAKING_2025_QUESTION_COUNT)
    expect(plan.questions).toHaveLength(DUO_SPEAKING_2025_QUESTION_COUNT)
    expect(plan.speaking2025Sections).toHaveLength(plan.questionCount)
    expect(plan.totalDurationSec).toBeGreaterThan(0)
  })

  it('uses deterministic pool draw for same seed', () => {
    const a = buildSpeakingSimulationSessionPlan(99)
    const b = buildSpeakingSimulationSessionPlan(99)
    expect(a.exerciseRefs).toEqual(b.exerciseRefs)
  })
})

describe('afterQuestionStored', () => {
  it('returns report on last index', () => {
    const n = DUO_SPEAKING_2025_QUESTION_COUNT
    expect(afterQuestionStored(n - 1, n)).toBe('session_report')
    expect(afterQuestionStored(n - 2, n)).toBe('next_question')
  })
})
