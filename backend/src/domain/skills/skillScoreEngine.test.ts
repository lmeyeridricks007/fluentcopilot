import { describe, expect, it } from 'vitest'
import {
  applySessionEvidenceToMetrics,
  overallSkillScoreFromMetrics,
  scoreToState,
  trendToUserFacingLabel,
} from './skillScoreEngine'
import type { SkillEvidence } from './skillTypes'

function ev(partial: Partial<SkillEvidence>): SkillEvidence {
  return {
    id: 'e1',
    sessionId: 's1',
    at: '2026-04-01T12:00:00.000Z',
    sessionType: 'speak_live',
    source: 'test',
    polarity: 'negative',
    magnitude: 0.5,
    weight: 1,
    skillIds: ['pronunciation'],
    ...partial,
  }
}

describe('skillScoreEngine', () => {
  it('maps score bands to human states', () => {
    expect(scoreToState(30)).toBe('needs_work')
    expect(scoreToState(48)).toBe('building')
    expect(scoreToState(60)).toBe('improving')
    expect(scoreToState(78)).toBe('solid')
    expect(scoreToState(90)).toBe('strong')
  })

  it('smooths noisy single-session spikes via low alpha', () => {
    const prev = {
      pronunciation: {
        skillId: 'pronunciation' as const,
        group: 'speaking' as const,
        score: 60,
        state: 'improving' as const,
        trend: 'flat' as const,
        confidence: 'medium' as const,
        evidenceCount: 10,
        lastUpdatedAt: '2026-03-01T12:00:00.000Z',
        sourceMix: ['a'],
        baselineScore: 59,
      },
    }
    const sessionEvidence: SkillEvidence[] = [
      ev({ polarity: 'negative', magnitude: 0.95, weight: 1, skillIds: ['pronunciation'] }),
    ]
    const next = applySessionEvidenceToMetrics({
      prev,
      sessionEvidence,
      sessionTypeWeight: 1,
      nowIso: '2026-04-02T12:00:00.000Z',
    })
    const s = next.pronunciation?.score ?? 0
    expect(s).toBeGreaterThan(35)
    expect(s).toBeLessThan(60)
  })

  it('computes overall only when enough metrics exist', () => {
    expect(overallSkillScoreFromMetrics({})).toBeNull()
  })

  it('exposes user-facing trend labels', () => {
    expect(trendToUserFacingLabel('up', 'medium')).toBe('improving')
    expect(trendToUserFacingLabel('unstable', 'high')).toBe('not_enough_data')
  })

  it('dampens more when session evidence quality is thin', () => {
    const prev = {
      pronunciation: {
        skillId: 'pronunciation' as const,
        group: 'speaking' as const,
        score: 70,
        state: 'improving' as const,
        trend: 'flat' as const,
        confidence: 'medium' as const,
        evidenceCount: 8,
        lastUpdatedAt: '2026-03-01T12:00:00.000Z',
        sourceMix: ['a'],
        baselineScore: 69,
      },
    }
    const weakSession: SkillEvidence[] = [
      ev({
        polarity: 'negative',
        magnitude: 0.08,
        weight: 0.2,
        skillIds: ['pronunciation'],
        source: 'report_atom:test',
      }),
    ]
    const strongSession: SkillEvidence[] = [
      ev({ polarity: 'negative', magnitude: 0.95, weight: 1, skillIds: ['pronunciation'] }),
    ]
    const nextWeak = applySessionEvidenceToMetrics({
      prev,
      sessionEvidence: weakSession,
      recentEvidenceRing: [],
      sessionTypeWeight: 1,
      nowIso: '2026-04-02T12:00:00.000Z',
    })
    const nextStrong = applySessionEvidenceToMetrics({
      prev,
      sessionEvidence: strongSession,
      recentEvidenceRing: [],
      sessionTypeWeight: 1,
      nowIso: '2026-04-02T12:00:00.000Z',
    })
    const deltaWeak = Math.abs(70 - (nextWeak.pronunciation?.score ?? 0))
    const deltaStrong = Math.abs(70 - (nextStrong.pronunciation?.score ?? 0))
    expect(deltaWeak).toBeLessThan(deltaStrong)
  })
})
