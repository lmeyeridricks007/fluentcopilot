import { describe, expect, it } from 'vitest'
import { mapSessionInsightsToSkillEvidence } from './sessionSkillEvidenceMapper'
import {
  SESSION_LEARNING_INSIGHTS_SCHEMA_VERSION,
  type SessionLearningInsights,
} from '../learningMemory/sessionLearningInsightTypes'

function hesBase() {
  return {
    firstSeenAt: '2026-04-01T10:00:00.000Z',
    lastSeenAt: '2026-04-01T12:00:00.000Z',
    occurrences: 3,
    scenarioIds: [] as string[],
    evidenceRefs: [] as string[],
    recoveryScore: 0.4 as const,
  }
}

function baseInsights(): SessionLearningInsights {
  return {
    schemaVersion: SESSION_LEARNING_INSIGHTS_SCHEMA_VERSION,
    sessionId: 'thread-1',
    userId: 'u1',
    sessionType: 'speak_live',
    scenarioId: 'sc1',
    extractedAt: '2026-04-01T12:00:00.000Z',
    weakWords: [],
    weakPatterns: [],
    pronunciationIssues: [],
    hesitationIssues: [],
    scenarioPerformance: null,
    strengths: [],
    confidenceSummary: 'test',
  }
}

describe('sessionSkillEvidenceMapper', () => {
  it('returns no rows when the session has no skill-bearing signals', () => {
    const out = mapSessionInsightsToSkillEvidence(baseInsights(), {
      nowIso: '2026-04-01T12:00:00.000Z',
      scenarioId: 'sc1',
      scenarioSlugNorm: null,
      sessionType: 'speak_live',
      sessionTypeWeight: 1,
    })
    expect(out).toEqual([])
  })

  it('maps hesitation tied to questions onto asking_questions', () => {
    const insights = baseInsights()
    insights.hesitationIssues = [
      {
        ...hesBase(),
        source: 'live',
        patternId: 'hes_before_question_openers',
        label: 'Pause before question words',
        severityScore: 2,
        confidence: 0.7,
        signalSource: 'asr',
      },
    ]
    const out = mapSessionInsightsToSkillEvidence(insights, {
      nowIso: '2026-04-01T12:00:00.000Z',
      scenarioId: 'sc1',
      scenarioSlugNorm: null,
      sessionType: 'speak_live',
      sessionTypeWeight: 1,
    })
    const row = out.find((e) => e.source.startsWith('hesitation'))
    expect(row?.skillIds).toContain('asking_questions')
    expect(row?.skillIds).toContain('fluency')
  })

  it('maps scenario weak subskills through free-text skill hints', () => {
    const insights = baseInsights()
    insights.scenarioPerformance = {
      scenarioId: 'party-1',
      scenarioSlug: 'party_social',
      attempts: 2,
      rollingScore: null,
      recentScore: null,
      confidence: 0.8,
      strongSubskills: [],
      weakSubskills: ['Follow-up questions felt thin'],
      lastAttemptAt: '2026-04-01T11:00:00.000Z',
    }
    const out = mapSessionInsightsToSkillEvidence(insights, {
      nowIso: '2026-04-01T12:00:00.000Z',
      scenarioId: 'party-1',
      scenarioSlugNorm: 'party_social',
      sessionType: 'speak_live',
      sessionTypeWeight: 1,
    })
    const weak = out.filter((e) => e.source === 'scenario_perf:weak_subskill')
    expect(weak.length).toBeGreaterThan(0)
    expect(weak[0]?.skillIds).toContain('follow_up_questions')
    expect(weak[0]?.polarity).toBe('negative')
  })

  it('emits negative scenario score evidence when recentScore is low', () => {
    const insights = baseInsights()
    insights.scenarioPerformance = {
      scenarioId: 's1',
      scenarioSlug: 'small_talk',
      attempts: 3,
      rollingScore: null,
      recentScore: 55,
      confidence: 0.9,
      strongSubskills: [],
      weakSubskills: [],
      lastAttemptAt: '2026-04-01T11:00:00.000Z',
    }
    const out = mapSessionInsightsToSkillEvidence(insights, {
      nowIso: '2026-04-01T12:00:00.000Z',
      scenarioId: 's1',
      scenarioSlugNorm: 'small_talk',
      sessionType: 'speak_live',
      sessionTypeWeight: 1,
    })
    const scoreRow = out.find((e) => e.source === 'scenario_perf:score')
    expect(scoreRow?.polarity).toBe('negative')
    expect(scoreRow?.skillIds).toContain('reacting')
  })

  it('uses scenario slug skills for strengths when the label has no keyword match', () => {
    const insights = baseInsights()
    insights.strengths = [
      {
        label: 'Calm presence',
        source: 'eval',
        severity: 1,
        severityScore: 1,
        confidence: 0.6,
        evidenceRefs: [],
      },
    ]
    const out = mapSessionInsightsToSkillEvidence(insights, {
      nowIso: '2026-04-01T12:00:00.000Z',
      scenarioId: 'p1',
      scenarioSlugNorm: 'party_social',
      sessionType: 'speak_live',
      sessionTypeWeight: 1,
    })
    const row = out.find((e) => e.source.startsWith('strength'))
    expect(row?.polarity).toBe('positive')
    expect(row?.skillIds).toContain('reacting')
    expect(row?.skillIds).toContain('keeping_flow')
  })

  it('maps pronunciation issues to speaking skills', () => {
    const insights = baseInsights()
    insights.pronunciationIssues = [
      {
        source: 'live',
        severity: 2,
        severityScore: 1.5,
        confidence: 0.6,
        evidenceRefs: ['t1'],
        targetKey: 'ui:vowel',
        issueType: 'vowel',
      },
    ]
    const out = mapSessionInsightsToSkillEvidence(insights, {
      nowIso: '2026-04-01T12:00:00.000Z',
      scenarioId: 'sc1',
      scenarioSlugNorm: null,
      sessionType: 'speak_live',
      sessionTypeWeight: 1,
    })
    expect(out.length).toBeGreaterThan(0)
    const row = out.find((e) => e.source.startsWith('pronunciation'))
    expect(row?.skillIds).toContain('pronunciation')
    expect(row?.skillIds).toContain('fluency')
  })

  it('maps weak patterns to language skills', () => {
    const insights = baseInsights()
    insights.weakPatterns = [
      {
        source: 'chat',
        severity: 2,
        severityScore: 1.2,
        confidence: 0.55,
        evidenceRefs: [],
        patternId: 'word_order_question',
        label: 'Question word order',
        explanation: null,
      },
    ]
    const out = mapSessionInsightsToSkillEvidence(insights, {
      nowIso: '2026-04-01T12:00:00.000Z',
      scenarioId: 'sc1',
      scenarioSlugNorm: 'train_station',
      sessionType: 'text_conversation',
      sessionTypeWeight: 0.9,
    })
    const hit = out.find((e) => e.source.startsWith('weak_pattern'))
    expect(hit?.skillIds.length).toBeGreaterThan(0)
  })
})
