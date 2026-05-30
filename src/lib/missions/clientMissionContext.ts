import { DEMO_USAGE } from '@/demo-data'
import { getTierFromStore, usePremiumStore } from '@/store/premiumStore'
import type { MissionGeneratorContext } from '@/lib/missions/types'

/**
 * Sync mission generator context for client-only hooks (exam prep, retention) without React.
 */
export function getClientMissionGeneratorContext(
  partial?: Partial<MissionGeneratorContext>
): MissionGeneratorContext {
  const { isPremium, trialEndsAt } = usePremiumStore.getState()
  const tier = getTierFromStore({ isPremium, trialEndsAt })
  const unlimited = tier === 'premium' || tier === 'trial'
  const scenariosLimit = 3
  const atScenarioCap = !unlimited && DEMO_USAGE.scenariosCompletedCount >= scenariosLimit

  return {
    tier,
    atScenarioCap: partial?.atScenarioCap ?? atScenarioCap,
    weaknessInsights: partial?.weaknessInsights ?? [],
    inferredCategory: partial?.inferredCategory,
    weaknessScenarioId: partial?.weaknessScenarioId,
    userId: partial?.userId,
    hasExamPrepActivityThisWeek: partial?.hasExamPrepActivityThisWeek,
  }
}
