/**
 * Presentation layer: percentage and 0–10 scale from raw rubric totals.
 * Does not change underlying category scores.
 */
import { SPEAKING_MAX_TOTAL } from '@/lib/exam-scoring/speakingScoringPolicy'
import { WRITING_MAX_TOTAL } from '@/lib/exam-scoring/writingScoringPolicy'
import type { ReadinessLabel } from '@/lib/exam-scoring/types'

export function normalizedPercent(totalScore: number, maxScore: number): number {
  if (maxScore <= 0) return 0
  return Math.round((totalScore / maxScore) * 1000) / 10
}

/** Maps 0–max → 0–10 for learner-friendly display. */
export function toTenPointScale(totalScore: number, maxScore: number): number {
  if (maxScore <= 0) return 0
  const v = (totalScore / maxScore) * 10
  return Math.round(v * 100) / 100
}

/**
 * Readiness label from normalized % — product model, not official pass.
 * Thresholds are intentionally conservative for "strong".
 */
export function readinessLabelFromPercent(p: number): ReadinessLabel {
  if (p >= 85) return 'strong'
  if (p >= 70) return 'nearly_ready'
  if (p >= 45) return 'improving'
  return 'needs_work'
}

export function maxScoreForExamType(examType: 'speaking' | 'writing'): number {
  return examType === 'speaking' ? SPEAKING_MAX_TOTAL : WRITING_MAX_TOTAL
}
