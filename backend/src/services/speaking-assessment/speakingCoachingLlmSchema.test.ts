import { describe, expect, it } from 'vitest'
import { SpeakingAssessmentCoachingLlmSchema } from './speakingCoachingFromAssessmentService'

describe('SpeakingAssessmentCoachingLlmSchema', () => {
  it('accepts a full grounded coaching object', () => {
    const v = SpeakingAssessmentCoachingLlmSchema.safeParse({
      shortSummary: 'Test summary for the learner.',
      whatWentWell: ['Line is understandable.'],
      improveNext: ['Ease the ending.'],
      retryTarget: 'dank je wel',
      retryWhy: 'Short polite chunk is easy to drill.',
      levelAlignedNotes: ['A2: 4-word reps.'],
      dutchSoundingLabel: 'clear but careful A2 Dutch',
      confidenceNarrative:
        'This narrative explains limits: scores come from Azure; timing is heuristic only. Enough to coach phrasing without claiming native melody.',
      wordCoachingNotes: [{ text: 'dank', coachingNote: 'Make the /ɑ/ clear.' }],
    })
    expect(v.success).toBe(true)
  })

  it('rejects missing dutchSoundingLabel', () => {
    const v = SpeakingAssessmentCoachingLlmSchema.safeParse({
      shortSummary: 'x',
      whatWentWell: ['a'],
      improveNext: ['b'],
      levelAlignedNotes: [],
      confidenceNarrative: 'x'.repeat(25),
      wordCoachingNotes: [],
    })
    expect(v.success).toBe(false)
  })
})
