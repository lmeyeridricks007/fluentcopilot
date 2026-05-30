/**
 * Exam timer model — authoritative in simulation, optional/lighter in training.
 */

export type TimerPhase = 'prep' | 'answer' | 'idle'

export type ActiveExamTimer = {
  phase: TimerPhase
  /** Monotonic deadline (epoch ms) when phase ends; null when idle / disabled. */
  deadlineMs: number | null
  totalPausedMs: number
  lastPauseStartedMs: number | null
}

export function createTimer(deadlineMs: number | null, phase: TimerPhase): ActiveExamTimer {
  return { phase, deadlineMs, totalPausedMs: 0, lastPauseStartedMs: null }
}

export function remainingMs(now: Date, t: ActiveExamTimer): number | null {
  if (t.deadlineMs == null) return null
  const pauseExtra =
    t.lastPauseStartedMs != null ? Math.max(0, now.getTime() - t.lastPauseStartedMs) : 0
  return Math.max(0, t.deadlineMs - now.getTime() + t.totalPausedMs + pauseExtra)
}

export function isExpired(now: Date, t: ActiveExamTimer): boolean {
  const r = remainingMs(now, t)
  return r !== null && r <= 0
}

export function pause(t: ActiveExamTimer, nowMs: number): ActiveExamTimer {
  if (t.lastPauseStartedMs != null) return t
  return { ...t, lastPauseStartedMs: nowMs }
}

export function resume(t: ActiveExamTimer, nowMs: number): ActiveExamTimer {
  if (t.lastPauseStartedMs == null) return t
  const delta = Math.max(0, nowMs - t.lastPauseStartedMs)
  return {
    ...t,
    lastPauseStartedMs: null,
    totalPausedMs: t.totalPausedMs + delta,
  }
}

/** Profile-driven: simulation auto-advances when answer timer elapses if rule says so. */
export function shouldAutoAdvanceAfterAnswer(options: {
  runMode: 'simulation' | 'training'
  timedTraining: boolean
  autoAdvance: boolean
}): boolean {
  if (options.runMode === 'simulation') return options.autoAdvance
  return options.timedTraining && options.autoAdvance
}
