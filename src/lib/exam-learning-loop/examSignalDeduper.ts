/**
 * Dedupe and cap exam-derived signals to avoid flooding review / weaknesses.
 */
import type { ExamLearningSignal } from '@/lib/exam-learning-loop/types'

export type DedupeOptions = {
  /** Max distinct signals kept after dedupe by dedupeKey. */
  maxSignals: number
  /** Max signals that carry a reviewHint (subset sorted by weight). */
  maxReviewHints: number
}

const DEFAULT_OPTS: DedupeOptions = {
  maxSignals: 14,
  maxReviewHints: 5,
}

/**
 * Keep strongest weight per dedupeKey, then sort by weight desc and cap.
 * Marks extra review hints for dropping by clearing reviewHint beyond maxReviewHints.
 */
export function dedupeAndCapExamSignals(
  raw: ExamLearningSignal[],
  opts: Partial<DedupeOptions> = {}
): { signals: ExamLearningSignal[]; droppedDuplicateKeys: number } {
  const o = { ...DEFAULT_OPTS, ...opts }
  const byKey = new Map<string, ExamLearningSignal>()
  let dropped = 0
  for (const s of raw) {
    const prev = byKey.get(s.dedupeKey)
    if (!prev || s.weight > prev.weight) {
      if (prev) dropped += 1
      byKey.set(s.dedupeKey, s)
    } else {
      dropped += 1
    }
  }
  let merged = [...byKey.values()].sort((a, b) => b.weight - a.weight || a.dedupeKey.localeCompare(b.dedupeKey))
  if (merged.length > o.maxSignals) {
    dropped += merged.length - o.maxSignals
    merged = merged.slice(0, o.maxSignals)
  }

  let withReview = 0
  const out = merged.map((s) => {
    if (!s.reviewHint) return s
    if (withReview >= o.maxReviewHints) {
      const { reviewHint: _, ...rest } = s
      return { ...rest } as ExamLearningSignal
    }
    withReview += 1
    return s
  })

  return { signals: out, droppedDuplicateKeys: dropped }
}
