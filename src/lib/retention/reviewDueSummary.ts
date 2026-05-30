import { localReviewPersistence } from '@/lib/review-engine/reviewPersistence'
import { getRetentionUserId } from '@/lib/retention/retentionService'
import { planReviewSession } from '@/lib/review-engine/reviewSessionPlanner'
import type { ReviewSessionMode } from '@/lib/review-engine/types'

const SECONDS_PER_CARD_ESTIMATE = 18

export async function getReviewDueRowCount(opts: {
  userId?: string
  mode: ReviewSessionMode
  moduleId?: string
  targetSize?: number
}): Promise<number> {
  const userId = opts.userId ?? getRetentionUserId()
  const { rowCount } = await planReviewSession(localReviewPersistence, {
    userId,
    mode: opts.mode,
    moduleId: opts.moduleId,
    targetSize: opts.targetSize ?? 20,
    seed: 42,
  })
  return rowCount
}

export function estimateReviewMinutes(cardCount: number): number {
  if (cardCount <= 0) return 0
  return Math.max(1, Math.round((cardCount * SECONDS_PER_CARD_ESTIMATE) / 60))
}
