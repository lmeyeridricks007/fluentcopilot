import type { ScenarioCatalogEntry } from '@/lib/schemas/practice/scenarioCatalogEntry.schema'
import type { A2WeakTagCount } from '@/features/curriculum/a2ReviewStore'
import type { Tier } from '@/features/entitlements/EntitlementContext'
import { weakAreaPatternsMatchUserTags } from '@/lib/practice/recommendationSignals'
import { isPracticeUnlockedScenario } from '@/lib/practice/scenarioProgressStorage'
import type { ScenarioCardModel } from './types'

export function buildScenarioCardModels(input: {
  entries: ScenarioCatalogEntry[]
  recommendedIds: string[]
  weakTags: A2WeakTagCount[]
  tier: Tier
}): ScenarioCardModel[] {
  const top = input.recommendedIds[0]
  const premiumOk = input.tier === 'premium' || input.tier === 'trial'

  return input.entries.map((entry) => ({
    entry,
    isRecommendedNext: entry.id === top,
    isWeakAreaMatch: weakAreaPatternsMatchUserTags(entry.weakAreaTagPatterns, input.weakTags),
    isPremiumLocked:
      entry.premiumRequirement === 'premium_only' && !premiumOk && !isPracticeUnlockedScenario(entry.id),
  }))
}
