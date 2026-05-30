/**
 * KMN flashcards → review bank + SRS; practice session builder for topic-scoped study.
 */
import { reviewItemSchema, type ReviewItem } from '@/lib/schemas/reviewItem.schema'
import { createInitialSrsItem, scoreReview } from '@/lib/review-engine/scheduler'
import { buildCardsFromRows } from '@/lib/review-engine/reviewSessionBuilder'
import type { EnrichedDueRow, ReviewSessionCard } from '@/lib/review-engine/types'
import type { ReviewPersistencePort } from '@/lib/review-engine/reviewPersistence'
import type { SrsItem } from '@/lib/schemas/srsItem.schema'
import { getKmnFlashcardDefs } from '@/lib/exam-prep/kmn/kmnContentBuilder'
import type { KmnFlashcardDef, KmnTopicId } from '@/lib/exam-prep/kmn/types'

export function kmnFlashReviewItemId(def: KmnFlashcardDef): string {
  return `kmn-flash-${def.id}`
}

function defToReviewItem(def: KmnFlashcardDef): ReviewItem {
  const id = kmnFlashReviewItemId(def)
  const moduleId = `kmn-${def.topicId}`
  const parsed = reviewItemSchema.parse({
    id,
    sourceLessonId: `kmn-${def.topicId}-lflash-${def.id}`,
    type: 'kmn',
    prompt: def.frontNl,
    expectedAnswer: def.backNl,
    difficulty: 'A2_low',
    tags: ['kmn', def.topicId, def.subtopicId, 'flashcard'],
    metadata: {
      moduleId,
      kmnTopic: def.topicId,
      kmnKind: 'flashcard',
      kmnExampleNl: def.exampleNl,
    },
  })
  return parsed
}

function upsertById<T extends { id: string }>(rows: T[], row: T): T[] {
  const i = rows.findIndex((r) => r.id === row.id)
  if (i === -1) return [...rows, row]
  const next = [...rows]
  next[i] = row
  return next
}

/**
 * Ensures all flashcards for a topic exist in the review bank with SRS rows (due now for new items).
 */
export async function ensureKmnFlashcardsForTopic(
  userId: string,
  port: ReviewPersistencePort,
  topicId: KmnTopicId
): Promise<void> {
  const defs = getKmnFlashcardDefs(topicId)
  let bank = await port.loadReviewBank(userId)
  let srs = await port.loadSrsItems(userId)
  const now = new Date()
  const moduleId = `kmn-${topicId}`

  for (const def of defs) {
    const item = defToReviewItem(def)
    bank = upsertById(bank, item)
    if (!srs.some((s) => s.reviewItemId === item.id)) {
      srs = [...srs, createInitialSrsItem({ userId, reviewItemId: item.id, now, moduleId })]
    }
  }

  await port.saveReviewBank(userId, bank)
  await port.saveSrsItems(userId, srs)
}

/**
 * Pulls due (or all if `includeNotDue`) topic flashcards into a short practice session.
 */
export async function buildKmnFlashPracticeSession(
  userId: string,
  port: ReviewPersistencePort,
  topicId: KmnTopicId,
  opts?: { limit?: number; seed?: number; includeNotDue?: boolean }
): Promise<ReviewSessionCard[]> {
  await ensureKmnFlashcardsForTopic(userId, port, topicId)
  const limit = opts?.limit ?? 8
  const seed = opts?.seed ?? Date.now()
  const bank = await port.loadReviewBank(userId)
  let srsList = await port.loadSrsItems(userId)
  const now = new Date()

  const items = bank.filter(
    (b) =>
      b.type === 'kmn' &&
      (b.metadata as { kmnTopic?: string } | undefined)?.kmnTopic === topicId
  )

  const rows: EnrichedDueRow[] = []
  for (const item of items) {
    let srs = srsList.find((s) => s.reviewItemId === item.id)
    if (!srs) {
      srs = createInitialSrsItem({
        userId,
        reviewItemId: item.id,
        now,
        moduleId: `kmn-${topicId}`,
      })
      srsList = [...srsList, srs]
    }
    const due = new Date(srs.dueDate).getTime() <= now.getTime()
    if (opts?.includeNotDue || due) {
      rows.push({ item, srs })
    }
  }

  if (rows.length === 0 && items.length > 0) {
    for (const item of items) {
      const srs = srsList.find((s) => s.reviewItemId === item.id)!
      rows.push({ item, srs })
    }
  }

  await port.saveSrsItems(userId, srsList)

  const shuffled = [...rows]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.abs(Math.sin(seed + i * 19) * 10000) % (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!]
  }

  const sliced = shuffled.slice(0, Math.min(limit, shuffled.length))
  return buildCardsFromRows(sliced, bank, seed)
}

/** Make a review item show up sooner in the daily queue after a quiz/scenario miss. */
export async function bringKmnReviewItemForward(
  userId: string,
  port: ReviewPersistencePort,
  reviewItemId: string
): Promise<void> {
  const srsList = await port.loadSrsItems(userId)
  const idx = srsList.findIndex((s) => s.reviewItemId === reviewItemId)
  if (idx === -1) {
    const bank = await port.loadReviewBank(userId)
    const item = bank.find((b) => b.id === reviewItemId)
    if (!item) return
    const meta = item.metadata as { moduleId?: string } | undefined
    const now = new Date()
    const nextSrs = createInitialSrsItem({
      userId,
      reviewItemId,
      now,
      moduleId: meta?.moduleId,
    })
    const bumped = scoreReview(nextSrs, 1)
    await port.saveSrsItems(userId, upsertSrsRow(srsList, bumped))
    return
  }
  const bumped = scoreReview(srsList[idx]!, 1)
  await port.saveSrsItems(userId, upsertSrsRow(srsList, bumped))
}

function upsertSrsRow(rows: SrsItem[], row: SrsItem): SrsItem[] {
  const i = rows.findIndex((r) => r.id === row.id)
  if (i === -1) return [...rows, row]
  const n = [...rows]
  n[i] = row
  return n
}
