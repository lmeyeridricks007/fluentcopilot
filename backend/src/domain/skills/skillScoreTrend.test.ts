import { describe, expect, it } from 'vitest'
import type { SkillEvidence } from './skillTypes'
import { computeTrendFromEvidenceWindows } from './skillScoreTrend'

function row(p: Partial<SkillEvidence> & Pick<SkillEvidence, 'at' | 'sessionId'>): SkillEvidence {
  return {
    id: p.id ?? Math.random().toString(36).slice(2),
    sessionId: p.sessionId,
    at: p.at,
    sessionType: p.sessionType ?? 'speak_live',
    source: p.source ?? 'test',
    polarity: p.polarity ?? 'negative',
    magnitude: p.magnitude ?? 0.4,
    weight: p.weight ?? 1,
    skillIds: p.skillIds ?? ['fluency'],
    note: p.note,
  }
}

describe('skillScoreTrend', () => {
  it('returns null when fewer than six evidence rows', () => {
    const ring = [row({ sessionId: 'a', at: '2026-01-01T12:00:00.000Z' })]
    expect(
      computeTrendFromEvidenceWindows({
        ringRows: ring,
        skillId: 'fluency',
        nowMs: Date.parse('2026-06-01T12:00:00.000Z'),
        evidenceCount: 12,
        confidence: 'high',
      }),
    ).toBeNull()
  })

  it('detects upward move when recent window is clearly stronger than prior', () => {
    const ring: SkillEvidence[] = []
    for (let i = 0; i < 5; i++) {
      ring.push(
        row({
          sessionId: `old-${i}`,
          at: `2026-01-${String(i + 1).padStart(2, '0')}T12:00:00.000Z`,
          polarity: 'negative',
          magnitude: 0.55,
          skillIds: ['fluency'],
        }),
      )
    }
    for (let i = 0; i < 5; i++) {
      ring.push(
        row({
          sessionId: `new-${i}`,
          at: `2026-05-${String(i + 1).padStart(2, '0')}T12:00:00.000Z`,
          polarity: 'positive',
          magnitude: 0.75,
          skillIds: ['fluency'],
        }),
      )
    }
    const t = computeTrendFromEvidenceWindows({
      ringRows: ring,
      skillId: 'fluency',
      nowMs: Date.parse('2026-06-01T12:00:00.000Z'),
      evidenceCount: 24,
      confidence: 'high',
    })
    expect(t).toBe('up')
  })
})
