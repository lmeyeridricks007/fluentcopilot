import { describe, expect, it } from 'vitest'
import { mergeSessionInsightsIntoProfile } from '../learningMemory/userLearningProfileMergeService'
import { createEmptyUserLearningProfile } from '../learningMemory/userLearningProfileDocument'
import { SESSION_LEARNING_INSIGHTS_SCHEMA_VERSION, type SessionLearningInsights } from '../learningMemory/sessionLearningInsightTypes'

describe('mergeSessionInsightsIntoProfile + skills', () => {
  it('creates userSkillProfile after merge', () => {
    const base = createEmptyUserLearningProfile('user-1')
    const insights: SessionLearningInsights = {
      schemaVersion: SESSION_LEARNING_INSIGHTS_SCHEMA_VERSION,
      sessionId: 'sess-1',
      userId: 'user-1',
      sessionType: 'read_aloud',
      scenarioId: null,
      extractedAt: '2026-04-01T12:00:00.000Z',
      weakWords: [
        {
          source: 'read',
          severity: 2,
          severityScore: 1.1,
          confidence: 0.5,
          evidenceRefs: [],
          normalizedKey: 'fiets',
          displayText: 'fiets',
          category: 'noun',
        },
      ],
      weakPatterns: [],
      pronunciationIssues: [],
      hesitationIssues: [],
      scenarioPerformance: null,
      strengths: [],
      confidenceSummary: 'x',
    }
    const merged = mergeSessionInsightsIntoProfile(base, insights, {
      nowIso: '2026-04-01T12:00:00.000Z',
      scenarioId: null,
      sessionTypeWeight: 0.92,
      sessionType: 'read_aloud',
    })
    expect(merged.userSkillProfile).toBeTruthy()
    expect(merged.userSkillProfile?.metrics.vocabulary?.skillId).toBe('vocabulary')
    expect(merged.userSkillProfile?.recentEvidence.length).toBeGreaterThan(0)
  })
})
