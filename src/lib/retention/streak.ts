import type { StreakState } from '@/lib/retention/types'

/** `YYYY-MM-DD` local */
export function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseKey(k: string): Date {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y!, m! - 1, d!)
}

function previousLocalDay(key: string): string {
  const dt = parseKey(key)
  dt.setDate(dt.getDate() - 1)
  return localDateKey(dt)
}

/**
 * Apply one qualifying activity on `todayKey` (local calendar).
 * First activity of the day updates streak; same day is idempotent for streak count.
 */
export function applyStreakActivity(prev: StreakState, todayKey: string): StreakState {
  if (prev.lastActiveLocalDate === todayKey) {
    return prev
  }
  const prior = prev.lastActiveLocalDate
  let nextCurrent = 1
  if (prior && prior === previousLocalDay(todayKey)) {
    nextCurrent = prev.current + 1
  }
  const longest = Math.max(prev.longest, nextCurrent)
  return {
    current: nextCurrent,
    longest,
    lastActiveLocalDate: todayKey,
  }
}

export function streakMilestoneJustReached(prevCurrent: number, nextCurrent: number): number | null {
  if (nextCurrent <= prevCurrent) return null
  const milestones = [3, 7, 14, 30, 60, 100]
  for (const m of milestones) {
    if (prevCurrent < m && nextCurrent >= m) return m
  }
  return null
}

export function isStreakAtRisk(streak: StreakState, todayKey: string): boolean {
  if (streak.current <= 0) return false
  if (!streak.lastActiveLocalDate) return true
  if (streak.lastActiveLocalDate === todayKey) return false
  return previousLocalDay(todayKey) !== streak.lastActiveLocalDate
}
