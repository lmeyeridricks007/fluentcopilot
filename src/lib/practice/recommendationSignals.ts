/**
 * Shared heuristic ordering for "recommended next" scenarios (hub + catalog).
 * Replace with server/recommendation engine when available.
 */
import type { A2WeakTagCount } from '@/features/curriculum/a2ReviewStore'
import { WEAK_TAG_ROUTING } from '@/features/practice-hub/constants'
import { getScenarioCatalogEntries } from '@/lib/practice/scenarioCatalog'

/**
 * Returns scenario ids in priority order (first = strongest recommendation).
 */
export function getRecommendedScenarioIds(input: {
  weakTags: A2WeakTagCount[]
  completedLessonIds: string[]
  max?: number
}): string[] {
  const max = input.max ?? 8
  const catalogIds = new Set(getScenarioCatalogEntries().map((s) => s.id))
  const out: string[] = []
  const push = (id: string) => {
    if (!catalogIds.has(id) || out.includes(id)) return
    out.push(id)
  }

  if (input.weakTags.length > 0) {
    const top = [...input.weakTags].sort((a, b) => b.wrongCount - a.wrongCount)[0]!
    const route = WEAK_TAG_ROUTING.find((w) => w.match(top.tag)) ?? WEAK_TAG_ROUTING[WEAK_TAG_ROUTING.length - 1]!
    push(route.scenarioId)
  }

  if (input.completedLessonIds.length >= 3) {
    push('work')
  }

  push('doctor')
  push('municipality')
  push('cafe')
  push('problem_solving')
  push('train')
  push('supermarket_shop')
  push('housing')
  push('social_plans')

  return out.slice(0, max)
}

export function weakAreaPatternsMatchUserTags(
  patterns: string[] | undefined,
  weakTags: A2WeakTagCount[]
): boolean {
  if (!patterns?.length || weakTags.length === 0) return false
  const tags = weakTags.map((t) => t.tag.toLowerCase())
  return patterns.some((p) => tags.some((t) => t.includes(p.toLowerCase())))
}
