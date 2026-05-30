import { describe, expect, it } from 'vitest'
import { createEmptyUserLearningProfile } from '../learningMemory/userLearningProfileDocument'
import { createEmptyUserSkillProfile } from './skillProfileDefaults'
import {
  normalizeScenarioSlug,
  rankWeakestSkillIdsFromProfile,
  skillsForScenarioSlug,
  weakSkillScenarioOverlapHits,
} from './scenarioSkillTags'

describe('scenarioSkillTags', () => {
  it('normalizes launcher/API slugs consistently', () => {
    expect(normalizeScenarioSlug('train-station-classic')).toBe('train_station_classic')
    expect(normalizeScenarioSlug('Work_Colleague_Interaction')).toBe('work_colleague_interaction')
  })

  it('maps opinions_light alias to opinions_discussions coverage', () => {
    expect(skillsForScenarioSlug('opinions_light')).toEqual(skillsForScenarioSlug('opinions_discussions'))
  })

  it('counts overlap between weakest skills and scenario tags', () => {
    const doc = createEmptyUserLearningProfile('u1')
    doc.userSkillProfile = {
      ...createEmptyUserSkillProfile('u1'),
      metrics: {
        vocabulary: {
          skillId: 'vocabulary',
          group: 'language',
          score: 38,
          state: 'needs_work',
          trend: 'flat',
          confidence: 'high',
          evidenceCount: 4,
          lastUpdatedAt: '2026-01-01T00:00:00.000Z',
          sourceMix: ['speak_live'],
        },
        asking_questions: {
          skillId: 'asking_questions',
          group: 'conversation',
          score: 40,
          state: 'needs_work',
          trend: 'flat',
          confidence: 'high',
          evidenceCount: 3,
          lastUpdatedAt: '2026-01-01T00:00:00.000Z',
          sourceMix: ['speak_live'],
        },
        fluency: {
          skillId: 'fluency',
          group: 'speaking',
          score: 72,
          state: 'solid',
          trend: 'flat',
          confidence: 'medium',
          evidenceCount: 6,
          lastUpdatedAt: '2026-01-01T00:00:00.000Z',
          sourceMix: ['speak_live'],
        },
      },
    }
    expect(rankWeakestSkillIdsFromProfile(doc, 5)).toContain('vocabulary')
    expect(weakSkillScenarioOverlapHits(doc, 'doctor_pharmacy')).toBeGreaterThanOrEqual(2)
  })
})
