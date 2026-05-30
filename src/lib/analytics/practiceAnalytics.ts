import { emitAnalyticsEvent } from '@/lib/analytics/analyticsService'
import { LEARNING_INTELLIGENCE_EVENTS } from '@/lib/analytics/learningIntelligenceEvents'
import { learningIntelligenceBase } from '@/lib/analytics/analyticsTypes'

export function trackPracticeHubRecommendationShown(
  p: {
    recommendation_id: string
    practice_kind?: string
    scenario_id?: string
    href: string
    variant?: 'default' | 'featured'
  } & Record<string, unknown>
): void {
  emitAnalyticsEvent(LEARNING_INTELLIGENCE_EVENTS.practice_hub_recommendation_shown, {
    ...learningIntelligenceBase('practice_hub_recommendation'),
    surface: 'practice_hub',
    ...p,
  })
}

export function trackPracticeHubRecommendationClicked(
  p: {
    recommendation_id: string
    practice_kind?: string
    scenario_id?: string
    href: string
    variant?: 'default' | 'featured'
  } & Record<string, unknown>
): void {
  emitAnalyticsEvent(LEARNING_INTELLIGENCE_EVENTS.practice_hub_recommendation_clicked, {
    ...learningIntelligenceBase('practice_hub_recommendation'),
    surface: 'practice_hub',
    ...p,
  })
}
