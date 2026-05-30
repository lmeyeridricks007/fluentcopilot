import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import type { ProgressionPersistedState } from '@/lib/progression/serverProgressionStore'
import * as progressionStore from '@/lib/progression/serverProgressionStore'
import { applySessionComplete } from '@/lib/progression/progressionSessionComplete'

function emptyProgression(userId: string): ProgressionPersistedState {
  return {
    schemaVersion: 1,
    userId,
    userProgress: {
      userId,
      totalXP: 50,
      weeklyXP: 50,
      currentStreak: 1,
      longestStreak: 1,
      lastActiveDate: '2026-06-14',
    },
    dailyByDate: {},
    sessions: [],
  }
}

describe('applySessionComplete — exam XP and streak', () => {
  const memory = new Map<string, ProgressionPersistedState>()

  beforeEach(() => {
    memory.clear()
    vi.spyOn(progressionStore, 'mutateProgressionState').mockImplementation(async (userId, mutator) => {
      if (!memory.has(userId)) {
        memory.set(userId, structuredClone(emptyProgression(userId)))
      }
      const draft = memory.get(userId)!
      const out = await mutator(draft)
      memory.set(userId, structuredClone(draft))
      return out
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('awards zero XP and does not advance streak when exam meaningfulCompletion is false', async () => {
    const userId = 'prog-exam-low-' + Math.random().toString(16).slice(2)
    const res = await applySessionComplete(
      {
        sessionId: `sess-low-${Math.random().toString(16).slice(2)}`,
        userId,
        type: 'exam_simulation',
        durationSeconds: 400,
        completed: true,
        turns: 1,
        meaningfulCompletion: false,
        examTasksCompleted: 1,
        examMinTasks: 6,
        createdAt: '2026-06-15T14:00:00.000Z',
        xpBandSeed: 'low',
      },
      { timeZone: 'UTC' },
    )
    expect(res.xpAwarded).toBe(0)
    expect(res.streakChanged).toBe(false)
    const stored = memory.get(userId)!
    expect(stored.sessions).toHaveLength(1)
    expect(stored.sessions[0].xpAwarded).toBe(0)
  })

  it('awards positive XP and increments streak on meaningful exam_simulation', async () => {
    const userId = 'prog-exam-ok-' + Math.random().toString(16).slice(2)
    const res = await applySessionComplete(
      {
        sessionId: `sess-ok-${Math.random().toString(16).slice(2)}`,
        userId,
        type: 'exam_simulation',
        durationSeconds: 900,
        completed: true,
        turns: 5,
        meaningfulCompletion: true,
        improvements: ['exam_readiness_ready'],
        weaknessesTargeted: [],
        examTasksCompleted: 5,
        examMinTasks: 2,
        examXpMeta: { scope: 'section', runMode: 'simulation' },
        createdAt: '2026-06-15T15:00:00.000Z',
        xpBandSeed: 'ok',
      },
      { timeZone: 'UTC' },
    )
    expect(res.xpAwarded).toBeGreaterThan(0)
    expect(res.newStreak).toBe(2)
    expect(res.streakChanged).toBe(true)
    const stored = memory.get(userId)!
    expect(stored.userProgress.totalXP).toBeGreaterThan(50)
    expect(stored.userProgress.lastActiveDate).toBe('2026-06-15')
    expect(stored.sessions[0].type).toBe('exam_simulation')
  })

  it('stores exam_training with exam run mode on progression row', async () => {
    const userId = 'prog-exam-train-' + Math.random().toString(16).slice(2)
    await applySessionComplete(
      {
        sessionId: `sess-tr-${Math.random().toString(16).slice(2)}`,
        userId,
        type: 'exam_training',
        durationSeconds: 600,
        completed: true,
        turns: 4,
        meaningfulCompletion: true,
        improvements: ['exam_improved:structure'],
        examTasksCompleted: 4,
        examMinTasks: 2,
        examXpMeta: { scope: 'section', runMode: 'training', timedTraining: true },
        examProfileId: 'inburgering_speaking_v1',
        examLevel: 'A2',
        createdAt: '2026-06-15T16:00:00.000Z',
        xpBandSeed: 'tr',
      },
      { timeZone: 'UTC' },
    )
    const row = memory.get(userId)!.sessions[0]
    expect(row.type).toBe('exam_training')
    expect(row.examRunMode).toBe('training')
    expect(row.examProfileId).toBe('inburgering_speaking_v1')
    expect(row.examLevel).toBe('A2')
  })
})
