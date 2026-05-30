import {
  ACTIVE_LOOP_IGNORE_STALE_DAYS,
  IN_PROGRESS_LOOP_ABANDON_STALE_DAYS,
} from './trainingLoopLifecycleConstants'

const MS_DAY = 86_400_000

export type StaleClockInput = {
  status: string
  expiresAt: Date | null
  createdAt: Date
  updatedAt: Date
  nowMs: number
}

/**
 * Whether an actionable loop row should become `stale` (mirrors product rules; used by repository + tests).
 */
export function shouldTransitionLoopToStale(input: StaleClockInput): boolean {
  const st = input.status
  if (st !== 'active' && st !== 'in_progress') return false
  const now = input.nowMs
  if (input.expiresAt != null && input.expiresAt.getTime() < now) return true
  if (st === 'active') {
    const ageMs = now - input.createdAt.getTime()
    return ageMs > ACTIVE_LOOP_IGNORE_STALE_DAYS * MS_DAY
  }
  const idleMs = now - input.updatedAt.getTime()
  return idleMs > IN_PROGRESS_LOOP_ABANDON_STALE_DAYS * MS_DAY
}

/** Priority after dismiss — mirrors SQL CASE in `dismissLoopWithPriorityDemotion`. */
export function demotedPriorityScoreAfterDismiss(current: number): number {
  const raw = current * 0.38
  if (raw < 6) return 6
  return Math.round(raw * 100) / 100
}
