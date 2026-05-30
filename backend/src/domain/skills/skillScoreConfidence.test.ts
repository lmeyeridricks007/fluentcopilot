import { describe, expect, it } from 'vitest'
import type { SkillEvidence } from './skillTypes'
import { computeSkillMetricConfidence } from './skillScoreConfidence'

function row(p: Partial<SkillEvidence>): SkillEvidence {
  return {
    id: p.id ?? 'id',
    sessionId: p.sessionId ?? 's1',
    at: p.at ?? '2026-04-01T12:00:00.000Z',
    sessionType: p.sessionType ?? 'speak_live',
    source: p.source ?? 'weak_vocab:x',
    polarity: p.polarity ?? 'negative',
    magnitude: p.magnitude ?? 0.5,
    weight: p.weight ?? 1,
    skillIds: p.skillIds ?? ['grammar'],
  }
}

describe('computeSkillMetricConfidence', () => {
  it('stays low with a single modality and few rows', () => {
    const rows = [row({}), row({ id: '2', sessionId: 's2', at: '2026-04-02T12:00:00.000Z' })]
    expect(
      computeSkillMetricConfidence({
        evidenceCount: 3,
        rowsForSkill: rows,
        skillId: 'grammar',
        nowMs: Date.parse('2026-04-10T12:00:00.000Z'),
      }),
    ).toBe('low')
  })

  it('rises with multiple modalities and spread timestamps', () => {
    const rows: SkillEvidence[] = []
    for (let i = 0; i < 8; i++) {
      rows.push(
        row({
          id: `g${i}`,
          sessionId: `sess-${i}`,
          sessionType: i % 2 === 0 ? 'speak_live' : 'read_aloud',
          at: `2026-0${3 + Math.floor(i / 3)}-${10 + i}T12:00:00.000Z`,
          magnitude: 0.62,
        }),
      )
    }
    const c = computeSkillMetricConfidence({
      evidenceCount: 20,
      rowsForSkill: rows,
      skillId: 'grammar',
      nowMs: Date.parse('2026-06-01T12:00:00.000Z'),
    })
    expect(c === 'medium' || c === 'high').toBe(true)
  })
})
