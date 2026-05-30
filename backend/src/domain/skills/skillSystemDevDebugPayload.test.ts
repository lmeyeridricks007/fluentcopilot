import { describe, expect, it } from 'vitest'
import { createEmptyUserLearningProfile } from '../learningMemory/userLearningProfileDocument'
import { createEmptyUserSkillProfile } from './skillProfileDefaults'
import { buildSkillSystemDevDebugPayload } from './skillSystemDevDebugPayload'

describe('buildSkillSystemDevDebugPayload', () => {
  it('builds a stable snapshot for cold profile', () => {
    const doc = createEmptyUserLearningProfile('u-dev')
    doc.totalSessionsObserved = 0
    const p = buildSkillSystemDevDebugPayload(doc)
    expect(p.learningMeta.totalSessionsObserved).toBe(0)
    expect(p.scoresTable).toEqual([])
    expect(p.activeFocus.currentFocusSkills).toEqual([])
    expect(p.skillDrivenPlanFresh.items.length).toBeGreaterThan(0)
    expect(p.truncation.recentEvidenceTotal).toBe(0)
  })

  it('includes scores table when metrics exist', () => {
    const doc = createEmptyUserLearningProfile('u2')
    doc.totalSessionsObserved = 4
    doc.userSkillProfile = {
      ...createEmptyUserSkillProfile('u2'),
      metrics: {
        fluency: {
          skillId: 'fluency',
          group: 'speaking',
          score: 52,
          state: 'building',
          trend: 'flat',
          confidence: 'medium',
          evidenceCount: 3,
          lastUpdatedAt: '2026-04-01T12:00:00.000Z',
          sourceMix: ['speak_live'],
        },
      },
    }
    const p = buildSkillSystemDevDebugPayload(doc)
    expect(p.scoresTable.some((r) => r.skillId === 'fluency' && r.score === 52)).toBe(true)
    expect(p.userSkillProfile.metrics.fluency?.score).toBe(52)
  })
})
