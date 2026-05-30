import { describe, expect, it } from 'vitest'
import { createEmptyUserLearningProfile } from '../../domain/learningMemory/userLearningProfileDocument'
import { SESSION_LEARNING_INSIGHTS_SCHEMA_VERSION, type SessionLearningInsights } from '../../domain/learningMemory/sessionLearningInsightTypes'
import { recomputeUserSkillProfileOnDocFromInsightsRows } from './userSkillProfilePersistenceService'

function insightJson(weakWord: string): string {
  const insights: SessionLearningInsights = {
    schemaVersion: SESSION_LEARNING_INSIGHTS_SCHEMA_VERSION,
    sessionId: `s-${weakWord}`,
    userId: 'u1',
    sessionType: 'read_aloud',
    scenarioId: null,
    extractedAt: '2026-04-01T12:00:00.000Z',
    weakWords: [
      {
        source: 'test',
        severity: 2,
        severityScore: 1.2,
        confidence: 0.55,
        evidenceRefs: [],
        normalizedKey: weakWord,
        displayText: weakWord,
        category: 'noun',
      },
    ],
    weakPatterns: [],
    pronunciationIssues: [],
    hesitationIssues: [],
    scenarioPerformance: null,
    strengths: [],
    confidenceSummary: 't',
  }
  return JSON.stringify(insights)
}

describe('userSkillProfilePersistenceService', () => {
  it('recomputeUserSkillProfileOnDocFromInsightsRows rebuilds metrics from insight rows', () => {
    const doc = createEmptyUserLearningProfile('u1')
    const rows = [
      {
        insightsJson: insightJson('fiets'),
        sessionType: 'read_aloud' as const,
        scenarioId: null,
        createdAt: '2026-04-01T12:00:00.000Z',
      },
      {
        insightsJson: insightJson('brood'),
        sessionType: 'read_aloud' as const,
        scenarioId: null,
        createdAt: '2026-04-02T12:00:00.000Z',
      },
    ]
    const sp = recomputeUserSkillProfileOnDocFromInsightsRows(doc, rows)
    expect(sp.metrics.vocabulary?.evidenceCount).toBeGreaterThan(0)
    expect(sp.snapshots.length).toBeGreaterThanOrEqual(1)
  })
})
