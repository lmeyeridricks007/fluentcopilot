import { describe, expect, it } from 'vitest'
import { createEmptyUserLearningProfile } from '../learningMemory/userLearningProfileDocument'
import { createEmptyUserSkillProfile } from './skillProfileDefaults'
import { buildSkillDrivenRecommendationPlan } from './skillRecommendationEngine'
import type { SkillId, SkillMetric, SkillState, SkillTrend } from './skillTypes'

function metric(
  id: SkillId,
  score: number,
  opts?: { trend?: SkillTrend; state?: SkillState; evidenceCount?: number },
): SkillMetric {
  return {
    skillId: id,
    group: 'conversation',
    score,
    state: opts?.state ?? 'needs_work',
    trend: opts?.trend ?? 'flat',
    confidence: 'high',
    evidenceCount: opts?.evidenceCount ?? 4,
    lastUpdatedAt: '2026-01-01T00:00:00.000Z',
    sourceMix: ['speak_live'],
  }
}

describe('buildSkillDrivenRecommendationPlan', () => {
  it('prefers scenario when skill tags align and fatigue is low', () => {
    const doc = createEmptyUserLearningProfile('u1')
    doc.totalSessionsObserved = 6
    doc.lastSessionModality = 'read_aloud'
    doc.recentScenarioSlugs = ['party_social']
    const metrics = {
      follow_up_questions: metric('follow_up_questions', 38),
      reacting: metric('reacting', 55),
    }
    const plan = buildSkillDrivenRecommendationPlan({ profile: doc, metrics })
    expect(plan.bundle.primary?.kind).toBe('scenario')
    expect(plan.bundle.primary?.targetId).toBeTruthy()
    expect(plan.items.some((i) => i.type === 'scenario')).toBe(true)
    expect(plan.bundle.focusChip?.kind).toBe('focus_chip')
  })

  it('penalizes repeating the same scenario slug in recent history', () => {
    const doc = createEmptyUserLearningProfile('u2')
    doc.totalSessionsObserved = 8
    doc.lastSessionModality = 'speak_live'
    doc.recentScenarioSlugs = ['party-social', 'party-social', 'party-social', 'party-social']
    const metrics = {
      follow_up_questions: metric('follow_up_questions', 34),
      keeping_flow: metric('keeping_flow', 36),
    }
    const plan = buildSkillDrivenRecommendationPlan({ profile: doc, metrics })
    const partyItem = plan.items.find((i) => i.type === 'scenario' && i.targetId === 'party-social')
    expect(partyItem?.scoreExplain?.fatigueMultiplier ?? 1).toBeLessThan(0.92)
  })

  it('surfaces coachStyleHint on coach recommendations when primary is coach', () => {
    const doc = createEmptyUserLearningProfile('u3')
    doc.totalSessionsObserved = 1
    const plan = buildSkillDrivenRecommendationPlan({
      profile: doc,
      metrics: {},
    })
    expect(plan.bundle.primary?.kind).toBe('coach')
    expect(plan.bundle.primary?.coachStyleHint).toBeTruthy()
  })

  it('includes improving skills in read profile scoring', () => {
    const doc = createEmptyUserLearningProfile('u4')
    doc.totalSessionsObserved = 5
    doc.userSkillProfile = {
      ...createEmptyUserSkillProfile('u4'),
      metrics: {
        storytelling: {
          ...metric('storytelling', 58, { trend: 'up', state: 'improving' }),
          skillId: 'storytelling',
          group: 'structure',
        },
      },
    }
    const plan = buildSkillDrivenRecommendationPlan({
      profile: doc,
      metrics: doc.userSkillProfile!.metrics,
    })
    const readItems = plan.items.filter((i) => i.type === 'read_aloud')
    expect(readItems.some((i) => (i.scoreExplain?.improvingBoost ?? 0) > 0)).toBe(true)
  })
})
