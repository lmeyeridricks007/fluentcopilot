import type { ConversationSummary, ScenarioRuntimeConfig, ScenarioRuntimeGoal } from '../../models/contracts'
import type { ScenarioSessionState } from './trainStationSlotState'
import {
  PUBLIC_TRANSPORT_GOAL_IDS,
  buildPublicTransportEvaluationContract,
  buildPublicTransportRecapHookBundle,
  publicTransportCompletionContractSatisfied,
  type PublicTransportVariationId,
} from './publicTransportEvaluationContract'

function dedupeAppend(base: string[] | undefined, extra: string[]): string[] {
  const seen = new Set((base ?? []).map((s) => s.trim()).filter(Boolean))
  const out = [...(base ?? [])]
  for (const s of extra) {
    const t = s.trim()
    if (!t || seen.has(t)) continue
    seen.add(t)
    out.push(t)
  }
  return out
}

function normalizeUserText(text: string): string {
  return text.trim().toLowerCase()
}

/**
 * Heuristic: infer which variation-weighted goal labels the learner likely satisfied from their Dutch.
 * Complements slot-derived mapping from {@link slotsToPublicTransportGoalLabels}.
 */
export function inferPublicTransportGoalLabelsFromUserText(
  scenarioGoals: readonly string[],
  userMessageTexts: readonly string[],
): string[] {
  const blob = userMessageTexts.map(normalizeUserText).filter(Boolean).join('\n')
  if (!blob) return []

  const has = (re: RegExp) => re.test(blob)
  const matched = new Set<string>()

  const routeQ =
    has(/\b(perron|spoor|platform|halte|lijn|tram|bus|metro|trein|route|uitstappen|instappen|overstappen)\b/) &&
    (has(/\?/) || has(/\b(welke|waar|hoe|moet ik|kan ik|is er)\b/))
  const ticketQ =
    (has(/\b(kaartje|ticket|kaart|biljet|retour|enkele reis|enkel|dagkaart|ov-chip|betaal|prijs|euro)\b/) &&
      (has(/\?/) || has(/\b(ik wil|mag ik|graag|alstublieft|alsjeblieft)\b/))) ||
    (has(/\b(ik wil|mag ik)\b/) && has(/\b(naar|retour|enkel|enkele|reis|kaartje|ticket|centraal|station)\b/))
  const delayQ =
    has(/\b(vertraging|vertraagd|uitval|geannuleerd|storing|omleiding|niet|rijdt|dienst)\b/) &&
    (has(/\?/) || has(/\b(heeft|is|rijdt|gaat)\b/))
  const dest = has(/\b(naar|tot|richting)\b/) && has(/\b[a-z]{4,}\b/)
  const confirm =
    has(/\b(dus|oké|oke|prima|begrepen|klopt|juist|goed|dan)\b/) || (has(/\?/) && has(/\b(perron|lijn|uitstappen|overstappen)\b/))
  const polite = has(/\b(alstublieft|alsjeblieft|dank|bedankt|graag|mag ik)\b/)
  const nextStep =
    has(/\b(wat nu|wat moet ik|welke tram|welke bus|andere route|alternatief|overstappen|moet ik nu)\b/) ||
    (has(/\?/) && has(/\b(nu|volgende|andere)\b/))

  for (const label of scenarioGoals) {
    const idMatch = /\[([A-Z0-9_]+)\]/.exec(label)
    const id = idMatch?.[1]
    if (!id) continue

    if (id === 'ASK_ROUTE_OR_BOARDING_QUESTION' && routeQ) matched.add(label)
    if (id === 'IDENTIFY_DESTINATION_OR_LINE_CLEARY' && dest) matched.add(label)
    if (id === 'CONFIRM_NEXT_STEP' && confirm) matched.add(label)
    if (id === 'NATURAL_TRANSPORT_POLITENESS' && polite) matched.add(label)

    if (id === 'ASK_FOR_TICKET_CLEARY' && ticketQ) matched.add(label)
    if (id === 'CONFIRM_TICKET_DETAIL' && has(/\b(prijs|euro|retour|enkel|geldig|betaal|pin|contant|zone)\b/)) {
      matched.add(label)
    }
    if (id === 'DESTINATION_OR_ROUTE_REFERENCE' && dest) matched.add(label)
    if (id === 'CLOSE_OR_ACKNOWLEDGE_NATURALLY' && (polite || has(/\b(prima|oké|oke|fijn|top)\b/))) matched.add(label)

    if (id === 'ASK_DELAY_OR_DISRUPTION_CLEARY' && delayQ) matched.add(label)
    if (id === 'KEEP_ROUTE_CONTEXT_CLEAR' && dest) matched.add(label)
    if (id === 'ASK_NEXT_STEP_OR_ALTERNATIVE' && nextStep) matched.add(label)
    if (id === 'ACKNOWLEDGE_OR_CONFIRM_NATURALLY' && (confirm || polite)) matched.add(label)
  }

  return [...matched]
}

