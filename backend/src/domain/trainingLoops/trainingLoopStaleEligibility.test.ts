import { describe, expect, it } from 'vitest'
import { ACTIVE_LOOP_IGNORE_STALE_DAYS, IN_PROGRESS_LOOP_ABANDON_STALE_DAYS } from './trainingLoopLifecycleConstants'
import { demotedPriorityScoreAfterDismiss, shouldTransitionLoopToStale } from './trainingLoopStaleEligibility'

const MS_DAY = 86_400_000

describe('shouldTransitionLoopToStale', () => {
  it('returns false for terminal or unknown statuses', () => {
    const base = { nowMs: 0, expiresAt: null, createdAt: new Date(0), updatedAt: new Date(0) }
    expect(shouldTransitionLoopToStale({ ...base, status: 'completed' })).toBe(false)
    expect(shouldTransitionLoopToStale({ ...base, status: 'stale' })).toBe(false)
  })

  it('marks active when ExpiresAt is in the past', () => {
    const nowMs = Date.parse('2026-06-01T12:00:00.000Z')
    expect(
      shouldTransitionLoopToStale({
        status: 'active',
        expiresAt: new Date(nowMs - MS_DAY),
        createdAt: new Date(nowMs - MS_DAY * 2),
        updatedAt: new Date(nowMs - MS_DAY * 2),
        nowMs,
      }),
    ).toBe(true)
  })

  it('marks active never-started older than ACTIVE_LOOP_IGNORE_STALE_DAYS', () => {
    const nowMs = Date.parse('2026-06-20T12:00:00.000Z')
    const createdAt = new Date(nowMs - (ACTIVE_LOOP_IGNORE_STALE_DAYS + 1) * MS_DAY)
    expect(
      shouldTransitionLoopToStale({
        status: 'active',
        expiresAt: null,
        createdAt,
        updatedAt: createdAt,
        nowMs,
      }),
    ).toBe(true)
  })

  it('does not mark fresh active loops', () => {
    const nowMs = Date.parse('2026-06-20T12:00:00.000Z')
    const createdAt = new Date(nowMs - 2 * MS_DAY)
    expect(
      shouldTransitionLoopToStale({
        status: 'active',
        expiresAt: null,
        createdAt,
        updatedAt: createdAt,
        nowMs,
      }),
    ).toBe(false)
  })

  it('marks in_progress abandoned after idle threshold', () => {
    const nowMs = Date.parse('2026-06-20T12:00:00.000Z')
    const updatedAt = new Date(nowMs - (IN_PROGRESS_LOOP_ABANDON_STALE_DAYS + 1) * MS_DAY)
    expect(
      shouldTransitionLoopToStale({
        status: 'in_progress',
        expiresAt: null,
        createdAt: new Date(nowMs - 30 * MS_DAY),
        updatedAt,
        nowMs,
      }),
    ).toBe(true)
  })

  it('does not mark in_progress when recently updated', () => {
    const nowMs = Date.parse('2026-06-20T12:00:00.000Z')
    const updatedAt = new Date(nowMs - 2 * MS_DAY)
    expect(
      shouldTransitionLoopToStale({
        status: 'in_progress',
        expiresAt: null,
        createdAt: new Date(nowMs - 30 * MS_DAY),
        updatedAt,
        nowMs,
      }),
    ).toBe(false)
  })
})

describe('demotedPriorityScoreAfterDismiss', () => {
  it('floors at 6 when raw demotion is below 6', () => {
    expect(demotedPriorityScoreAfterDismiss(10)).toBe(6)
  })

  it('rounds to two decimals when raw is at least 6', () => {
    expect(demotedPriorityScoreAfterDismiss(20)).toBe(7.6)
    expect(demotedPriorityScoreAfterDismiss(16)).toBe(6.08)
  })
})
