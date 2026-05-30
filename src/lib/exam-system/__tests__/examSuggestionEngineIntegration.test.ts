import { describe, expect, it } from 'vitest'
import { generateTodaySuggestion, type TodaySuggestionUserContext } from '@/lib/progression/suggestionEngine'
import type { StreakUserProgress } from '@/lib/progression/streakEngine'

function baseUserProgress(overrides: Partial<StreakUserProgress> = {}): StreakUserProgress {
  return {
    userId: 'u-sugg-exam',
    totalXP: 200,
    weeklyXP: 40,
    currentStreak: 3,
    longestStreak: 5,
    lastActiveDate: '2026-06-15',
    ...overrides,
  }
}

function baseCtx(partial: Partial<TodaySuggestionUserContext>): TodaySuggestionUserContext {
  return {
    userProgress: baseUserProgress(),
    recentSessions: [],
    activeTrainingLoops: [],
    now: new Date('2026-06-15T14:00:00.000Z'),
    timeZone: 'UTC',
    ...partial,
  }
}

describe('generateTodaySuggestion — exam weakness bridges', () => {
  it('returns timed simulation suggestion when weaknesses include exam_readiness_focus', () => {
    const s = generateTodaySuggestion(
      baseCtx({
        recentSessions: [
          {
            sessionId: 'e1',
            type: 'exam_simulation',
            completed: true,
            durationSeconds: 800,
            weaknessesTargeted: ['exam_readiness_focus'],
            createdAt: '2026-06-15T10:00:00.000Z',
            turns: 5,
          },
        ],
      }),
    )
    expect(s.title.toLowerCase()).toMatch(/simulation|timed|readiness/)
    expect(s.action.config.intent).toBe('exam_simulation_timing')
    expect(String(s.action.config.href)).toContain('/app/exam')
  })

  it('routes pronunciation timer weak tags to read-aloud repair', () => {
    const s = generateTodaySuggestion(
      baseCtx({
        recentSessions: [
          {
            sessionId: 'e2',
            type: 'exam_training',
            completed: true,
            durationSeconds: 500,
            weaknessesTargeted: ['exam_pronunciation_timer'],
            createdAt: '2026-06-15T09:00:00.000Z',
            turns: 4,
          },
        ],
      }),
    )
    expect(s.action.type).toBe('read_aloud')
    expect(String(s.action.config.intent)).toContain('exam')
  })

  it('routes exam_dim weakness tags to Exam Train focus', () => {
    const s = generateTodaySuggestion(
      baseCtx({
        recentSessions: [
          {
            sessionId: 'e3',
            type: 'exam_simulation',
            completed: true,
            durationSeconds: 700,
            weaknessesTargeted: ['exam_dim:grammar_control'],
            createdAt: '2026-06-15T11:00:00.000Z',
            turns: 6,
          },
        ],
      }),
    )
    expect(s.title.toLowerCase()).toContain('exam train')
    expect(String(s.action.config.href)).toContain('/app/exam')
    expect(s.action.config.intent).toBe('exam_readiness')
  })
})
