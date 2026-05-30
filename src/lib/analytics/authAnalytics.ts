import { emitAnalyticsEvent } from '@/lib/analytics/analyticsService'
import { ANALYTICS_EVENTS } from '@/lib/analytics'
import type { LoginFailureReason, LoginSurface, UserPlanAnalytics } from '@/lib/analytics/funnelAnalyticsTypes'

const MOCK_CODE_TO_REASON: Record<string, LoginFailureReason> = {
  not_found: 'unknown_email_not_invited',
  password_invalid: 'wrong_password',
  inactive: 'account_inactive',
  access_denied: 'beta_access_denied',
  signup_closed: 'signup_closed',
  unknown: 'unknown',
}

export function normalizeMockLoginFailureReason(rawCode: string): LoginFailureReason {
  return MOCK_CODE_TO_REASON[rawCode] ?? 'unknown'
}

export function trackLoginAttempted(props: {
  login_surface: LoginSurface
  auth_provider_type: string
  has_existing_session: boolean
}) {
  emitAnalyticsEvent(ANALYTICS_EVENTS.login_attempted, {
    login_surface: props.login_surface,
    auth_provider_type: props.auth_provider_type,
    has_existing_session: props.has_existing_session,
  })
}

export function trackLoginSucceeded(props: {
  user_id: string
  user_plan: UserPlanAnalytics | string
  login_surface: LoginSurface
  auth_provider_type: string
  invited_user: boolean
}) {
  emitAnalyticsEvent(ANALYTICS_EVENTS.login_succeeded, {
    user_id: props.user_id,
    user_plan: props.user_plan,
    plan: props.user_plan,
    login_surface: props.login_surface,
    auth_provider_type: props.auth_provider_type,
    invited_user: props.invited_user,
  })
  emitAnalyticsEvent(ANALYTICS_EVENTS.plan_context_on_login, {
    user_plan: props.user_plan,
    login_surface: props.login_surface,
    beta_user: props.invited_user,
  })
}

export function trackLoginFailed(props: {
  failure_reason: LoginFailureReason
  login_surface: LoginSurface
  auth_provider_type: string
}) {
  emitAnalyticsEvent(ANALYTICS_EVENTS.login_failed, {
    failure_reason: props.failure_reason,
    login_surface: props.login_surface,
    auth_provider_type: props.auth_provider_type,
  })
}
