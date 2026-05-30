/**
 * Typed payloads for closed-beta funnel analytics (auth, waitlist, onboarding, plan).
 * Event names live on ANALYTICS_EVENTS; these types keep call sites consistent.
 */

export type LoginSurface =
  | 'public_login_page'
  | 'auth_provider_default'
  | 'dev_tools'
  | string

/** Normalized, query-friendly — maps from mock `MockAuthLoginError.code`. */
export type LoginFailureReason =
  | 'unknown_email_not_invited'
  | 'wrong_password'
  | 'account_inactive'
  | 'beta_access_denied'
  | 'signup_closed'
  | 'unknown'

export type UserPlanAnalytics = 'basic' | 'premium'

export type OnboardingSessionSource = 'first_login' | 'resumed'

export type OnboardingAbandonReason =
  | 'exited_to_public_marketing'
  | 'browser_exit'
  | 'session_lost_redirect'

export type UserStateTypeBootstrap = 'new' | 'returning' | 'session_initialized'
