import { WEAKNESS_CATEGORY_DEFINITIONS, getWeaknessCategoryById } from '@/lib/weakness/weaknessCategoryCatalog'
import type { CategoryScore } from '@/lib/weakness/types'

/**
 * Sort by composite score, then category priority for explainability.
 */
export function rankWeaknessCategories(scores: Map<string, CategoryScore>): CategoryScore[] {
  const rows = [...scores.values()].filter((r) => r.score >= 0.45)
  rows.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    const pa = getWeaknessCategoryById(a.categoryId)?.priority ?? 0
    const pb = getWeaknessCategoryById(b.categoryId)?.priority ?? 0
    return pb - pa
  })
  return rows.slice(0, 3)
}

export function minScoreFloorForSurface(): number {
  return 0.45
}

/** @internal — export for tests */
export function allCategoryDefinitions() {
  return WEAKNESS_CATEGORY_DEFINITIONS
}
