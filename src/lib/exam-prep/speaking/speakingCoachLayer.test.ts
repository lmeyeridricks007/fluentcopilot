import { describe, it, expect } from 'vitest'
import { aggregateSpeakingAttempt } from '@/lib/exam-scoring/scoreAggregator'
import { buildSpeakingCoachOutput } from '@/lib/exam-prep/speaking/speakingCoachLayer'
import { getSpeakingTrainingQuestionById } from '@/lib/exam-prep/speaking/speakingQuestionBuilder'

describe('buildSpeakingCoachOutput', () => {
  it('zeros non-execution feedback copy when execution gating applies', () => {
    const item = getSpeakingTrainingQuestionById('st-speaking-pref-01')
    expect(item).toBeDefined()
    const engine = aggregateSpeakingAttempt({
      mode: 'training',
      responseText: 'x',
      scores: {
        execution: 0,
        vocabulary: 2,
        grammar: 2,
        fluency: 2,
        clearness: 1,
        pronunciation: 2,
      },
      categoryRationales: { execution: 'Te kort.' },
    })
    expect(engine.executionGatingApplied).toBe(true)
    const coach = buildSpeakingCoachOutput({
      item: item!,
      answer: 'x',
      engine,
    })
    const grammar = coach.categoryEntries.find((c) => c.categoryKey === 'grammar')
    expect(grammar?.score).toBe(0)
    expect(grammar?.learnerFeedbackNl).toContain('Niet apart beoordeeld')
    expect(coach.improvedVersionDutch.length).toBeGreaterThan(0)
    expect(coach.idealAnswerDutch).toContain(item!.modelAnswerDutch.slice(0, 20))
  })

  it('includes corrections and distinct improved vs ideal text for weak learner answer', () => {
    const item = getSpeakingTrainingQuestionById('st-speaking-pref-01')
    expect(item).toBeDefined()
    const engine = aggregateSpeakingAttempt({
      mode: 'training',
      responseText: 'met auto because very fast vandaag',
      scores: {
        execution: 2,
        vocabulary: 1,
        grammar: 0,
        fluency: 1,
        clearness: 0,
        pronunciation: 1,
      },
    })
    const coach = buildSpeakingCoachOutput({
      item: item!,
      answer: 'met auto because very fast vandaag',
      engine,
    })
    expect(coach.corrections.length).toBeGreaterThanOrEqual(1)
    expect(coach.improvedVersionDutch).not.toBe(coach.idealAnswerDutch)
    expect(coach.nextStepNl.length).toBeGreaterThan(10)
  })
})
