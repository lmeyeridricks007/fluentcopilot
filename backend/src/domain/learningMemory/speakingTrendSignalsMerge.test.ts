import { describe, expect, it } from 'vitest'
import { SpeakLiveLearningEvaluationArtifactsV1Schema } from './speakLiveLearningEvaluationArtifacts.schema'
import type { SessionLearningInsights } from './sessionLearningInsightTypes'
import { createEmptyUserLearningProfile } from './userLearningProfileDocument'
import { mergeSessionInsightsIntoProfile } from './userLearningProfileMergeService'
import { mergeSpeakingTrendSignalsIntoProfile } from './speakingTrendSignalsMerge'

function artifact(overrides: Partial<ReturnType<typeof SpeakLiveLearningEvaluationArtifactsV1Schema.parse>> = {}) {
  return SpeakLiveLearningEvaluationArtifactsV1Schema.parse({
    version: 1,
    capturedAt: '2026-05-01T10:00:00.000Z',
    scenarioId: 'sc-1',
    scenarioSlug: 'cafe-order',
    cefr: {
      practicedLevel: 'A2',
      observedLevel: 'A2',
      targetLevel: 'B1',
      learnerLevel: 'A2',
    },
    sessionScoreSnapshot: {
      overallVoiceScore: 72,
      pronunciationScore: 58,
      fluencyScore: 64,
      pacingScore: 61,
      grammarSessionScore: 63,
      confidenceEstimate: 55,
      scenarioCompletionScore: 78,
    },
    transcriptEval: {
      coachSummarySnippet: null,
      whatToTryNext: [],
      strongestAreas: [],
      weakestAreas: [],
    },
    pronunciationEval: { pronunciationFindingLines: [], mergedPronunciationScore: null },
    weakWords: ['misschien'],
    hesitationPatterns: [],
    pacingIssues: [],
    grammarPatterns: [],
    recurringCorrections: [],
    ...overrides,
  })
}

function speakInsight(iso: string, sid: string, art: ReturnType<typeof artifact>): SessionLearningInsights {
  return {
    schemaVersion: 2,
    sessionId: sid,
    userId: 'u-sp',
    sessionType: 'speak_live',
    scenarioId: 'sc-1',
    extractedAt: iso,
    weakWords: [],
    weakPatterns: [],
    pronunciationIssues: [],
    hesitationIssues: [],
    scenarioPerformance: null,
    strengths: [],
    confidenceSummary: 't',
    speakingEvaluationArtifactsV1: art,
  }
}

describe('mergeSpeakingTrendSignalsIntoProfile', () => {
  it('rolls score series and weak word keys from speak_live artifacts', () => {
    const base = createEmptyUserLearningProfile('u-sp')
    const ins = speakInsight('2026-05-01T12:00:00.000Z', 'sess-1', artifact())
    const next = mergeSpeakingTrendSignalsIntoProfile(base, ins, '2026-05-01T12:00:00.000Z')
    expect(next.speakingTrendSignalsV1?.overallVoiceScoreSeries).toEqual([72])
    expect(next.speakingTrendSignalsV1?.pronunciationScoreSeries?.[0]).toBe(58)
    expect(next.speakingTrendSignalsV1?.recentWeakWordKeys).toContain('misschien')
  })

  it('computes pronunciation delta after a second session via mergeSessionInsightsIntoProfile', () => {
    let doc = createEmptyUserLearningProfile('u-sp')
    const ctx = (iso: string) =>
      ({ nowIso: iso, scenarioId: 'sc-1', sessionTypeWeight: 1, sessionType: 'speak_live' as const })
    doc = mergeSessionInsightsIntoProfile(
      doc,
      speakInsight('2026-05-01T12:00:00.000Z', 'a', artifact()),
      ctx('2026-05-01T12:00:00.000Z'),
    )
    doc = mergeSessionInsightsIntoProfile(
      doc,
      speakInsight(
        '2026-05-02T12:00:00.000Z',
        'b',
        artifact({
          sessionScoreSnapshot: {
            overallVoiceScore: 75,
            pronunciationScore: 70,
            fluencyScore: 66,
            pacingScore: 62,
            grammarSessionScore: 65,
            confidenceEstimate: 60,
            scenarioCompletionScore: 80,
          },
        }),
      ),
      ctx('2026-05-02T12:00:00.000Z'),
    )
    expect(doc.speakingTrendSignalsV1?.pronunciationScoreSeries?.length).toBe(2)
    expect(doc.speakingTrendSignalsV1?.pronunciationDeltaLastVsPriorMean).toBe(12)
  })
})
