import { emitAnalyticsEvent } from '@/lib/analytics/analyticsService'
import { LEARNING_INTELLIGENCE_EVENTS } from '@/lib/analytics/learningIntelligenceEvents'
import { learningIntelligenceBase } from '@/lib/analytics/analyticsTypes'

export function trackReadinessBandTransition(
  p: {
    surface: string
    scope: 'overall' | string
    from_score: number | null
    to_score: number | null
    direction: 'improved' | 'regressed' | 'flat' | 'unknown'
    from_state?: string
    to_state?: string
    pass_likelihood?: string
  } & Record<string, unknown>
): void {
  emitAnalyticsEvent(LEARNING_INTELLIGENCE_EVENTS.readiness_band_transition, {
    ...learningIntelligenceBase('readiness'),
    ...p,
  })
}
