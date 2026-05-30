import { describe, expect, it } from 'vitest'
import { createEmptyUserLearningProfile } from '../../domain/learningMemory/userLearningProfileDocument'
import type { SessionLearningInsights } from '../../domain/learningMemory/sessionInsightExtraction'
import { mergeSessionInsightsIntoProfile } from '../../domain/learningMemory/userLearningProfileMergeService'
import { extractSessionInsightsFromTextConversation } from '../../domain/learningMemory/sessionInsightExtraction'

describe('mergeSessionInsightsIntoProfile', () => {
  it('accumulates weak vocabulary with rising confidence on repeat', () => {
    const base = createEmptyUserLearningProfile('user-1')
    base.totalSessionsObserved = 2
    const now = new Date().toISOString()
    const insights: SessionLearningInsights = {
      schemaVersion: 2,
      sessionId: 'thread-a',
      userId: 'user-1',
      sessionType: 'text_conversation',
      scenarioId: 'sc1',
      extractedAt: now,
      weakWords: [
        {
          normalizedKey: 'station',
          displayText: 'station',
          category: 'test',
          source: 'text_feedback_row',
          severity: 1,
          severityScore: 1,
          confidence: 0.62,
          evidenceRefs: ['thread:thread-a'],
          supportingText: null,
        },
      ],
      weakPatterns: [],
      pronunciationIssues: [],
      hesitationIssues: [],
      scenarioPerformance: null,
      strengths: [],
      confidenceSummary: 'unit',
    }
    const merged = mergeSessionInsightsIntoProfile(base, insights, {
      nowIso: now,
      scenarioId: 'sc1',
      sessionTypeWeight: 1,
      sessionType: 'text_conversation',
    })
    expect(merged.weakVocabulary.some((v) => v.normalizedKey === 'station')).toBe(true)
    const again = mergeSessionInsightsIntoProfile(merged, insights, {
      nowIso: new Date().toISOString(),
      scenarioId: 'sc1',
      sessionTypeWeight: 1,
      sessionType: 'text_conversation',
    })
    const row = again.weakVocabulary.find((v) => v.normalizedKey === 'station')
    expect(row?.occurrences).toBe(2)
    expect(row?.confidence ?? 0).toBeGreaterThan(0.42)
  })

  it('increments mergeMissStreak and recovery when a weakness is not reinforced', () => {
    const base = createEmptyUserLearningProfile('user-1')
    base.totalSessionsObserved = 1
    const t0 = '2026-01-01T12:00:00.000Z'
    const insightsStation: import('../../domain/learningMemory/sessionLearningInsightTypes').SessionLearningInsights = {
      schemaVersion: 2,
      sessionId: 's1',
      userId: 'user-1',
      sessionType: 'text_conversation',
      scenarioId: 'sc1',
      extractedAt: t0,
      weakWords: [
        {
          normalizedKey: 'station',
          displayText: 'station',
          category: 'x',
          source: 'text',
          severity: 2,
          severityScore: 2,
          confidence: 0.55,
          evidenceRefs: ['a'],
          supportingText: null,
        },
      ],
      weakPatterns: [],
      pronunciationIssues: [],
      hesitationIssues: [],
      scenarioPerformance: null,
      strengths: [],
      confidenceSummary: 'x',
    }
    const emptyFollowUp: import('../../domain/learningMemory/sessionLearningInsightTypes').SessionLearningInsights = {
      ...insightsStation,
      sessionId: 's2',
      extractedAt: '2026-02-01T12:00:00.000Z',
      weakWords: [],
    }
    const ctx = (iso: string) =>
      ({
        nowIso: iso,
        scenarioId: 'sc1',
        sessionTypeWeight: 0.85,
        sessionType: 'text_conversation' as const,
      }) satisfies import('../../domain/learningMemory/userLearningProfileMergeService').MergeContext

    const after1 = mergeSessionInsightsIntoProfile(base, insightsStation, ctx(t0))
    const row1 = after1.weakVocabulary.find((v) => v.normalizedKey === 'station')!
    expect(row1.mergeMissStreak ?? 0).toBe(0)
    const after2 = mergeSessionInsightsIntoProfile(after1, emptyFollowUp, ctx('2026-02-15T12:00:00.000Z'))
    const row2 = after2.weakVocabulary.find((v) => v.normalizedKey === 'station')!
    expect((row2.mergeMissStreak ?? 0) >= 1).toBe(true)
    expect(row2.recoveryScore).toBeGreaterThanOrEqual(row1.recoveryScore)
  })
})

describe('extractSessionInsightsFromTextConversation', () => {
  it('maps feedback rows into weakWords and weakPatterns', () => {
    const insights = extractSessionInsightsFromTextConversation({
      sessionId: 't1',
      userId: 'user-1',
      summary: {
        threadId: 't1',
        whatWentWell: ['Good pace'],
        whatToImprove: ['Articles'],
        correctedPhrases: [],
        suggestedNextAction: 'keep going',
        saveWordCandidates: [],
      },
      feedback: [
        {
          id: '1',
          threadId: 't1',
          linkedMessageId: 'm1',
          category: 'grammar',
          originalText: 'de man',
          correctedText: 'de mannen',
          explanation: 'Number agreement',
          severity: 'info',
          createdAt: new Date().toISOString(),
        },
      ],
      scenarioId: 'sc',
      scenarioSlug: 'train-station',
    })
    expect(insights.weakWords.length).toBeGreaterThan(0)
    expect(insights.weakPatterns.length).toBeGreaterThan(0)
    expect(insights.sessionId).toBe('t1')
    expect(insights.userId).toBe('user-1')
  })
})
