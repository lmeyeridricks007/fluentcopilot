import { WEAKNESS_CATEGORY_DEFINITIONS } from '@/lib/weakness/weaknessCategoryCatalog'
import type { CategoryScore, RawWeaknessSignal, WeaknessCategoryDefinition } from '@/lib/weakness/types'

function categoryMatches(def: WeaknessCategoryDefinition, blob: string): boolean {
  if (def.matchErrorTypes) {
    for (const et of def.matchErrorTypes) {
      if (blob.includes(et)) return true
    }
  }
  if (def.matchMistakeCategories) {
    for (const c of def.matchMistakeCategories) {
      const u = c.toLowerCase()
      if (blob.includes(u) || blob.includes(u.replace(/_/g, '-'))) return true
    }
  }
  return def.matchTags.some((r) => r.test(blob))
}

/**
 * Assigns each signal to the highest-priority matching category (one category per signal).
 */
export function aggregateWeaknessCategories(
  signals: RawWeaknessSignal[],
  defs: WeaknessCategoryDefinition[] = WEAKNESS_CATEGORY_DEFINITIONS
): Map<string, CategoryScore> {
  const byId = new Map<string, CategoryScore>()
  const sortedDefs = [...defs].sort((a, b) => b.priority - a.priority)

  for (const sig of signals) {
    let matched: WeaknessCategoryDefinition | null = null
    for (const d of sortedDefs) {
      if (categoryMatches(d, sig.tagBlob)) {
        matched = d
        break
      }
    }
    if (!matched) continue
    const cur = byId.get(matched.id) ?? {
      categoryId: matched.id,
      score: 0,
      matchedSignals: [] as RawWeaknessSignal[],
    }
    cur.score += sig.weight
    cur.matchedSignals.push(sig)
    byId.set(matched.id, cur)
  }

  return byId
}
