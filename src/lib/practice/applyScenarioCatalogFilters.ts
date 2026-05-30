/**
 * Pure filter + sort for scenario catalog entries (URL-driven filters → list).
 */
import type { ScenarioCatalogEntry } from '@/lib/schemas/practice/scenarioCatalogEntry.schema'
import type { ScenarioCatalogCategory } from '@/lib/schemas/practice/scenarioCatalogEntry.schema'
import type { ScenarioReadiness } from '@/lib/schemas/practice/scenarioCatalogEntry.schema'
import type { ScenarioSkillFocus } from '@/lib/schemas/practice/scenarioCatalogEntry.schema'
import type { PracticeConversationMode } from '@/lib/schemas/practice/practiceShared.schema'
import type { A2WeakTagCount } from '@/features/curriculum/a2ReviewStore'
import { weakAreaPatternsMatchUserTags } from '@/lib/practice/recommendationSignals'

export type PremiumCatalogFilter = 'all' | 'free_only' | 'premium_ok'

export interface ScenarioCatalogFilterState {
  category: ScenarioCatalogCategory | null
  readiness: ScenarioReadiness[]
  skillFocus: ScenarioSkillFocus[]
  modes: PracticeConversationMode[]
  premium: PremiumCatalogFilter
  weakOnly: boolean
}

export const defaultCatalogFilterState = (): ScenarioCatalogFilterState => ({
  category: null,
  readiness: [],
  skillFocus: [],
  modes: [],
  premium: 'all',
  weakOnly: false,
})

function passesPremium(entry: ScenarioCatalogEntry, premium: PremiumCatalogFilter): boolean {
  if (premium === 'all') return true
  if (premium === 'free_only') return entry.premiumRequirement === 'free_ok'
  if (premium === 'premium_ok') return entry.premiumRequirement !== 'free_ok'
  return true
}

function passesMode(entry: ScenarioCatalogEntry, modes: PracticeConversationMode[]): boolean {
  if (modes.length === 0) return true
  return modes.some((m) => entry.supportedModes.includes(m))
}

export function filterScenarioCatalogEntries(
  entries: ScenarioCatalogEntry[],
  filters: ScenarioCatalogFilterState,
  weakTags: A2WeakTagCount[]
): ScenarioCatalogEntry[] {
  return entries.filter((e) => {
    if (filters.category && e.category !== filters.category) return false
    if (filters.readiness.length > 0 && !filters.readiness.includes(e.readiness)) return false
    if (filters.skillFocus.length > 0 && !filters.skillFocus.some((s) => e.skillFocus.includes(s)))
      return false
    if (!passesMode(e, filters.modes)) return false
    if (!passesPremium(e, filters.premium)) return false
    if (filters.weakOnly && !weakAreaPatternsMatchUserTags(e.weakAreaTagPatterns, weakTags)) return false
    return true
  })
}

export function sortCatalogEntriesByRecommendation(
  entries: ScenarioCatalogEntry[],
  recommendedIds: string[]
): ScenarioCatalogEntry[] {
  const rank = new Map<string, number>()
  recommendedIds.forEach((id, i) => rank.set(id, i))
  return [...entries].sort((a, b) => {
    const ra = rank.has(a.id) ? rank.get(a.id)! : 999
    const rb = rank.has(b.id) ? rank.get(b.id)! : 999
    if (ra !== rb) return ra - rb
    const pa = a.recommendationRank ?? 100
    const pb = b.recommendationRank ?? 100
    if (pa !== pb) return pa - pb
    return a.title.localeCompare(b.title)
  })
}
