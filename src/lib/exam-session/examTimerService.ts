/**
 * Global exam clock — pure helpers (no React).
 */

export function remainingSecondsFromDeadline(deadlineMs: number, nowMs: number = Date.now()): number {
  return Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000))
}

export function formatCountdownMmSs(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function urgencyToneClass(remainingSec: number, totalSec: number): string {
  if (totalSec <= 0) return 'text-ink-secondary'
  const ratio = remainingSec / totalSec
  if (ratio <= 0.08) return 'text-rose-700'
  if (ratio <= 0.2) return 'text-amber-800'
  return 'text-ink-primary'
}