export function slotsToPublicTransportGoalLabels(params: {
  variation: PublicTransportVariationId
  structuredGoalIds: readonly string[]
  scenarioGoals: readonly ScenarioRuntimeGoal[]
}): string[] {
  const { variation, structuredGoalIds, scenarioGoals } = params
  const achieved = new Set(structuredGoalIds.filter(Boolean))
  const labelById = (id: string) => scenarioGoals.find((g) => g.id === id)?.label

  const add = (goalId: string, out: Set<string>) => {
    const l = labelById(goalId)
    if (l) out.add(l)
  }

  const out = new Set<string>()

  if (variation === 'route_and_platform') {
    const g = PUBLIC_TRANSPORT_GOAL_IDS.route_and_platform
    if (achieved.has('ASK_PLATFORM') || achieved.has('ASK_DEPARTURE_TIME')) add(g.ASK_ROUTE_OR_BOARDING_QUESTION, out)
    if (achieved.has('ASK_DESTINATION')) add(g.IDENTIFY_DESTINATION_OR_LINE_CLEARY, out)
    if (achieved.has('CONFIRM_DETAIL')) add(g.CONFIRM_NEXT_STEP, out)
    if (achieved.has('THANK_AND_CLOSE')) add(g.NATURAL_TRANSPORT_POLITENESS, out)
  } else if (variation === 'buying_ticket') {
    const g = PUBLIC_TRANSPORT_GOAL_IDS.buying_ticket
    if (achieved.has('ASK_DESTINATION')) add(g.ASK_FOR_TICKET_CLEARY, out)
    if (achieved.has('CONFIRM_DETAIL')) add(g.CONFIRM_TICKET_DETAIL, out)
    if (achieved.has('ASK_DESTINATION')) add(g.DESTINATION_OR_ROUTE_REFERENCE, out)
    if (achieved.has('THANK_AND_CLOSE')) add(g.CLOSE_OR_ACKNOWLEDGE_NATURALLY, out)
  } else {
    const g = PUBLIC_TRANSPORT_GOAL_IDS.delays_and_disruptions
    if (achieved.has('ASK_DELAY_STATUS') || achieved.has('ASK_DEPARTURE_TIME')) add(g.ASK_DELAY_OR_DISRUPTION_CLEARY, out)
    if (achieved.has('ASK_DESTINATION') || achieved.has('ASK_PLATFORM')) add(g.KEEP_ROUTE_CONTEXT_CLEAR, out)
    if (achieved.has('ASK_PLATFORM') || achieved.has('CONFIRM_DETAIL')) add(g.ASK_NEXT_STEP_OR_ALTERNATIVE, out)
    if (achieved.has('THANK_AND_CLOSE')) add(g.ACKNOWLEDGE_OR_CONFIRM_NATURALLY, out)
  }

  return [...out]
}

