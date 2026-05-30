/**
 * Compare recent vs older attempts for momentum (reduces noise).
 */
import type { ExamReadinessAttemptRecord } from '@/lib/exam-readiness/types'
import type { ReadinessTrend } from '@/lib/exam-readiness/types'

export function readinessTrendForAttempts(sortedNewestFirst: ExamReadinessAttemptRecord[]): ReadinessTrend {
  const rows = [...sortedNewestFirst].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  if (rows.length < 4) return 'unknown'
  const n = rows.length
  const half = Math.min(4, Math.floor(n / 2))
  const recent = rows.slice(0, half)
  const older = rows.slice(half, half * 2)
  if (older.length === 0) return 'unknown'
  const mR = mean(recent.map((r) => r.normalizedPercent))
  const mO = mean(older.map((r) => r.normalizedPercent))
  const delta = mR - mO
  if (delta >= 4) return 'improving'
  if (delta <= -4) return 'slipping'
  return 'stable'
}

function mean(xs: number[]): number {
  if (xs.length === 0) return 0
  return xs.reduce((a, b) => a + b, 0) / xs.length
}
