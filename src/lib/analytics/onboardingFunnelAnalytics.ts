import { emitAnalyticsEvent } from '@/lib/analytics/analyticsService'
import { ANALYTICS_EVENTS } from '@/lib/analytics'
import type { OnboardingAbandonReason, OnboardingSessionSource } from '@/lib/analytics/funnelAnalyticsTypes'

export function trackOnboardingStepViewed(props: {
  step_id: string
  step_index: number
  total_steps: number
  route?: string
  user_plan?: string
  onboarding_source: OnboardingSessionSource
  has_previous_answers: boolean
}) {
  emitAnalyticsEvent(ANALYTICS_EVENTS.onboarding_step_viewed, {
    step_id: props.step_id,
    step_key: props.step_id,
    step_index: props.step_index,
    total_steps: props.total_steps,
    route: props.route,
    user_plan: props.user_plan,
    onboarding_source: props.onboarding_source,
    has_previous_answers: props.has_previous_answers,
  })
}

export function trackOnboardingStepCompleted(props: {
  step_id: string
  step_index: number
  total_steps: number
  user_plan?: string
  onboarding_source: OnboardingSessionSource
  primary_goal?: string
  target_path?: string
}) {
  emitAnalyticsEvent(ANALYTICS_EVENTS.onboarding_step_completed, {
    step_id: props.step_id,
    step_key: props.step_id,
    step_index: props.step_index,
    total_steps: props.total_steps,
    user_plan: props.user_plan,
    onboarding_source: props.onboarding_source,
    primary_goal: props.primary_goal,
    target_path: props.target_path,
  })
}

export function trackOnboardingAbandoned(props: {
  step_id: string
  step_index: number
  total_steps: number
  user_plan?: string
  reason: OnboardingAbandonReason
  route?: string
}) {
  emitAnalyticsEvent(ANALYTICS_EVENTS.onboarding_abandoned, {
    step_id: props.step_id,
    step_key: props.step_id,
    step_index: props.step_index,
    total_steps: props.total_steps,
    user_plan: props.user_plan,
    abandon_reason: props.reason,
    route: props.route,
  })
}
