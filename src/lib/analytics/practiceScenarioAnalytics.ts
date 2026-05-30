import { emitAnalyticsEvent } from '@/lib/analytics/analyticsService'
import { ANALYTICS_EVENTS } from '@/lib/analytics'

export type ScenarioAbandonPayload = {
  scenario_id: string
  scenario_mode: string
  scenario_category?: string
  entitlement_tier?: string
  exit_phase: string
  duration_ms: number
  user_turn_count: number
  support_tool_count: number
  goal_completed: boolean
  exit_point: 'navigation' | 'component_unmount'
}

/**
 * Standard scenario abandon — funnel drop-off signal.
 */
export function trackScenarioAbandoned(p: ScenarioAbandonPayload): void {
  emitAnalyticsEvent(ANALYTICS_EVENTS.scenario_abandoned, {
    scenario_id: p.scenario_id,
    scenario_mode: p.scenario_mode,
    scenario_category: p.scenario_category,
    entitlement_tier: p.entitlement_tier,
    exit_phase: p.exit_phase,
    duration_ms: p.duration_ms,
    conversation_turn_count: p.user_turn_count,
    support_used_before_exit: p.support_tool_count > 0,
    support_tool_count: p.support_tool_count,
    scenario_goal_completed: p.goal_completed,
    scenario_exit_point: p.exit_point,
  })
}

export type ScenarioViewedPayload = {
  scenario_id: string
  surface: 'catalog' | 'launch' | 'hub_recommendation' | string
  scenario_category?: string
  entitlement_tier?: string
}

export function trackScenarioViewed(p: ScenarioViewedPayload): void {
  emitAnalyticsEvent(ANALYTICS_EVENTS.scenario_viewed, {
    scenario_id: p.scenario_id,
    surface: p.surface,
    scenario_category: p.scenario_category,
    entitlement_tier: p.entitlement_tier,
  })
}

/** Unified “session began” for funneling (keeps legacy guided_/practice_open_* events alongside). */
export function trackScenarioStarted(input: {
  scenario_id: string
  scenario_mode: string
  scenario_category?: string
  entitlement_tier?: string
}): void {
  emitAnalyticsEvent(ANALYTICS_EVENTS.scenario_started, {
    scenario_id: input.scenario_id,
    scenario_mode: input.scenario_mode,
    scenario_category: input.scenario_category,
    entitlement_tier: input.entitlement_tier,
  })
}

/** Unified completion for cross-mode dashboards (alongside guided_/practice_open_*). */
export function trackScenarioCompleted(input: {
  scenario_id: string
  scenario_mode: string
  scenario_category?: string
  entitlement_tier?: string
  session_outcome?: string
  scenario_goal_completed: boolean
  duration_ms?: number
  conversation_turn_count?: number
  support_tool_count?: number
  confidence_percent?: number
}): void {
  emitAnalyticsEvent(ANALYTICS_EVENTS.scenario_completed, {
    scenario_id: input.scenario_id,
    scenario_mode: input.scenario_mode,
    scenario_category: input.scenario_category,
    entitlement_tier: input.entitlement_tier,
    session_outcome: input.session_outcome,
    scenario_goal_completed: input.scenario_goal_completed,
    duration_ms: input.duration_ms,
    conversation_turn_count: input.conversation_turn_count,
    support_tool_count: input.support_tool_count,
    confidence_percent: input.confidence_percent,
  })
}

/**
 * First learner message in open conversation — funnel step after start.
 */
export function trackScenarioFirstResponse(input: {
  scenario_id: string
  scenario_mode: string
  input_modality: 'typing' | 'speaking'
  user_turn_index: number
}): void {
  emitAnalyticsEvent(ANALYTICS_EVENTS.scenario_first_response, {
    scenario_id: input.scenario_id,
    scenario_mode: input.scenario_mode,
    input_modality: input.input_modality,
    user_turn_index: input.user_turn_index,
  })
}
