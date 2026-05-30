/**
 * Adaptive mixing: skill coverage, type quotas, soft difficulty pacing.
 */
import type { ReviewItemType } from '@/lib/schemas/reviewItem.schema'
import type { EnrichedDueRow, ReviewSessionMode, SessionBuildOptions } from '@/lib/review-engine/types'

export function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffleInPlace<T>(arr: T[], rand: () => number) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
}

const TYPE_GROUP: Record<ReviewItemType, 'recall' | 'grammar' | 'input' | 'speak'> = {
  vocab: 'recall',
  phrase: 'recall',
  grammar: 'grammar',
  listening: 'input',
  speaking: 'speak',
  kmn: 'recall',
}

type MixTargets = Record<'recall' | 'grammar' | 'input' | 'speak', number>

function targetsForMode(mode: ReviewSessionMode, n: number): MixTargets {
  if (mode === 'mistake_fix') {
    return {
      recall: Math.ceil(n * 0.45),
      grammar: Math.ceil(n * 0.35),
      input: Math.max(1, Math.floor(n * 0.12)),
      speak: Math.max(1, Math.floor(n * 0.08)),
    }
  }
  if (mode === 'module') {
    return {
      recall: Math.ceil(n * 0.45),
      grammar: Math.ceil(n * 0.3),
      input: Math.max(1, Math.floor(n * 0.15)),
      speak: Math.max(1, Math.floor(n * 0.1)),
    }
  }
  /* daily */
  return {
    recall: Math.round(n * 0.4),
    grammar: Math.round(n * 0.25),
    input: Math.round(n * 0.2),
    speak: Math.max(1, Math.round(n * 0.15)),
  }
}

function bucketForRow(row: EnrichedDueRow): keyof MixTargets {
  return TYPE_GROUP[row.item.type]
}

/**
 * Pull rows into per-target buckets up to quotas; spill extra in original urgency order.
 */
export function selectAdaptiveMix(
  sortedRows: EnrichedDueRow[],
  opts: Pick<SessionBuildOptions, 'mode' | 'targetSize' | 'seed'>
): EnrichedDueRow[] {
  const n = Math.max(4, Math.min(16, opts.targetSize ?? 12))
  const targets = targetsForMode(opts.mode, n)
  const rand = mulberry32(opts.seed ?? 0x9e3779b9)

  const pools: Record<keyof MixTargets, EnrichedDueRow[]> = {
    recall: [],
    grammar: [],
    input: [],
    speak: [],
  }
  for (const row of sortedRows) {
    pools[bucketForRow(row)].push(row)
  }
  for (const k of Object.keys(pools) as (keyof MixTargets)[]) {
    shuffleInPlace(pools[k], rand)
  }

  const picked: EnrichedDueRow[] = []
  const seen = new Set<string>()

  function take(bucket: keyof MixTargets, cap: number) {
    let got = 0
    while (got < cap && pools[bucket].length) {
      const row = pools[bucket].shift()!
      if (seen.has(row.srs.id)) continue
      seen.add(row.srs.id)
      picked.push(row)
      got++
    }
  }

  take('recall', targets.recall)
  take('grammar', targets.grammar)
  take('input', targets.input)
  take('speak', targets.speak)

  for (const row of sortedRows) {
    if (picked.length >= n) break
    if (seen.has(row.srs.id)) continue
    seen.add(row.srs.id)
    picked.push(row)
  }

  return picked.slice(0, n)
}

export function buildDailyAdaptiveMix(
  sortedRows: EnrichedDueRow[],
  targetSize?: number,
  seed?: number
): EnrichedDueRow[] {
  return selectAdaptiveMix(sortedRows, { mode: 'daily', targetSize, seed })
}

export function buildModuleAdaptiveMix(
  sortedRows: EnrichedDueRow[],
  targetSize?: number,
  seed?: number
): EnrichedDueRow[] {
  return selectAdaptiveMix(sortedRows, { mode: 'module', targetSize, seed })
}

export function buildMistakeAdaptiveMix(
  sortedRows: EnrichedDueRow[],
  targetSize?: number,
  seed?: number
): EnrichedDueRow[] {
  return selectAdaptiveMix(sortedRows, { mode: 'mistake_fix', targetSize, seed })
}