/**
 * Whether a train-station structured slot id (e.g. `ASK_DESTINATION`) produced this Speak Live
 * scenario goal label for the given variation — used to attach recap transcript quotes to goals
 * for report QA (quotes are keyed by structured ids, not bracket labels).
 */
export function structuredSlotSupportsPublicTransportCompletedGoal(
  structuredGoalId: string,
  scenarioGoalLabel: string,
  variation: PublicTransportVariationId | string | undefined,
  scenarioGoals: readonly ScenarioRuntimeGoal[],
): boolean {
  const v = (variation ?? 'route_and_platform') as PublicTransportVariationId
  const produced = slotsToPublicTransportGoalLabels({
    variation: v,
    structuredGoalIds: [structuredGoalId],
    scenarioGoals,
  })
  const want = scenarioGoalLabel.trim().toLowerCase()
  return produced.some((l) => l.trim().toLowerCase() === want)
}

export function reconcilePublicTransportLiveRecap(params: {
  summary: ConversationSummary
  slotState: ScenarioSessionState | null | undefined
  variation: PublicTransportVariationId
  scenarioGoals: readonly ScenarioRuntimeGoal[]
  scenarioRuntime?: ScenarioRuntimeConfig | null
  userMessageTexts: readonly string[]
}): ConversationSummary {
  const { summary, slotState, variation, scenarioGoals, scenarioRuntime, userMessageTexts } = params
  if (!slotState || slotState.scenarioSlug !== 'train-station') {
    return summary
  }

  const structuredIds = slotState.achievedGoals.map((h: { goalId: string }) => h.goalId)
  const fromSlots = slotsToPublicTransportGoalLabels({
    variation,
    structuredGoalIds: structuredIds,
    scenarioGoals,
  })
  const labels = scenarioGoals.map((g) => g.label)
  const fromText = inferPublicTransportGoalLabelsFromUserText(labels, userMessageTexts)

  const labelByLower = new Map(scenarioGoals.map((g) => [g.label.toLowerCase(), g.label]))
  const merged = new Set<string>()
  for (const g of summary.goalsCompleted ?? []) {
    if (typeof g !== 'string') continue
    const hit = labelByLower.get(g.toLowerCase())
    if (hit) merged.add(hit)
  }
  for (const g of fromSlots) merged.add(g)
  for (const g of fromText) merged.add(g)

  const goalsCompleted = scenarioGoals.map((g) => g.label).filter((l) => merged.has(l))
  const goalsMissed = scenarioGoals.map((g) => g.label).filter((l) => !merged.has(l))

  const runtime: ScenarioRuntimeConfig =
    scenarioRuntime?.id === 'public_transport'
      ? scenarioRuntime
      : ({
          id: 'public_transport',
          variation,
          goals: [...scenarioGoals],
          evaluationContract: buildPublicTransportEvaluationContract(variation),
        } as ScenarioRuntimeConfig)

  const contractMet = publicTransportCompletionContractSatisfied(runtime, goalsCompleted)
  const bundle = buildPublicTransportRecapHookBundle({
    variation,
    contractMet,
    completedGoalLabels: goalsCompleted,
    missedGoalLabels: goalsMissed,
    runtime,
  })

  const languageNoteLines = bundle.coachingHooks.map((h) => `coaching_hook:${h}`)
  const languageNotes = dedupeAppend(summary.languageNotes, languageNoteLines)
  const whatWentWell = bundle.positive.length ? dedupeAppend(summary.whatWentWell, bundle.positive) : summary.whatWentWell ?? []
  const whatToImprove = bundle.improve.length ? dedupeAppend(summary.whatToImprove, bundle.improve) : summary.whatToImprove ?? []

  return {
    ...summary,
    goalsCompleted,
    goalsMissed,
    whatWentWell,
    whatToImprove,
    languageNotes,
  }
}
