import { describe, expect, it } from 'vitest'
import { mergeSessionInsightsIntoProfile } from '../learningMemory/userLearningProfileMergeService'
import { createEmptyUserLearningProfile } from '../learningMemory/userLearningProfileDocument'
import { SESSION_LEARNING_INSIGHTS_SCHEMA_VERSION, type SessionLearningInsights } from '../learningMemory/sessionLearningInsightTypes'
import { buildSkillDrivenRecommendationPlan } from './skillRecommendationEngine'

describe('Skill system E2E — merge → metrics → recommendations', () => {
  it('produces ranked recommendations after two weighted merges (new-user then follow-up)', () => {
    let doc = createEmptyUserLearningProfile('user-e2e')
    const first: SessionLearningInsights = {
      schemaVersion: SESSION_LEARNING_INSIGHTS_SCHEMA_VERSION,
      sessionId: 's-a',
      userId: 'user-e2e',
      sessionType: 'speak_live',
      scenarioId: 'sc1',
      extractedAt: '2026-04-01T12:00:00.000Z',
      weakWords: [],
      weakPatterns: [
        {
          source: 'live',
          severity: 2,
          severityScore: 1.4,
          confidence: 0.62,
          evidenceRefs: ['t1'],
          patternId: 'question_inversion',
          label: 'Question word order',
          explanation: null,
        },
      ],
      pronunciationIssues: [],
      hesitationIssues: [],
      scenarioPerformance: null,
      strengths: [],
      confidenceSummary: 'ok',
    }
    doc = mergeSessionInsightsIntoProfile(doc, first, {
      nowIso: '2026-04-01T12:00:00.000Z',
      scenarioId: 'sc1',
      sessionTypeWeight: 1,
      sessionType: 'speak_live',
    })
    doc.totalSessionsObserved = 3
    const second: SessionLearningInsights = {
      ...first,
      sessionId: 's-b',
      extractedAt: '2026-04-02T12:00:00.000Z',
      weakPatterns: [
        {
          source: 'live',
          severity: 2,
          severityScore: 1.2,
          confidence: 0.58,
          evidenceRefs: [],
          patternId: 'follow_up',
          label: 'Follow-up questions',
          explanation: null,
        },
      ],
    }
    doc = mergeSessionInsightsIntoProfile(doc, second, {
      nowIso: '2026-04-02T12:00:00.000Z',
      scenarioId: 'sc1',
      sessionTypeWeight: 1,
      sessionType: 'speak_live',
    })
    const metrics = doc.userSkillProfile?.metrics ?? {}
    const plan = buildSkillDrivenRecommendationPlan({ profile: doc, metrics })
    expect(plan.bundle.primary).toBeTruthy()
    expect(plan.items.length).toBeGreaterThan(3)
    expect(plan.items.some((i) => i.type === 'scenario')).toBe(true)
    expect(plan.bundle.focusChip?.kind === 'focus_chip' || plan.bundle.primary?.kind === 'coach').toBe(true)
  })
})
