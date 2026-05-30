import { describe, expect, it } from 'vitest'
import { READING_TRAINING_BANK } from '@/lib/exam-prep/reading/readingTrainingBank'
import { buildReadingTrainingSessionPlan } from '@/lib/exam-prep/reading/readingTaskBuilder'

describe('readingTrainingBank', () => {
  it('parses non-empty bank with scanning and comprehension items', () => {
    expect(READING_TRAINING_BANK.length).toBeGreaterThanOrEqual(8)
    const skills = new Set(READING_TRAINING_BANK.map((i) => i.readingSkill))
    expect(skills.has('scanning')).toBe(true)
    expect(skills.has('comprehension')).toBe(true)
  })
})

describe('buildReadingTrainingSessionPlan', () => {
  it('builds a plan for each preset', () => {
    for (const preset of ['light', 'standard', 'strong'] as const) {
      const plan = buildReadingTrainingSessionPlan({ preset, seed: 42 })
      expect(plan.tasks.length).toBeGreaterThan(0)
      expect(plan.taskCount).toBe(plan.tasks.length)
    }
  })
})
