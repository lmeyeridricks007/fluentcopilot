import { getOrCreateAnalyticsSession } from '@/lib/analytics/analyticsSession'
import { getRetentionUserId } from '@/lib/retention/retentionService'

export type AnalyticsBaseContext = {
  session_id: string
  user_id: string
  timestamp_iso: string
  /** A/B or experiment bucket — set via env for builds */
  experiment_variant: string | null
}

/**
 * Cross-event envelope. Merge into every analytics payload at dispatch time.
 */
export function buildAnalyticsBaseContext(): AnalyticsBaseContext {
  const sess = getOrCreateAnalyticsSession()
  return {
    session_id: sess.sessionId,
    user_id: getRetentionUserId(),
    timestamp_iso: new Date().toISOString(),
    experiment_variant:
      typeof process.env.NEXT_PUBLIC_ANALYTICS_EXPERIMENT_VARIANT === 'string'
        ? process.env.NEXT_PUBLIC_ANALYTICS_EXPERIMENT_VARIANT
        : null,
  }
}

export type PracticeScenarioContext = {
  scenario_id?: string
  scenario_category?: string
  scenario_mode?: string
  /** free | trial | premium */
  entitlement_tier?: string
}
