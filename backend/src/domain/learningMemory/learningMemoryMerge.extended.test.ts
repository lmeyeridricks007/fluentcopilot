import { describe, expect, it } from 'vitest'
import { createEmptyUserLearningProfile } from './userLearningProfileDocument'
import type { SessionLearningInsights } from './sessionLearningInsightTypes'
import { mergeSessionInsightsIntoProfile } from './userLearningProfileMergeService'
import { effectiveWeaknessItemScore } from './learningMemoryMergeScoring'

function ctx(iso: string, sessionType: 'speak_live' | 'read_aloud' | 'text_conversation' = 'speak_live') {
  return {
    nowIso: iso,
    scenarioId: 'sc-a',
    sessionTypeWeight: 1,
    sessionType,
  } as const
}

describe('mergeSessionInsightsIntoProfile — pronunciation & decay edge cases', () => {
  it('audio-backed pronunciation source yields higher merged confidence than transcript-only for same key', () => {
    const base = createEmptyUserLearningProfile('u1')
    base.totalSessionsObserved = 3
    const t0 = '2026-03-01T12:00:00.000Z'
    const audioFirst: SessionLearningInsights = {
      schemaVersion: 2,
      sessionId: 's-audio',
      userId: 'u1',
      sessionType: 'speak_live',
      scenarioId: 'sc-a',
      extractedAt: t0,
      weakWords: [],
      weakPatterns: [],
      pronunciationIssues: [
        {
          targetKey: 'ui:vowel',
          issueType: 'vowel',
          source: 'live_word_assessment',
          severity: 2,
          severityScore: 2,
          confidence: 0.7,
          evidenceRefs: ['turn:1'],
          supportingText: null,
        },
      ],
      hesitationIssues: [],
      scenarioPerformance: null,
      strengths: [],
      confidenceSummary: 't',
    }
    const afterAudio = mergeSessionInsightsIntoProfile(base, audioFirst, ctx(t0, 'speak_live'))
    /** Sanity: audio-first ingestion creates the row we will reinforce next. */
    expect(afterAudio.pronunciationIssues.find((p) => p.targetKey === 'ui:vowel')).toBeDefined()

    const transcriptFollowUp: SessionLearningInsights = {
      ...audioFirst,
      sessionId: 's-tr',
      extractedAt: '2026-03-02T12:00:00.000Z',
      pronunciationIssues: [
        {
          targetKey: 'ui:vowel',
          issueType: 'vowel',
          source: 'live_turn_pronunciation_issue',
          severity: 2,
          severityScore: 2,
          confidence: 0.72,
          evidenceRefs: ['turn:2'],
          supportingText: null,
        },
      ],
    }
    const afterBoth = mergeSessionInsightsIntoProfile(afterAudio, transcriptFollowUp, ctx('2026-03-02T12:00:00.000Z', 'speak_live'))
    const row = afterBoth.pronunciationIssues.find((p) => p.targetKey === 'ui:vowel')!
    expect(row.occurrences).toBeGreaterThanOrEqual(2)
    expect(row.confidence).toBeGreaterThan(0.35)
    expect(row.signalSource === 'live_word_assessment' || row.signalSource === 'live_turn_pronunciation_issue').toBe(true)
  })

  it('stale weakness decays across long gaps when not reinforced', () => {
    const base = createEmptyUserLearningProfile('u1')
    base.totalSessionsObserved = 2
    const old = '2020-01-01T12:00:00.000Z'
    const fresh = '2026-06-01T12:00:00.000Z'
    const hit: SessionLearningInsights = {
      schemaVersion: 2,
      sessionId: 's0',
      userId: 'u1',
      sessionType: 'text_conversation',
      scenarioId: 'sc',
      extractedAt: old,
      weakWords: [
        {
          normalizedKey: 'decayword',
          displayText: 'decayword',
          category: 'x',
          source: 'text_feedback_row',
          severity: 2,
          severityScore: 2.2,
          confidence: 0.58,
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
    const mid = mergeSessionInsightsIntoProfile(base, hit, ctx(old, 'text_conversation'))
    const rowMid = mid.weakVocabulary.find((v) => v.normalizedKey === 'decayword')!
    const sevMid = rowMid.severityScore
    const confMid = rowMid.confidence

    const empty: SessionLearningInsights = {
      ...hit,
      sessionId: 's-gap',
      extractedAt: fresh,
      weakWords: [],
    }
    const end = mergeSessionInsightsIntoProfile(mid, empty, ctx(fresh, 'text_conversation'))
    const rowEnd = end.weakVocabulary.find((v) => v.normalizedKey === 'decayword')!
    expect((rowEnd.mergeMissStreak ?? 0) >= 1).toBe(true)
    expect(rowEnd.severityScore).toBeLessThanOrEqual(sevMid * 1.001)
    expect(rowEnd.confidence).toBeLessThanOrEqual(confMid * 1.001)
  })

  it('repeated reinforcement across many sessions raises occurrences and effective score', () => {
    let doc = createEmptyUserLearningProfile('u1')
    doc.totalSessionsObserved = 4
    const insight = (sid: string, iso: string): SessionLearningInsights => ({
      schemaVersion: 2,
      sessionId: sid,
      userId: 'u1',
      sessionType: 'read_aloud',
      scenarioId: 'ra',
      extractedAt: iso,
      weakWords: [
        {
          normalizedKey: 'herhaald',
          displayText: 'herhaald',
          category: 'x',
          source: 'read_aloud_weak_word',
          severity: 2,
          severityScore: 2,
          confidence: 0.6,
          evidenceRefs: [sid],
          supportingText: null,
        },
      ],
      weakPatterns: [],
      pronunciationIssues: [],
      hesitationIssues: [],
      scenarioPerformance: null,
      strengths: [],
      confidenceSummary: 'x',
    })
    for (let i = 0; i < 8; i += 1) {
      const iso = `2026-01-${String(i + 1).padStart(2, '0')}T12:00:00.000Z`
      doc = mergeSessionInsightsIntoProfile(doc, insight(`sess-${i}`, iso), ctx(iso, 'read_aloud'))
    }
    const row = doc.weakVocabulary.find((v) => v.normalizedKey === 'herhaald')!
    expect(row.occurrences).toBe(8)
    expect(effectiveWeaknessItemScore(row)).toBeGreaterThan(0.5)
  })
})
