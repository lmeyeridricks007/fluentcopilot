import { emitAnalyticsEvent } from '@/lib/analytics/analyticsService'
import { ANALYTICS_EVENTS } from '@/lib/analytics'

export type WaitlistSignedInState = 'signed_out' | 'signed_in'

export function trackWaitlistCtaViewed(props: {
  source_surface: string
  route?: string
  cta_variant?: string
  plan_context?: string
  signed_in_state?: WaitlistSignedInState
}) {
  emitAnalyticsEvent(ANALYTICS_EVENTS.waitlist_cta_viewed, {
    source_surface: props.source_surface,
    route: props.route,
    cta_variant: props.cta_variant,
    plan_context: props.plan_context,
    signed_in_state: props.signed_in_state,
  })
}

export function trackWaitlistCtaClicked(props: {
  source_surface: string
  route?: string
  cta_variant?: string
  plan_context?: string
  signed_in_state?: WaitlistSignedInState
}) {
  emitAnalyticsEvent(ANALYTICS_EVENTS.waitlist_cta_clicked, {
    source_surface: props.source_surface,
    route: props.route,
    cta_variant: props.cta_variant,
    plan_context: props.plan_context,
    signed_in_state: props.signed_in_state,
  })
  emitAnalyticsEvent(ANALYTICS_EVENTS.waitlist_clicked, { surface: props.source_surface, route: props.route })
}

export function trackWaitlistMailtoTriggered(props: {
  source_surface: string
  route?: string
  cta_variant?: string
  plan_context?: string
  signed_in_state?: WaitlistSignedInState
}) {
  emitAnalyticsEvent(ANALYTICS_EVENTS.waitlist_mailto_triggered, {
    source_surface: props.source_surface,
    route: props.route,
    cta_variant: props.cta_variant,
    plan_context: props.plan_context,
    signed_in_state: props.signed_in_state,
  })
  emitAnalyticsEvent(ANALYTICS_EVENTS.mailto_triggered, { surface: props.source_surface, route: props.route })
}

export function trackSignupDisabledClicked(props: {
  source_surface: string
  route?: string
  plan_context?: string
}) {
  emitAnalyticsEvent(ANALYTICS_EVENTS.signup_disabled_clicked, {
    source_surface: props.source_surface,
    surface: props.source_surface,
    route: props.route,
    plan_context: props.plan_context,
  })
}

export function trackBetaRequestFormViewed(props: {
  source_surface: string
  route?: string
  signed_in_state?: WaitlistSignedInState
}) {
  emitAnalyticsEvent(ANALYTICS_EVENTS.beta_request_form_viewed, {
    source_surface: props.source_surface,
    route: props.route,
    signed_in_state: props.signed_in_state,
  })
}

export function trackBetaRequestSubmitted(props: {
  source_surface: string
  route?: string
  signed_in_state?: WaitlistSignedInState
  has_first_name?: boolean
}) {
  emitAnalyticsEvent(ANALYTICS_EVENTS.beta_request_submitted, {
    source_surface: props.source_surface,
    route: props.route,
    signed_in_state: props.signed_in_state,
    has_first_name: props.has_first_name,
  })
}

export function trackBetaRequestSucceeded(props: {
  source_surface: string
  route?: string
  signed_in_state?: WaitlistSignedInState
  delivered?: boolean
}) {
  emitAnalyticsEvent(ANALYTICS_EVENTS.beta_request_succeeded, {
    source_surface: props.source_surface,
    route: props.route,
    signed_in_state: props.signed_in_state,
    delivered: props.delivered,
  })
}

export function trackBetaRequestFailed(props: {
  source_surface: string
  route?: string
  signed_in_state?: WaitlistSignedInState
  reason: 'validation' | 'network' | 'server'
}) {
  emitAnalyticsEvent(ANALYTICS_EVENTS.beta_request_failed, {
    source_surface: props.source_surface,
    route: props.route,
    signed_in_state: props.signed_in_state,
    reason: props.reason,
  })
}

export function trackPublicHeroCtaClicked(props: {
  cta_role: 'primary' | 'secondary'
  route?: string
}) {
  emitAnalyticsEvent(ANALYTICS_EVENTS.public_hero_cta_clicked, {
    cta_role: props.cta_role,
    route: props.route,
  })
}
