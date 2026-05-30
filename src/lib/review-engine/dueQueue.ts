/**
 * Due queues: daily (all due SRS), module-scoped, mistake-fix biased.
 */
import type { SrsItem } from '@/lib/schemas/srsItem.schema'
import type { ReviewItem } from '@/lib/schemas/reviewItem.schema'
import type { DueSortContext, EnrichedDueRow } from '@/lib/review-engine/types'

export function isDue(srs: SrsItem, now: Date): boolean {
  return new Date(srs.dueDate).getTime() <= now.getTime()
}

export function joinBank(
  dueSrs: SrsItem[],
  bank: ReviewItem[]
): EnrichedDueRow[] {
  const byId = new Map(bank.map((r) => [r.id, r]))
  const out: EnrichedDueRow[] = []
  for (const srs of dueSrs) {
    const item = byId.get(srs.reviewItemId)
    if (item) out.push({ srs, item })
  }
  return out
}

function urgencyScore(row: EnrichedDueRow, ctx: DueSortContext): number {
  const dueMs = ctx.now.getTime() - new Date(row.srs.dueDate).getTime()
  const overdue = Math.max(0, dueMs / 86_400_000)
  const lapses = row.srs.lapses ?? 0
  const lastScore = row.srs.lastScore ?? 4
  const weakness = (5 - lastScore) * 0.4
  const mistakeBoost = ctx.mistakeWeightByReviewItemId.get(row.srs.reviewItemId) ?? 0
  return overdue * 1.2 + lapses * 1.5 + weakness * 2 + mistakeBoost * 3
}

export function sortDueRows(rows: EnrichedDueRow[], ctx: DueSortContext): EnrichedDueRow[] {
  return [...rows].sort((a, b) => {
    const ua = urgencyScore(a, ctx)
    const ub = urgencyScore(b, ctx)
    if (ua !== ub) return ub - ua
    return a.srs.dueDate.localeCompare(b.srs.dueDate)
  })
}

export function getDueItems(
  srsItems: SrsItem[],
  bank: ReviewItem[],
  now: Date,
  mistakeWeightByReviewItemId: Map<string, number>
): EnrichedDueRow[] {
  const due = srsItems.filter((s) => isDue(s, now))
  const rows = joinBank(due, bank)
  const ctx: DueSortContext = { now, mistakeWeightByReviewItemId }
  return sortDueRows(rows, ctx)
}

export function getModuleReviewItems(
  srsItems: SrsItem[],
  bank: ReviewItem[],
  moduleId: string,
  now: Date,
  mistakeWeightByReviewItemId: Map<string, number>
): EnrichedDueRow[] {
  const inModuleBank = new Set(
    bank.filter((b) => (b.metadata as { moduleId?: string } | undefined)?.moduleId === moduleId).map((b) => b.id)
  )
  const inModuleLesson = bank
    .filter((b) => b.sourceLessonId.startsWith(moduleId))
    .map((b) => b.id)
  const idSet = new Set([...inModuleBank, ...inModuleLesson])

  const due = srsItems.filter((s) => isDue(s, now) && idSet.has(s.reviewItemId))
  const rows = joinBank(due, bank)
  const ctx: DueSortContext = { now, mistakeWeightByReviewItemId }
  const sorted = sortDueRows(rows, ctx)

  const weakOlder = srsItems
    .filter((s) => isDue(s, now) && !idSet.has(s.reviewItemId))
    .filter((s) => (s.lapses ?? 0) > 0 || (s.lastScore ?? 4) <= 2)
  const weakRows = joinBank(weakOlder, bank)
  const weakSorted = sortDueRows(weakRows, ctx).slice(0, 4)

  return [...sorted, ...weakSorted]
}

export function getMistakeFixItems(
  srsItems: SrsItem[],
  bank: ReviewItem[],
  mistakeReviewItemIds: Set<string>,
  now: Date,
  mistakeWeightByReviewItemId: Map<string, number>
): EnrichedDueRow[] {
  const due = srsItems.filter((s) => isDue(s, now) && mistakeReviewItemIds.has(s.reviewItemId))
  const rows = joinBank(due, bank)
  const ctx: DueSortContext = { now, mistakeWeightByReviewItemId }
  return sortDueRows(rows, ctx)
}

const TYPE_KEYS: Record<string, string> = {
  vocab: 'v',
  phrase: 'p',
  grammar: 'g',
  listening: 'l',
  speaking: 's',
  kmn: 'k',
}

/**
 * Interleave so we don't stack >`maxStreak` cards of the same type in a row.
 * Deterministic given ordered input.
 */
export function declusterByType(rows: EnrichedDueRow[], maxStreak = 2): EnrichedDueRow[] {
  const buckets = new Map<string, EnrichedDueRow[]>()
  for (const r of rows) {
    const k = TYPE_KEYS[r.item.type] ?? 'x'
    const arr = buckets.get(k) ?? []
    arr.push(r)
    buckets.set(k, arr)
  }
  const order = [...buckets.keys()].sort()
  const out: EnrichedDueRow[] = []
  let streak = 0
  let lastKey = ''
  while (buckets.size > 0) {
    let picked: string | null = null
    for (const k of order) {
      const q = buckets.get(k)
      if (!q?.length) continue
      if (k === lastKey && streak >= maxStreak) continue
      picked = k
      break
    }
    if (!picked) {
      lastKey = ''
      streak = 0
      for (const k of order) {
        const q = buckets.get(k)
        if (q?.length) {
          picked = k
          break
        }
      }
    }
    if (!picked) break
    const q = buckets.get(picked)!
    const row = q.shift()!
    if (!q.length) buckets.delete(picked)
    if (picked === lastKey) streak += 1
    else {
      lastKey = picked
      streak = 1
    }
    out.push(row)
  }
  return out
}

export function buildSessionQueue(
  rows: EnrichedDueRow[],
  targetSize: number,
  decluster = true
): EnrichedDueRow[] {
  const sliced = rows.slice(0, Math.max(1, targetSize))
  return decluster ? declusterByType(sliced, 2) : sliced
}
