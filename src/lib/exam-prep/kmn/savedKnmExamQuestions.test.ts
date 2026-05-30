import { describe, expect, it } from 'vitest'
import {
  fingerprintKnmExamQuestion,
  stableSavedKnmQuestionId,
} from './savedKnmExamQuestions'
import type { ExamTaskInstance } from '@/lib/exam-system/types'

const sampleTask = {
  promptNl: 'Wat is slim?',
  mcq: {
    options: [
      { id: 'a', label: 'Eerste' },
      { id: 'b', label: 'Tweede' },
    ],
    correctOptionIds: ['a'],
  },
} as Pick<ExamTaskInstance, 'promptNl' | 'mcq'>

describe('savedKnmExamQuestions', () => {
  it('stable id is deterministic for same content', () => {
    const fp = fingerprintKnmExamQuestion(sampleTask)
    expect(stableSavedKnmQuestionId(fp)).toBe(stableSavedKnmQuestionId(fp))
  })

  it('fingerprint changes when options change', () => {
    const other = {
      ...sampleTask,
      mcq: { ...sampleTask.mcq!, correctOptionIds: ['b'] },
    }
    expect(fingerprintKnmExamQuestion(sampleTask)).not.toBe(fingerprintKnmExamQuestion(other))
  })
})
