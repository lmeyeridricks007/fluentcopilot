/**
 * Pass / close / fail for a single exercise (product readiness).
 * Simulation may use stricter interpretation via `strict` flag (same thresholds, different copy only — scores identical).
 */
import type { ExerciseOutcomeBand } from '@/lib/exam-scoring/types'
import type { ExamMode } from '@/lib/schemas/exam/examShared.schema'

/** Exercise passes if normalized % >= this (default). */
export const EXERCISE_PASS_PERCENT_DEFAULT = 70

/** "Close" band lower bound (inclusive). */
export const EXERCISE_CLOSE_PERCENT_LOWER = 55

export function exerciseOutcomeBand(
  normalizedPercent: number,
  passPercent = EXERCISE_PASS_PERCENT_DEFAULT,
  closeLower = EXERCISE_CLOSE_PERCENT_LOWER
): ExerciseOutcomeBand {
  if (normalizedPercent >= passPercent) return 'pass'
  if (normalizedPercent >= closeLower) return 'close'
  return 'fail'
}

export function exercisePass(normalizedPercent: number, passPercent = EXERCISE_PASS_PERCENT_DEFAULT): boolean {
  return normalizedPercent >= passPercent
}

/**
 * Session pass: mean of exercise normalized percents ≥ threshold (simple, auditable).
 * Alternative: weighted by maxScore — caller can pre-average.
 */
export function sessionPassMeanPercent(
  exercisePercents: number[],
  passPercent = EXERCISE_PASS_PERCENT_DEFAULT
): boolean {
  if (exercisePercents.length === 0) return false
  const mean = exercisePercents.reduce((a, b) => a + b, 0) / exercisePercents.length
  return mean >= passPercent
}

/** Optional: simulation uses same math; product copy differs only. */
export function passThresholdForMode(
  mode: ExamMode,
  basePass = EXERCISE_PASS_PERCENT_DEFAULT
): number {
  if (mode === 'simulation') {
    return basePass
  }
  return basePass
}
