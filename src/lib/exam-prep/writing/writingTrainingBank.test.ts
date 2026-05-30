import { describe, it, expect } from 'vitest'
import { WRITING_TRAINING_BANK } from '@/lib/exam-prep/writing/writingTrainingBank'
import { evaluateWritingTrainingSubmission } from '@/lib/exam-prep/writing/writingEvaluationService'

describe('writing training bank', () => {
  it('has tasks for each subtype', () => {
    const sub = new Set(WRITING_TRAINING_BANK.map((t) => t.subtype))
    expect(sub.has('form')).toBe(true)
    expect(sub.has('message')).toBe(true)
    expect(sub.has('text_to_audience')).toBe(true)
  })
})

describe('evaluateWritingTrainingSubmission', () => {
  it('returns gated scores when answer is too short', () => {
    const item = WRITING_TRAINING_BANK.find((t) => t.subtype === 'message')!
    const bundle = evaluateWritingTrainingSubmission({
      item,
      bodyText: 'x',
      startedAtIso: '2025-01-01T10:00:00.000Z',
      submittedAtIso: '2025-01-01T10:01:00.000Z',
    })
    expect(bundle.engine.executionGatingApplied).toBe(true)
    expect(bundle.engine.totalScore).toBe(0)
  })
})
