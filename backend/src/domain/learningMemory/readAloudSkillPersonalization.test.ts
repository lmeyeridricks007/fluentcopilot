import { describe, expect, it } from 'vitest'
import { createEmptyUserLearningProfile } from './userLearningProfileDocument'
import { createEmptyUserSkillProfile } from '../skills/skillProfileDefaults'
import { resolveReadAloudPassagePersonalization } from './readAloudPersonalizationFromProfile'

describe('read aloud skill suggestions (personalization)', () => {
  it('appends nuance-family skill steer when weak nuance metrics align', () => {
    const doc = createEmptyUserLearningProfile('u1')
    doc.totalSessionsObserved = 5
    doc.userSkillProfile = {
      ...createEmptyUserSkillProfile('u1'),
      metrics: {
        nuance: {
          skillId: 'nuance',
          group: 'advanced',
          score: 48,
          state: 'building',
          trend: 'flat',
          confidence: 'high',
          evidenceCount: 4,
          lastUpdatedAt: '2026-01-01T00:00:00.000Z',
          sourceMix: ['speak_live'],
        },
      },
    }
    const r = resolveReadAloudPassagePersonalization({
      doc,
      level: 'A2',
      genre: 'everyday_conversation',
      topic: null,
      personalizationProfileOverride: 'everyday_dutch',
    })
    expect(r.personalizationEnglish.toLowerCase()).toContain('skill steer')
    expect(r.personalizationEnglish.toLowerCase()).toMatch(/opinion|comparison|hedging/)
  })

  it('appends question skill steer when weak asking_questions is in top weak set', () => {
    const doc = createEmptyUserLearningProfile('u2')
    doc.totalSessionsObserved = 6
    doc.userSkillProfile = {
      ...createEmptyUserSkillProfile('u2'),
      metrics: {
        asking_questions: {
          skillId: 'asking_questions',
          group: 'conversation',
          score: 46,
          state: 'needs_work',
          trend: 'flat',
          confidence: 'high',
          evidenceCount: 4,
          lastUpdatedAt: '2026-01-01T00:00:00.000Z',
          sourceMix: ['speak_live'],
        },
        fluency: {
          skillId: 'fluency',
          group: 'speaking',
          score: 70,
          state: 'solid',
          trend: 'flat',
          confidence: 'high',
          evidenceCount: 10,
          lastUpdatedAt: '2026-01-01T00:00:00.000Z',
          sourceMix: ['speak_live'],
        },
      },
    }
    const r = resolveReadAloudPassagePersonalization({
      doc,
      level: 'B1',
      genre: 'story',
      topic: null,
      personalizationProfileOverride: 'grammar_focus',
    })
    expect(r.personalizationEnglish.toLowerCase()).toContain('questions')
  })
})
