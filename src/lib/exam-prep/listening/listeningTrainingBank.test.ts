import { describe, expect, it } from 'vitest'
import { LISTENING_TRAINING_BANK } from '@/lib/exam-prep/listening/listeningTrainingBank'
import { buildListeningTrainingSessionPlan } from '@/lib/exam-prep/listening/listeningTaskBuilder'

describe('LISTENING_TRAINING_BANK', () => {
  it('parses and covers all question types', () => {
    expect(LISTENING_TRAINING_BANK.length).toBeGreaterThanOrEqual(9)
    const types = new Set(LISTENING_TRAINING_BANK.map((x) => x.questionType))
    expect(types.has('gist')).toBe(true)
    expect(types.has('detail')).toBe(true)
    expect(types.has('intent')).toBe(true)
  })
})

describe('buildListeningTrainingSessionPlan', () => {
  it('builds a session for each preset', () => {
    for (const preset of ['light', 'standard', 'strong'] as const) {
      const p = buildListeningTrainingSessionPlan({ preset, seed: 1 })
      expect(p.tasks.length).toBeGreaterThan(0)
    }
  })
})
