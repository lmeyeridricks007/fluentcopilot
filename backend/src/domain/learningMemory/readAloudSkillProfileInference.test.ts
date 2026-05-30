import { describe, expect, it } from 'vitest'
import { createEmptyUserLearningProfile } from './userLearningProfileDocument'
import { createEmptyUserSkillProfile } from '../skills/skillProfileDefaults'
import type { SkillId, SkillMetric } from '../skills/skillTypes'
import { inferReadAloudPassageProfileIdFromSkillMetrics } from './readAloudSkillProfileInference'

describe('inferReadAloudPassageProfileIdFromSkillMetrics', () => {
  it('selects storytelling_focus when storytelling metric is weak with evidence', () => {
    const doc = createEmptyUserLearningProfile('u1')
    doc.totalSessionsObserved = 5
    doc.userSkillProfile = {
      ...createEmptyUserSkillProfile('u1'),
      metrics: {
        storytelling: {
          skillId: 'storytelling',
          group: 'speaking',
          score: 44,
          state: 'needs_work',
          trend: 'flat',
          confidence: 'high',
          evidenceCount: 3,
          lastUpdatedAt: '2026-01-01T00:00:00.000Z',
          sourceMix: ['speak_live'],
        },
      },
    }
    expect(inferReadAloudPassageProfileIdFromSkillMetrics(doc)).toBe('storytelling_focus')
  })

  it('selects confidence_build when many skills are simultaneously fragile', () => {
    const doc = createEmptyUserLearningProfile('u2')
    doc.totalSessionsObserved = 6
    const mk = (id: SkillId, score: number): SkillMetric => ({
      skillId: id,
      group: 'conversation',
      score,
      state: 'needs_work',
      trend: 'flat',
      confidence: 'high',
      evidenceCount: 3,
      lastUpdatedAt: '2026-01-01T00:00:00.000Z',
      sourceMix: ['speak_live'],
    })
    doc.userSkillProfile = {
      ...createEmptyUserSkillProfile('u2'),
      metrics: {
        reacting: mk('reacting', 40),
        keeping_flow: mk('keeping_flow', 42),
        follow_up_questions: mk('follow_up_questions', 41),
        repair_clarification: mk('repair_clarification', 39),
      },
    }
    expect(inferReadAloudPassageProfileIdFromSkillMetrics(doc)).toBe('confidence_build')
  })
})
