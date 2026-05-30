import type { DirectionsVariation } from './directionsGettingSomewhereScenario'
import type { ScenarioRuntimeConfig, ScenarioRuntimeGoal } from '../../models/contracts'

/** Stable ids — must match `buildGoals` in `directionsGettingSomewhereScenario.ts`. */
export const DIRECTIONS_GOAL_IDS = {
  asking_for_directions: {
    askDirectionDirectly: 'ask_direction_directly',
    nameDestinationClearly: 'name_destination_clearly',
    usePoliteOrNaturalOpening: 'use_polite_or_natural_opening',
    followUpOrConfirm: 'follow_up_or_confirm',
  },
  understanding_instructions: {
    handleDirectionalLanguage: 'handle_directional_language',
    acknowledgeOrProcessRouteStep: 'acknowledge_or_process_route_step',
    askForClarificationIfNeeded: 'ask_for_clarification_if_needed',
    keepDestinationContextClear: 'keep_destination_context_clear',
  },
  confirming_route: {
    confirmRouteCorrectly: 'confirm_route_correctly',
    useSequenceLanguage: 'use_sequence_language',
    clarifyUncertaintyDirectly: 'clarify_uncertainty_directly',
    closeOrAcknowledgeNaturally: 'close_or_acknowledge_naturally',
  },
} as const

export type DirectionsCoachingHook =
  | 'direct_direction_question'
  | 'destination_wording'
  | 'polite_opening'
  | 'follow_up_check'
  | 'direction_vocab'
  | 'route_step_processing'
  | 'clarification_request'
  | 'destination_context'
  | 'route_confirmation'
  | 'sequencing_words'
  | 'uncertainty_clarification'
  | 'natural_close'

const COACHING_BY_GOAL_ID: Record<string, DirectionsCoachingHook[]> = {
  ask_direction_directly: ['direct_direction_question'],
  name_destination_clearly: ['destination_wording'],
  use_polite_or_natural_opening: ['polite_opening'],
  follow_up_or_confirm: ['follow_up_check'],
  handle_directional_language: ['direction_vocab'],
  acknowledge_or_process_route_step: ['route_step_processing'],
  ask_for_clarification_if_needed: ['clarification_request'],
  keep_destination_context_clear: ['destination_context'],
  confirm_route_correctly: ['route_confirmation'],
  use_sequence_language: ['sequencing_words'],
  clarify_uncertainty_directly: ['uncertainty_clarification'],
  close_or_acknowledge_naturally: ['natural_close'],
}

export function coachingHooksForDirectionsGoalIds(goalIds: string[]): DirectionsCoachingHook[] {
  const out = new Set<DirectionsCoachingHook>()
  for (const id of goalIds) {
    for (const h of COACHING_BY_GOAL_ID[id] ?? []) out.add(h)
  }
  return [...out]
}

function norm(s: string): string {
  return s.trim().toLowerCase()
}

function hasCompletedLabel(completed: Set<string>, goals: ScenarioRuntimeGoal[], id: string): boolean {
  const label = goals.find((g) => g.id === id)?.label
  if (!label) return false
  return completed.has(norm(label))
}

/**
 * Strict session contract: "passed" for product/recap when these goal labels are in `goalsCompleted`.
 * Uses runtime goal ids + labels from persisted `scenarioRuntimeConfig`.
 */
export function directionsCompletionContractSatisfied(
  runtime: ScenarioRuntimeConfig | null | undefined,
  completedGoalLabels: string[]
): boolean {
  const variation = (runtime?.variation ?? '') as DirectionsVariation
  const goals = runtime?.goals ?? []
  if (!goals.length) return false
  const completed = new Set(completedGoalLabels.map(norm))

  if (variation === 'asking_for_directions') {
    const ids = DIRECTIONS_GOAL_IDS.asking_for_directions
    return (
      hasCompletedLabel(completed, goals, ids.askDirectionDirectly) &&
      hasCompletedLabel(completed, goals, ids.nameDestinationClearly)
    )
  }
  if (variation === 'understanding_instructions') {
    const ids = DIRECTIONS_GOAL_IDS.understanding_instructions
    const handle = hasCompletedLabel(completed, goals, ids.handleDirectionalLanguage)
    const step = hasCompletedLabel(completed, goals, ids.acknowledgeOrProcessRouteStep)
    const clarify = hasCompletedLabel(completed, goals, ids.askForClarificationIfNeeded)
    return handle && (step || clarify)
  }
  if (variation === 'confirming_route') {
    const ids = DIRECTIONS_GOAL_IDS.confirming_route
    return (
      hasCompletedLabel(completed, goals, ids.confirmRouteCorrectly) &&
      hasCompletedLabel(completed, goals, ids.useSequenceLanguage)
    )
  }
  return false
}

