import { describe, expect, it } from 'vitest'
import { mapApiSummaryToRecapView, parseThreadSummaryTextToRecap } from './conversationMappers'

describe('conversationMappers', () => {
  it('maps API summary to recap view model', () => {
    const m = mapApiSummaryToRecapView({
      threadId: 't1',
      whatWentWell: ['Asked clearly'],
      whatToImprove: ['Articles'],
      correctedPhrases: [{ original: 'a', corrected: 'b', note: 'n' }],
      suggestedNextAction: 'Try again tomorrow',
      saveWordCandidates: ['perron', 'vertrek'],
    })
    expect(m.handledWell).toEqual(['Asked clearly'])
    expect(m.whatToImprove).toEqual(['Articles'])
    expect(m.improvePhrases).toHaveLength(1)
    expect(m.nextStep).toBe('Try again tomorrow')
    expect(m.usefulPhrase).toBe('perron')
    expect(m.usefulWord).toBe('vertrek')
  })

  it('parses completed thread summary JSON', () => {
    const json = JSON.stringify({
      threadId: 't1',
      whatWentWell: ['x'],
      whatToImprove: [],
      correctedPhrases: [],
      suggestedNextAction: 'next',
      saveWordCandidates: [],
    })
    const m = parseThreadSummaryTextToRecap(json)
    expect(m?.handledWell).toEqual(['x'])
  })

  it('returns null for non-JSON running summary', () => {
    expect(parseThreadSummaryTextToRecap('Learner started Train station (guided, feedback turn).')).toBeNull()
  })

  it('maps grounded train recap fields to Speak Live view sections', () => {
    const m = mapApiSummaryToRecapView({
      threadId: 't1',
      whatWentWell: ['You asked about delay / on time: “Is de trein op tijd?”.'],
      whatToImprove: [],
      correctedPhrases: [],
      suggestedNextAction: 'Drill platform',
      recommendedNextStep: 'Say one platform question aloud.',
      saveWordCandidates: ['perron'],
      goalsCompleted: ['ASK_DELAY_STATUS', 'ASK_DEPARTURE_TIME'],
      goalsMissed: ['ASK_PLATFORM'],
      transcriptEvidence: [
        { goalId: 'ASK_DELAY_STATUS', quote: 'Is de trein op tijd?' },
        { goalId: 'ASK_DEPARTURE_TIME', quote: 'Hoe laat vertrekt de trein?' },
      ],
      languageNotes: ['Article practice'],
      dutchUpgrade: ['Use “perron” in a full sentence.'],
    })
    expect(m.youAskedAbout).toHaveLength(2)
    expect(m.youAskedAbout?.[0].quote).toBe('Is de trein op tijd?')
    expect(m.youCouldStillAdd).toContain('Platform / track')
    expect(m.tryNext).toBe('Say one platform question aloud.')
    expect(m.dutchUpgradeLines?.[0]).toContain('perron')
  })
})
