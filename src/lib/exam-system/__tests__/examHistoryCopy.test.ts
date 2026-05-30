import { describe, expect, it } from 'vitest'
import type { ExamSessionRecord } from '@/lib/exam-system/types'
import {
  buildExamSessionActivityPayload,
  defaultExamHistoryFilters,
  examSessionFootNote,
  examSessionHistoryStatus,
  examSessionModality,
  examSessionPrimaryAction,
  examSimulationRunHref,
  examTrainingRunHref,
  filterExamSessions,
} from '@/features/exam-system/examHistoryCopy'

function sessionStub(partial: Partial<ExamSessionRecord>): ExamSessionRecord {
  return {
    id: 'exam-test-1',
    userId: 'u1',
    profileId: 'inburgering_speaking_v1',
    level: 'A2',
    mode: 'simulation',
    scope: 'section',
    status: 'completed',
    tasks: [],
    attempts: [],
    createdAt: '2026-06-01T10:00:00.000Z',
    updatedAt: '2026-06-10T10:00:00.000Z',
    ...partial,
  } as ExamSessionRecord
}

describe('filterExamSessions', () => {
  const now = Date.now()
  const sessions: ExamSessionRecord[] = [
    sessionStub({
      id: 'a',
      mode: 'simulation',
      level: 'A1',
      profileId: 'p1',
      updatedAt: new Date(now - 2 * 86400_000).toISOString(),
    }),
    sessionStub({
      id: 'b',
      mode: 'training',
      level: 'B1',
      profileId: 'p2',
      updatedAt: new Date(now - 20 * 86400_000).toISOString(),
    }),
  ]

  it('filters by mode, level, profile, and date preset', () => {
    expect(filterExamSessions(sessions, { ...defaultExamHistoryFilters(), runMode: 'training' })).toHaveLength(1)
    expect(filterExamSessions(sessions, { ...defaultExamHistoryFilters(), level: 'A1' })).toHaveLength(1)
    expect(filterExamSessions(sessions, { ...defaultExamHistoryFilters(), profileId: 'p2' })).toHaveLength(1)
    const recent = filterExamSessions(sessions, { ...defaultExamHistoryFilters(), datePreset: '7d' })
    expect(recent).toHaveLength(1)
    expect(recent[0].id).toBe('a')
  })
})

describe('exam session reopen CTAs', () => {
  it('links completed simulation to report route', () => {
    const s = sessionStub({
      mode: 'simulation',
      status: 'completed',
      report: { kind: 'simulation' } as ExamSessionRecord['report'],
    })
    expect(examSessionPrimaryAction(s).href).toContain('simulation/report')
  })

  it('links in-progress training to training run', () => {
    const s = sessionStub({ mode: 'training', status: 'in_progress' })
    expect(examSessionPrimaryAction(s).href).toBe(examTrainingRunHref(s.id))
  })

  it('links in-progress simulation to simulation run', () => {
    const s = sessionStub({ mode: 'simulation', status: 'in_progress' })
    expect(examSessionPrimaryAction(s).href).toBe(examSimulationRunHref(s.id))
  })

  it('maps modality by run mode', () => {
    expect(examSessionModality(sessionStub({ mode: 'simulation' }))).toBe('exam_simulation')
    expect(examSessionModality(sessionStub({ mode: 'training' }))).toBe('exam_training')
  })

  it('marks in-progress as active history status', () => {
    expect(examSessionHistoryStatus(sessionStub({ status: 'in_progress' }))).toBe('active')
    expect(examSessionHistoryStatus(sessionStub({ status: 'completed' }))).toBe('ended')
  })

  it('shows XP footnote when progression field present', () => {
    expect(examSessionFootNote(sessionStub({ progressionXpAwarded: 22 }))).toBe('+22 XP')
    expect(examSessionFootNote(sessionStub({}))).toBeNull()
  })
})

describe('buildExamSessionActivityPayload', () => {
  it('tags simulation vs training for session activity store', () => {
    const sim = buildExamSessionActivityPayload(
      {
        id: 'x',
        profileId: 'inburgering_speaking_v1',
        level: 'A2',
        mode: 'simulation',
        scope: 'full',
      },
      10,
    )
    expect(sim.kind).toBe('exam_simulation')
    expect(sim.outcome).toBe('+10 XP')
    const tr = buildExamSessionActivityPayload(
      {
        id: 'y',
        profileId: 'inburgering_speaking_v1',
        level: 'A2',
        mode: 'training',
        scope: 'section',
      },
      null,
    )
    expect(tr.kind).toBe('exam_training')
    expect(tr.outcome).toBeUndefined()
  })
})
