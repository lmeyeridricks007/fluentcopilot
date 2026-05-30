import type { ScenarioCatalogEntry } from '@/lib/schemas/practice/scenarioCatalogEntry.schema'

/** UI-ready row for ScenarioCard */
export interface ScenarioCardModel {
  entry: ScenarioCatalogEntry
  /** Top pick from recommendation engine ordering */
  isRecommendedNext: boolean
  /** Matches current user weak tags */
  isWeakAreaMatch: boolean
  /** User cannot start premium-only without tier */
  isPremiumLocked: boolean
}
