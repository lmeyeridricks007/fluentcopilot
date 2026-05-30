/**
 * Personalization Engine — spaced repetition scheduling for vocabulary/phrases.
 */

import type { SpacedRepetitionItem } from '../types/learning-path.js'
import { getSpacedRepetitionItems, upsertSpacedItem } from '../models/profileStore.js'

const MS_PER_DAY = 86400 * 1000

function nextReviewDue(success: boolean, difficulty: number, lastReviewed: string): string {
  const baseDays = success ? 1 + difficulty : 0.25
  const interval = Math.max(0.5, baseDays * (success ? 1.2 : 0.5))
  const next = new Date(lastReviewed)
  next.setTime(next.getTime() + interval * MS_PER_DAY)
  return next.toISOString()
}

export function recordRecall(
  userId: string,
  itemId: string,
  success: boolean
): SpacedRepetitionItem {
  const items = getSpacedRepetitionItems(userId)
  const existing = items.find((i) => i.item_id === itemId)
  const now = new Date().toISOString()
  const difficulty = existing?.difficulty ?? 1
  const successCount = (existing?.recall_success_count ?? 0) + (success ? 1 : 0)
  const failCount = (existing?.recall_fail_count ?? 0) + (success ? 0 : 1)
  const nextDue = nextReviewDue(success, difficulty, existing?.last_reviewed ?? now)
  const updated: SpacedRepetitionItem = {
    item_id: itemId,
    user_id: userId,
    last_reviewed: now,
    difficulty,
    recall_success_count: successCount,
    recall_fail_count: failCount,
    next_review_due: nextDue,
  }
  upsertSpacedItem(userId, updated)
  return updated
}

export function getDueForReview(userId: string, limit: number): SpacedRepetitionItem[] {
  const now = new Date().toISOString()
  const items = getSpacedRepetitionItems(userId)
  return items
    .filter((i) => i.next_review_due <= now)
    .sort((a, b) => (a.next_review_due < b.next_review_due ? -1 : 1))
    .slice(0, limit)
}
