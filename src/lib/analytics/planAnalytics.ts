import { emitAnalyticsEvent } from '@/lib/analytics/analyticsService'
import { ANALYTICS_EVENTS } from '@/lib/analytics'
import { useAuthStore } from '@/store/authStore'
import type { UserPlanAnalytics } from '@/lib/analytics/funnelAnalyticsTypes'

export function getSignedInPlanContext(): {
  user_plan: UserPlanAnalytics | undefined
  beta_user: boolean | undefined
} {
  const s = useAuthStore.getState()
  if (!s.isAuthenticated || !s.user) {
    return { user_plan: undefined, beta_user: undefined }
  }
  const plan = s.user.plan === 'premium' ? 'premium' : 'basic'
  return {
    user_plan: plan,
    beta_user: s.user.betaAccessAllowed !== false,
  }
}

/** Premium lock surfaces: attach plan for Basic vs Premium comparisons. */
export function trackPremiumFeatureLockedForBasicUser(props: {
  feature_key: string
  surface: string
  exam_type?: string
}) {
  const { user_plan, beta_user } = getSignedInPlanContext()
  const base = {
    feature_key: props.feature_key,
    surface: props.surface,
    exam_type: props.exam_type,
    user_plan,
    beta_user,
  }
  emitAnalyticsEvent(ANALYTICS_EVENTS.premium_feature_locked, base)
  emitAnalyticsEvent(ANALYTICS_EVENTS.basic_user_hit_lock, base)
}
