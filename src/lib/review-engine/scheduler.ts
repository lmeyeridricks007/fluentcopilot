/**
 * SM-2–inspired spaced repetition (practical MVP).
 *
 * Learner grades (ReviewScore):
 * - 4 = perfect
 * - 3 = correct
 * - 2 = hard
 * - 1 = wrong
 *
 * We map these to SM-2 quality q ∈ [0,5]:
 *   wrong → 0, hard → 3, correct → 4, perfect → 5
 *
 * Ease factor update (standard SM-2):
 *   EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
 *   EF' clamped to minimum 1.3
 *
 * Intervals (days, may be fractional for “same day” reviews):
 * - If q < 3: repetitions ← 0, interval ← lapseIntervalDays (default 10 minutes ≈ 0.00694d)
 * - Else if repetitions === 0: interval ← 1
 * - Else if repetitions === 1: interval ← 6
 * - Else: interval ← round(previousInterval * EF)
 *
 * Lapses increment when q < 3. `state` hints lifecycle for future FSRS.
 */
import type { SrsItem } from '@/lib/schemas/srsItem.schema'
import type { ReviewScore } from '@/lib/review-engine/types'

const EF_MIN = 1.3
const DEFAULT_EF = 2.5
/** Same-day return after failure (~10 minutes). */
export const DEFAULT_LAPSE_INTERVAL_DAYS = 10 / (24 * 60)

export function scoreToSm2Quality(score: ReviewScore): number {
  switch (score) {
    case 1:
      return 0
    case 2:
      return 3
    case 3:
      return 4
    case 4:
      return 5
    default:
      return 0
  }
}

export function applyHintPenalty(score: ReviewScore): ReviewScore {
  const n = Math.max(1, score - 1) as ReviewScore
  return n
}

/**
 * @param confidence 0–1 from speech pipeline; lower reduces effective score by one step.
 */
export function applySpeakingPenalty(score: ReviewScore, confidence: number): ReviewScore {
  if (confidence >= 0.72) return score
  const n = Math.max(1, score - 1) as ReviewScore
  return n
}

function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 86_400_000)
}

function nextEaseFactor(prev: number, q: number): number {
  const delta = 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)
  return Math.max(EF_MIN, prev + delta)
}

export function createInitialSrsItem(input: {
  userId: string
  reviewItemId: string
  now?: Date
  moduleId?: string
}): SrsItem {
  const now = input.now ?? new Date()
  const id = `srs-${input.userId}-${input.reviewItemId}`.replace(/\s+/g, '_')
  return {
    id,
    userId: input.userId,
    reviewItemId: input.reviewItemId,
    easeFactor: DEFAULT_EF,
    interval: 0,
    repetitions: 0,
    dueDate: now.toISOString(),
    lastReviewed: undefined,
    lastScore: undefined,
    lapses: 0,
    state: 'learning',
    performanceHistory: [],
    metadata: {
      moduleId: input.moduleId,
    },
  }
}

export function rescheduleItem(
  item: SrsItem,
  effectiveScore: ReviewScore,
  now: Date = new Date(),
  lapseIntervalDays: number = DEFAULT_LAPSE_INTERVAL_DAYS
): SrsItem {
  const q = scoreToSm2Quality(effectiveScore)
  const correct = q >= 3
  const reviewedAt = now.toISOString()
  const history = [
    ...item.performanceHistory,
    { reviewedAt, correct, quality: q },
  ].slice(-24)

  let easeFactor = item.easeFactor
  let repetitions = item.repetitions
  let interval = item.interval
  let lapses = item.lapses ?? 0
  let state = item.state ?? 'learning'

  if (!correct) {
    lapses += 1
    repetitions = 0
    interval = lapseIntervalDays
    easeFactor = nextEaseFactor(easeFactor, q)
    state = 'relearning'
  } else {
    easeFactor = nextEaseFactor(easeFactor, q)
    repetitions += 1
    if (repetitions === 1) {
      interval = 1
    } else if (repetitions === 2) {
      interval = 6
    } else {
      interval = Math.max(1, Math.round(Math.max(1, item.interval) * easeFactor))
    }
    if (repetitions >= 10 && q === 5) {
      state = 'graduated'
    } else {
      state = repetitions >= 3 ? 'review' : 'learning'
    }
  }

  const dueDate = addDays(now, interval).toISOString()

  return {
    ...item,
    easeFactor,
    interval,
    repetitions,
    dueDate,
    lastReviewed: reviewedAt,
    lastScore: effectiveScore,
    lapses,
    state,
    performanceHistory: history,
  }
}

/**
 * Convenience: apply score and return updated row (same as rescheduleItem; name matches spec).
 */
export function scoreReview(item: SrsItem, effectiveScore: ReviewScore, now?: Date): SrsItem {
  return rescheduleItem(item, effectiveScore, now ?? new Date())
}
