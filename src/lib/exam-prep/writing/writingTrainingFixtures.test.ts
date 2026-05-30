import { describe, it, expect } from 'vitest'
import {
  fixtureWritingStrongMessage,
  fixtureWritingWeakMessage,
  fixtureWritingMediumAudience,
} from '@/lib/exam-prep/writing/writingTrainingFixtures'

describe('writingTrainingFixtures', () => {
  it('strong message has coach layers', () => {
    const b = fixtureWritingStrongMessage()
    expect(b.coach.corrections.length).toBeGreaterThanOrEqual(0)
    expect(b.coach.improvedVersionDutch.length).toBeGreaterThan(5)
    expect(b.coach.idealAnswerDutch.length).toBeGreaterThan(10)
    expect(b.engine.rubricScores.every((r) => r.evidence)).toBe(true)
  })

  it('weak message triggers gating or low execution', () => {
    const b = fixtureWritingWeakMessage()
    expect(b.engine.executionGatingApplied || b.engine.rubricScores.find((r) => r.categoryKey === 'execution')?.score === 0).toBe(
      true
    )
  })

  it('medium audience yields structured breakdown', () => {
    const b = fixtureWritingMediumAudience()
    expect(b.feedbackUi.categoryRows).toHaveLength(5)
    expect(b.engine.categoryRationales.execution).toBeDefined()
  })
})
