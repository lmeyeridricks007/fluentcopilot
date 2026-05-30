/**
 * Pure planner: persistence snapshot → ordered session rows (for tests + simulate script).
 */
import type { ReviewPersistencePort } from '@/lib/review-engine/reviewPersistence'
import {
  buildSessionQueue,
  getDueItems,
  getMistakeFixItems,
  getModuleReviewItems,
} from '@/lib/review-engine/dueQueue'
import {
  buildDailyAdaptiveMix,
  buildMistakeAdaptiveMix,
  buildModuleAdaptiveMix,
} from '@/lib/review-engine/reviewSelector'
import { buildCardsFromRows } from '@/lib/review-engine/reviewSessionBuilder'
import type { ReviewSessionCard, SessionBuildOptions } from '@/lib/review-engine/types'
import { mistakeLinkedReviewItemIds, mistakeWeightByReviewItemId } from '@/lib/mistakes/weakPointAnalyzer'

export async function planReviewSession(
  port: ReviewPersistencePort,
  opts: SessionBuildOptions
): Promise<{ cards: ReviewSessionCard[]; rowCount: number }> {
  const now = opts.now ?? new Date()
  const userId = opts.userId
  const target = opts.targetSize ?? 12

  const [bank, srs, mistakes] = await Promise.all([
    port.loadReviewBank(userId),
    port.loadSrsItems(userId),
    port.loadMistakeEvents(userId),
  ])

  const mw = mistakeWeightByReviewItemId(mistakes)
  let rows =
    opts.mode === 'module' && opts.moduleId
      ? getModuleReviewItems(srs, bank, opts.moduleId, now, mw)
      : opts.mode === 'mistake_fix'
        ? getMistakeFixItems(
            srs,
            bank,
            mistakeLinkedReviewItemIds(mistakes, 1),
            now,
            mw
          )
        : getDueItems(srs, bank, now, mw)

  if (opts.mode === 'mistake_fix' && rows.length === 0) {
    rows = getDueItems(srs, bank, now, mw).filter(
      (r) => (r.srs.lapses ?? 0) > 0 || (r.srs.lastScore ?? 4) <= 2
    )
  }

  const mixed =
    opts.mode === 'daily'
      ? buildDailyAdaptiveMix(rows, target, opts.seed)
      : opts.mode === 'module'
        ? buildModuleAdaptiveMix(rows, target, opts.seed)
        : buildMistakeAdaptiveMix(rows, target, opts.seed)

  const sessionRows = buildSessionQueue(mixed, target, true)
  const cards = buildCardsFromRows(sessionRows, bank, opts.seed ?? 42)
  return { cards, rowCount: sessionRows.length }
}