/** Weight tier: stretch goals use the small remainder pool in the evaluation orchestrator. */
export function directionsGoalIsStretchTier(
  goalLabel: string,
  variation: DirectionsVariation | string | undefined
): boolean {
  const gl = norm(goalLabel)
  if (!variation) {
    if (gl.includes('opening') || gl.includes('vervolgvraag') || gl.includes('na het antwoord')) return true
    if (gl.includes('zelfde bestemming') || gl.includes('in beeld')) return true
    if (gl.includes('twijfel')) return true
    if (gl.includes('bedanking') || gl.includes('sluit natuurlijk')) return true
    return false
  }
  const v = variation as DirectionsVariation

  if (v === 'asking_for_directions') {
    return gl.includes('opening') || gl.includes('vervolgvraag') || gl.includes('na het antwoord')
  }
  if (v === 'understanding_instructions') {
    return gl.includes('zelfde bestemming') || gl.includes('in beeld')
  }
  if (v === 'confirming_route') {
    return gl.includes('twijfel') || gl.includes('bedanking') || gl.includes('sluit natuurlijk')
  }
  return false
}

export type DirectionsRecapHookBundle = {
  /** Shown when the strict completion contract is met. */
  positive: string[]
  /** Shown when the contract is not met — drives next-session focus. */
  improve: string[]
  /** Deterministic coaching tags for save/practice pipelines (optional). */
  coachingHooks: DirectionsCoachingHook[]
}

function completedHasFragment(completedNorm: Set<string>, fragment: string): boolean {
  const f = fragment.toLowerCase()
  for (const c of completedNorm) {
    if (c.includes(f)) return true
  }
  return false
}

export function buildDirectionsRecapHookBundle(params: {
  variation: DirectionsVariation | string | undefined
  contractMet: boolean
  completedGoalLabels: string[]
  missedGoalLabels: string[]
  runtime: ScenarioRuntimeConfig | null | undefined
}): DirectionsRecapHookBundle {
  const v = params.variation as DirectionsVariation
  const goals = params.runtime?.goals ?? []
  const missedNorm = new Set(params.missedGoalLabels.map(norm))
  const completedNorm = new Set(params.completedGoalLabels.map(norm))
  const missedIds = new Set(
    goals.filter((g) => missedNorm.has(norm(g.label))).map((g) => g.id)
  )

  const coachingHooks = coachingHooksForDirectionsGoalIds([...missedIds])

  if (params.contractMet) {
    const positive: string[] = []
    if (v === 'asking_for_directions') {
      if (completedHasFragment(completedNorm, 'waar het is')) positive.push('asked clearly where to go')
      if (completedHasFragment(completedNorm, 'bestemming concreet')) positive.push('named destination well')
      if (completedHasFragment(completedNorm, 'opening')) positive.push('used natural opener')
      if (completedHasFragment(completedNorm, 'vervolgvraag')) positive.push('used a useful follow-up or confirmation')
    } else if (v === 'understanding_instructions') {
      if (completedHasFragment(completedNorm, 'route-instructies')) positive.push('handled route words well')
      if (completedHasFragment(completedNorm, 'herhaling')) positive.push('asked for clarification naturally')
      if (completedHasFragment(completedNorm, 'zelfde bestemming')) positive.push('stayed grounded in the destination')
      if (completedHasFragment(completedNorm, 'route-stap')) positive.push('processed a route step clearly')
    } else if (v === 'confirming_route') {
      if (completedHasFragment(completedNorm, 'route helder')) positive.push('repeated the route well')
      if (completedHasFragment(completedNorm, 'volgorde')) positive.push('used sequence words correctly')
      if (completedHasFragment(completedNorm, 'twijfel')) positive.push('clarified uncertainty directly')
      if (completedHasFragment(completedNorm, 'bedank')) positive.push('closed naturally')
    }

    return {
      positive,
      improve: [],
      coachingHooks,
    }
  }

  const improve =
    v === 'asking_for_directions'
      ? ['ask more directly', 'name the place more clearly', 'add one follow-up after the answer']
      : v === 'understanding_instructions'
        ? ['confirm one route step directly', 'ask for repetition sooner', 'use route words more clearly']
        : ['repeat the route in order', 'use eerst/dan more clearly', 'add a natural close']

  return {
    positive: [],
    improve,
    coachingHooks,
  }
}
