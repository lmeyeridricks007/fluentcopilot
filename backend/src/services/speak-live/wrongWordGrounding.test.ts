import { describe, expect, it } from 'vitest'
import type { WrongWordDetection } from './liveVoiceEvaluationTypes'
import {
  filterWrongWordDetectionsGroundedInLearner,
  wrongWordObservedAppearsInLearnerLine,
} from './liveSessionReportEnrichment'

describe('wrongWordObservedAppearsInLearnerLine / filterWrongWordDetectionsGroundedInLearner', () => {
  const hallucinated: WrongWordDetection = {
    observedToken: 'niet',
    classification: 'wrong_word_choice',
    suggestedCorrection: 'wat',
    whyItMatters: 'Bad LLM row',
    severity: 'medium',
  }

  const valid: WrongWordDetection = {
    observedToken: 'wat',
    classification: 'wrong_word_choice',
    suggestedCorrection: 'welk',
    whyItMatters: 'Platform question',
    severity: 'medium',
  }

  it('rejects observedToken that does not appear in the learner line', () => {
    const learner = 'Ja alsjeblieft. Van wat er peroon vertrekt de trein.'
    expect(wrongWordObservedAppearsInLearnerLine(learner, hallucinated)).toBe(false)
    expect(wrongWordObservedAppearsInLearnerLine(learner, valid)).toBe(true)
  })

  it('filters out ungrounded rows', () => {
    const learner = 'Ja alsjeblieft. Van wat er peroon vertrekt de trein.'
    const out = filterWrongWordDetectionsGroundedInLearner(learner, [hallucinated, valid])
    expect(out).toEqual([valid])
  })
})
