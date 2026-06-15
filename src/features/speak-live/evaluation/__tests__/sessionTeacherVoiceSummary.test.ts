import { describe, expect, it } from 'vitest'
import {
  buildLanguageCoachTeacherVoiceSummary,
  buildSessionTeacherVoiceSummary,
  isTechnicalSummaryLine,
} from '../sessionTeacherVoiceSummary'

describe('sessionTeacherVoiceSummary', () => {
  it('flags technical score lines', () => {
    expect(isTechnicalSummaryLine('Score 68/100 · task 69 · language 68 · speech n/a')).toBe(true)
    expect(isTechnicalSummaryLine('You stayed polite and clear.')).toBe(false)
  })

  it('builds Dutch teacher recap with word fix and section pauses', () => {
    const script = buildSessionTeacherVoiceSummary('nl', {
      scenarioTitle: 'Openbaar vervoer',
      wentWellBullets: ['You asked about the train clearly'],
      fixNextBullets: ['Use kaartje at the counter'],
      turns: [
        {
          turnId: 't1',
          wrongWordDetections: [
            { observedToken: 'kortje', suggestedCorrection: 'kaartje' },
          ],
        } as never,
      ],
    })
    expect(script).toMatch(/kaartje/i)
    expect(script).toMatch(/kortje/i)
    expect(script).toMatch(/Wat goed ging\./)
    expect(script).toContain(' ... ')
    expect(script).not.toMatch(/Score \d+\/100/)
  })

  it('builds English teacher recap with separate sentences', () => {
    const script = buildSessionTeacherVoiceSummary('en', {
      scenarioTitle: 'Train station',
      wentWellBullets: [
        'Clearly ask about delay, cancellation, or disruption',
        'Keep destination, line, or route context explicit',
      ],
      fixNextBullets: ['Ask for the platform directly'],
      heroLine: 'Score 68/100 · task 69 · language 68 · speech n/a',
    })
    expect(script).toMatch(/What went well\./)
    expect(script).toMatch(/One thing to improve next\./)
    expect(script).toMatch(/disruption\./)
    expect(script).toMatch(/explicit\./)
    expect(script).not.toMatch(/Score 68/)
    expect(script).not.toMatch(/Also,/)
  })

  it('builds language coach recap in Dutch', () => {
    const script = buildLanguageCoachTeacherVoiceSummary('nl', {
      focusLabel: 'woordvolgorde',
      strengths: ['Je bleef rustig praten'],
      weakPatterns: ['Werkwoord op de verkeerde plek'],
    })
    expect(script).toMatch(/coach/i)
    expect(script).toMatch(/Sterk punt:/)
    expect(script).toContain(' ... ')
  })
})
