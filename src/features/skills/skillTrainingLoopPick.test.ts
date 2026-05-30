import { describe, expect, it } from 'vitest'
import type { ApiSkillDefinition, ApiSkillId, ApiSkillMetric, TalkTrainingLoopCard } from '@/lib/api/apiTypes'
import { groupScore, pickBestLoopForSkill, pickExtremeSkill, pickTopLoopForGroup } from './skillTrainingLoopPick'

const defs = [
  { id: 'fluency' as const, label: 'Fluency', group: 'speaking' as const },
  { id: 'pronunciation' as const, label: 'Pronunciation', group: 'speaking' as const },
] as unknown as ApiSkillDefinition[]

function metric(score: number): ApiSkillMetric {
  return {
    skillId: 'fluency',
    group: 'speaking',
    score,
    state: 'building',
    trend: 'flat',
    confidence: 'medium',
    evidenceCount: 1,
    lastUpdatedAt: '2026-01-01T00:00:00.000Z',
    sourceMix: [],
  }
}

function loopCard(over: Partial<TalkTrainingLoopCard> = {}): TalkTrainingLoopCard {
  return {
    id: '1',
    loopType: 'weak_words',
    title: 'T',
    subtitle: null,
    reason: 'r',
    estimatedMinutes: 2,
    difficulty: 'moderate',
    status: 'active',
    targetSkills: ['fluency'],
    threadId: null,
    sourceSessionId: 's',
    loopSlot: 1,
    ...over,
  }
}

describe('skillTrainingLoopPick', () => {
  it('groupScore averages known metric scores', () => {
    const mFlu = metric(40)
    const mPr = { ...metric(60), skillId: 'pronunciation' as ApiSkillId, group: 'speaking' as const }
    const metrics: Partial<Record<ApiSkillId, ApiSkillMetric>> = { fluency: mFlu, pronunciation: mPr }
    expect(groupScore(metrics, defs)).toBe(50)
  })

  it('pickExtremeSkill returns low / high by score', () => {
    const metrics: Partial<Record<ApiSkillId, ApiSkillMetric>> = {
      fluency: { ...metric(30), skillId: 'fluency' },
      pronunciation: { ...metric(70), skillId: 'pronunciation' },
    }
    expect(pickExtremeSkill(defs, metrics, 'low')?.id).toBe('fluency')
    expect(pickExtremeSkill(defs, metrics, 'high')?.id).toBe('pronunciation')
  })

  it('pickBestLoopForSkill matches targetSkills', () => {
    const loops = [loopCard({ id: 'a', targetSkills: ['pronunciation'] }), loopCard({ id: 'b', targetSkills: ['fluency'] })]
    expect(pickBestLoopForSkill('fluency', loops)?.id).toBe('b')
  })

  it('pickTopLoopForGroup prefers loop tied to lowest skill in group', () => {
    const loops = [
      loopCard({ id: 'slot1', loopSlot: 1, targetSkills: ['pronunciation'] }),
      loopCard({ id: 'slot0', loopSlot: 0, targetSkills: ['fluency'] }),
    ]
    const metrics: Partial<Record<ApiSkillId, ApiSkillMetric>> = {
      fluency: { ...metric(20), skillId: 'fluency' },
      pronunciation: { ...metric(80), skillId: 'pronunciation' },
    }
    expect(pickTopLoopForGroup(defs, metrics, loops)?.id).toBe('slot0')
  })

  it('pickTopLoopForGroup falls back to slot 0 when no metric for low pick', () => {
    const loops = [loopCard({ id: 'late', loopSlot: 2, targetSkills: ['fluency'] }), loopCard({ id: 'zero', loopSlot: 0, targetSkills: ['fluency'] })]
    expect(pickTopLoopForGroup(defs, {}, loops)?.id).toBe('zero')
  })
})
