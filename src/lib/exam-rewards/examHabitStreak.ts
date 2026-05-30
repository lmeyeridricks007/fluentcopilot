import { localDateKey } from '@/lib/retention/streak'
import type { ExamPrepHabitStreakState } from '@/lib/exam-rewards/types'
import { streakMilestoneJustReached } from '@/lib/retention/streak'

function previousLocalDay(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  const dt = new Date(y!, m! - 1, d!)
  dt.setDate(dt.getDate() - 1)
  return localDateKey(dt)
}

export function readExamHabitStreak(meta: Record<string, unknown>): ExamPrepHabitStreakState {
  const raw = meta.examPrepHabitStreak
  if (raw && typeof raw === 'object' && raw !== null) {
    const o = raw as Record<string, unknown>
    return {
      current: typeof o.current === 'number' ? o.current : 0,
      longest: typeof o.longest === 'number' ? o.longest : 0,
      lastActiveLocalDate: typeof o.lastActiveLocalDate === 'string' ? o.lastActiveLocalDate : null,
    }
  }
  return { current: 0, longest: 0, lastActiveLocalDate: null }
}

export function applyExamHabitActivity(
  prev: ExamPrepHabitStreakState,
  todayKey: string
): { next: ExamPrepHabitStreakState; extendedCount: boolean } {
  if (prev.lastActiveLocalDate === todayKey) {
    return { next: prev, extendedCount: false }
  }
  const prior = prev.lastActiveLocalDate
  let nextCurrent = 1
  if (prior && prior === previousLocalDay(todayKey)) {
    nextCurrent = prev.current + 1
  }
  const longest = Math.max(prev.longest, nextCurrent)
  return {
    next: {
      current: nextCurrent,
      longest,
      lastActiveLocalDate: todayKey,
    },
    extendedCount: true,
  }
}

export function examHabitMilestoneCrossed(
  prevCurrent: number,
  nextCurrent: number
): 3 | 7 | null {
  if (nextCurrent <= prevCurrent) return null
  const m = streakMilestoneJustReached(prevCurrent, nextCurrent)
  if (m === 3 || m === 7) return m
  return null
}
