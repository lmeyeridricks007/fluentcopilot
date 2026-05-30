import { describe, expect, it } from 'vitest'
import { evaluateKmnQuizAnswer, shuffleQuizOptions } from '@/lib/exam-prep/kmn/kmnQuizService'
import type { KmnQuizQuestion } from '@/lib/exam-prep/kmn/types'

const sample: KmnQuizQuestion = {
  id: 't',
  topicId: 'work',
  subtopicId: 'x',
  level: 1,
  promptNl: 'Test?',
  options: [
    { id: 'a', labelNl: 'A' },
    { id: 'b', labelNl: 'B' },
  ],
  correctOptionId: 'a',
  explanationNl: 'Because A.',
}

describe('kmnQuizService', () => {
  it('evaluates correct answer', () => {
    expect(evaluateKmnQuizAnswer(sample, 'a').correct).toBe(true)
    expect(evaluateKmnQuizAnswer(sample, 'b').correct).toBe(false)
  })

  it('shuffles options deterministically', () => {
    const a = shuffleQuizOptions(sample, 99).map((o) => o.id).join('')
    const b = shuffleQuizOptions(sample, 99).map((o) => o.id).join('')
    const c = shuffleQuizOptions(sample, 100).map((o) => o.id).join('')
    expect(a).toBe(b)
    expect(a === c).toBe(false)
  })
})
