import { describe, expect, it } from 'vitest'
import type { ReadAloudEvaluateResult } from '../../services/read-aloud/readAloudEvaluateTypes'
import { extractSessionInsightsFromReadAloud } from './sessionInsightExtraction'
import { mergeSessionInsightsIntoProfile } from './userLearningProfileMergeService'
import { createEmptyUserLearningProfile } from './userLearningProfileDocument'

describe('extractSessionInsightsFromReadAloud + merge', () => {
  it('maps coaching focus into weakPatterns and merges into profile', () => {
    const result = {
      reportKind: 'read_aloud',
      targetText: 'Hallo wereld.',
      recognizedText: 'Hallo wereld.',
      pronunciationAssessment: null,
      pronunciationApi: { summaryFeedback: null, recommendedNextStep: null, caveats: [] },
      dimensions: {},
      sentences: [],
      weakWords: [],
      coaching: {
        summary: 'Goed ritme.',
        focusArea: 'word stress on two-syllable words',
        nextStepDrills: [],
        feedbackLines: ['Let op klemtoon.'],
      },
      nextActions: [],
      evaluationMode: 'segmented_timed_llm',
    } as unknown as ReadAloudEvaluateResult

    const insights = extractSessionInsightsFromReadAloud({
      sessionId: 'ra-1',
      userId: 'u-read',
      result,
    })
    expect(insights.sessionType).toBe('read_aloud')
    expect(insights.weakPatterns.some((p) => p.source === 'read_aloud_coaching')).toBe(true)

    const base = createEmptyUserLearningProfile('u-read')
    base.totalSessionsObserved = 2
    const merged = mergeSessionInsightsIntoProfile(base, insights, {
      nowIso: insights.extractedAt,
      scenarioId: null,
      sessionTypeWeight: 0.92,
      sessionType: 'read_aloud',
    })
    expect(merged.weakGrammarPatterns.length).toBeGreaterThan(0)
    expect(merged.totalSessionsObserved).toBe(3)
  })
})
