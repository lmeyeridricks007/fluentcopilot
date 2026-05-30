import { emitAnalyticsEvent } from '@/lib/analytics/analyticsService'
import { ANALYTICS_EVENTS } from '@/lib/analytics'

export function trackBetaPageViewed(props?: { route?: string; source_surface?: string }) {
  emitAnalyticsEvent(ANALYTICS_EVENTS.beta_page_viewed, {
    route: props?.route,
    source_surface: props?.source_surface ?? 'beta_marketing_page',
  })
}
