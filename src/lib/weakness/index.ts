export { buildWeaknessInsights } from '@/lib/weakness/weaknessRecommendationBuilder'
export type { WeaknessBuilderInput } from '@/lib/weakness/types'
export { analyzeWeaknessSignals } from '@/lib/weakness/weaknessAnalyzer'
export { aggregateWeaknessCategories } from '@/lib/weakness/weaknessAggregator'
export { rankWeaknessCategories, minScoreFloorForSurface } from '@/lib/weakness/weaknessRanker'
export { WEAKNESS_CATEGORY_DEFINITIONS, getWeaknessCategoryById } from '@/lib/weakness/weaknessCategoryCatalog'
export {
  recordLastPracticeWeakSignals,
  loadLastPracticeWeakSignals,
} from '@/lib/weakness/lastPracticeSignalsStorage'
export { computeSkillTrackWeakestById } from '@/lib/weakness/skillTrackWeakSignals'
