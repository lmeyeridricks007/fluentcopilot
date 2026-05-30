/**
 * Persist exam-derived ReviewItem rows + initial SRS scheduling (Stage 4 bank).
 */
import { reviewItemSchema, type ReviewItem } from '@/lib/schemas/reviewItem.schema'
import { createInitialSrsItem } from '@/lib/review-engine/scheduler'
import type { ReviewPersistencePort } from '@/lib/review-engine/reviewPersistence'

function upsertById<T extends { id: string }>(rows: T[], row: T): T[] {
  const i = rows.findIndex((r) => r.id === row.id)
  if (i === -1) return [...rows, row]
  const next = [...rows]
  next[i] = row
  return next
}

/**
 * Upsert items and ensure SRS rows exist. Returns count of **new** bank rows (not SRS-only adds).
 */
export async function ingestExamDerivedReviewItems(
  userId: string,
  port: ReviewPersistencePort,
  items: ReviewItem[]
): Promise<{ newBankRows: number; srsRowsEnsured: number }> {
  if (items.length === 0) return { newBankRows: 0, srsRowsEnsured: 0 }
  let bank = await port.loadReviewBank(userId)
  let srs = await port.loadSrsItems(userId)
  const now = new Date()
  let newBank = 0
  let srsEnsured = 0

  for (const it of items) {
    const valid = reviewItemSchema.safeParse(it)
    if (!valid.success) continue
    const row = valid.data
    const existed = bank.some((b) => b.id === row.id)
    bank = upsertById(bank, row)
    if (!existed) newBank += 1

    const moduleId =
      (row.metadata as { moduleId?: string } | undefined)?.moduleId ?? `exam-prep`
    if (!srs.some((s) => s.reviewItemId === row.id)) {
      srs = [...srs, createInitialSrsItem({ userId, reviewItemId: row.id, now, moduleId })]
      srsEnsured += 1
    }
  }

  await port.saveReviewBank(userId, bank)
  await port.saveSrsItems(userId, srs)
  return { newBankRows: newBank, srsRowsEnsured: srsEnsured }
}
