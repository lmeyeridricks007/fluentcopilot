import type { ScenarioEvaluationContract, ScenarioRuntimeConfig, ScenarioRuntimeGoal } from '../../models/contracts'

/** Stable goal ids — must match labels built in {@link buildPublicTransportGoals}. */
export const PUBLIC_TRANSPORT_GOAL_IDS = {
  route_and_platform: {
    ASK_ROUTE_OR_BOARDING_QUESTION: 'ASK_ROUTE_OR_BOARDING_QUESTION',
    /** Spec spelling (learner-facing contract id). */
    IDENTIFY_DESTINATION_OR_LINE_CLEARY: 'IDENTIFY_DESTINATION_OR_LINE_CLEARY',
    CONFIRM_NEXT_STEP: 'CONFIRM_NEXT_STEP',
    NATURAL_TRANSPORT_POLITENESS: 'NATURAL_TRANSPORT_POLITENESS',
  },
  buying_ticket: {
    ASK_FOR_TICKET_CLEARY: 'ASK_FOR_TICKET_CLEARY',
    CONFIRM_TICKET_DETAIL: 'CONFIRM_TICKET_DETAIL',
    DESTINATION_OR_ROUTE_REFERENCE: 'DESTINATION_OR_ROUTE_REFERENCE',
    CLOSE_OR_ACKNOWLEDGE_NATURALLY: 'CLOSE_OR_ACKNOWLEDGE_NATURALLY',
  },
  delays_and_disruptions: {
    ASK_DELAY_OR_DISRUPTION_CLEARY: 'ASK_DELAY_OR_DISRUPTION_CLEARY',
    KEEP_ROUTE_CONTEXT_CLEAR: 'KEEP_ROUTE_CONTEXT_CLEAR',
    ASK_NEXT_STEP_OR_ALTERNATIVE: 'ASK_NEXT_STEP_OR_ALTERNATIVE',
    ACKNOWLEDGE_OR_CONFIRM_NATURALLY: 'ACKNOWLEDGE_OR_CONFIRM_NATURALLY',
  },
} as const

export type PublicTransportVariationId = keyof typeof PUBLIC_TRANSPORT_GOAL_IDS

function bracketLabel(id: string, body: string): string {
  return `[${id}] ${body}`
}

export function buildPublicTransportGoals(variation: PublicTransportVariationId): ScenarioRuntimeGoal[] {
  if (variation === 'route_and_platform') {
    const g = PUBLIC_TRANSPORT_GOAL_IDS.route_and_platform
    return [
      {
        id: g.ASK_ROUTE_OR_BOARDING_QUESTION,
        label: bracketLabel(
          g.ASK_ROUTE_OR_BOARDING_QUESTION,
          'Clearly ask which route, line, platform, or stop you need.'
        ),
        weight: 40,
        required: true,
        skill: 'route_question',
      },
      {
        id: g.IDENTIFY_DESTINATION_OR_LINE_CLEARY,
        label: bracketLabel(
          g.IDENTIFY_DESTINATION_OR_LINE_CLEARY,
          'State destination, line, or direction clearly.'
        ),
        weight: 25,
        required: true,
        skill: 'destination_clarity',
      },
      {
        id: g.CONFIRM_NEXT_STEP,
        label: bracketLabel(g.CONFIRM_NEXT_STEP, 'Confirm what to do next (e.g. “Dus perron vijf?”).'),
        weight: 20,
        required: false,
        skill: 'next_step_confirmation',
      },
      {
        id: g.NATURAL_TRANSPORT_POLITENESS,
        label: bracketLabel(g.NATURAL_TRANSPORT_POLITENESS, 'Keep tone practical and naturally polite.'),
        weight: 15,
        required: false,
        skill: 'transport_line_vocab',
      },
    ]
  }
  if (variation === 'buying_ticket') {
    const g = PUBLIC_TRANSPORT_GOAL_IDS.buying_ticket
    return [
      {
        id: g.ASK_FOR_TICKET_CLEARY,
        label: bracketLabel(g.ASK_FOR_TICKET_CLEARY, 'Clearly ask for or identify the ticket you need.'),
        weight: 35,
        required: true,
        skill: 'ticket_request',
      },
      {
        id: g.CONFIRM_TICKET_DETAIL,
        label: bracketLabel(
          g.CONFIRM_TICKET_DETAIL,
          'Handle a key ticket detail (single/return, price, payment, zone, validity).'
        ),
        weight: 30,
        required: true,
        skill: 'ticket_detail',
      },
      {
        id: g.DESTINATION_OR_ROUTE_REFERENCE,
        label: bracketLabel(g.DESTINATION_OR_ROUTE_REFERENCE, 'Keep destination or route context explicit.'),
        weight: 20,
        required: false,
        skill: 'destination_reference',
      },
      {
        id: g.CLOSE_OR_ACKNOWLEDGE_NATURALLY,
        label: bracketLabel(g.CLOSE_OR_ACKNOWLEDGE_NATURALLY, 'Close or acknowledge naturally (e.g. thanks, “oké, prima”).'),
        weight: 15,
        required: false,
        skill: 'transaction_close',
      },
    ]
  }
  const g = PUBLIC_TRANSPORT_GOAL_IDS.delays_and_disruptions
  return [
    {
      id: g.ASK_DELAY_OR_DISRUPTION_CLEARY,
      label: bracketLabel(g.ASK_DELAY_OR_DISRUPTION_CLEARY, 'Clearly ask about delay, cancellation, or disruption.'),
      weight: 35,
      required: true,
      skill: 'delay_question',
    },
    {
      id: g.KEEP_ROUTE_CONTEXT_CLEAR,
      label: bracketLabel(g.KEEP_ROUTE_CONTEXT_CLEAR, 'Keep destination, line, or route context explicit.'),
      weight: 25,
      required: false,
      skill: 'route_context',
    },
    {
      id: g.ASK_NEXT_STEP_OR_ALTERNATIVE,
      label: bracketLabel(
        g.ASK_NEXT_STEP_OR_ALTERNATIVE,
        'Ask what to do next (transfer, alternative line, different route).'
      ),
      weight: 25,
      required: true,
      skill: 'alternative_route',
    },
    {
      id: g.ACKNOWLEDGE_OR_CONFIRM_NATURALLY,
      label: bracketLabel(g.ACKNOWLEDGE_OR_CONFIRM_NATURALLY, 'Acknowledge or confirm naturally.'),
      weight: 15,
      required: false,
      skill: 'transfer_language',
    },
  ]
}

const RUBRICS: Record<
  PublicTransportVariationId,
  Record<string, { pass: string; partial: string; fail: string }>
> = {
  route_and_platform: {
    ASK_ROUTE_OR_BOARDING_QUESTION: {
      pass: 'Clear route/boarding question.',
      partial: 'Route context present, question weak.',
      fail: 'No usable route/boarding ask.',
    },
    IDENTIFY_DESTINATION_OR_LINE_CLEARY: {
      pass: 'Specific destination/line/stop is clear.',
      partial: 'Vague or incomplete target.',
      fail: 'No clear target.',
    },
    CONFIRM_NEXT_STEP: {
      pass: 'Useful confirmation of next step.',
      partial: 'Weak acknowledgment.',
      fail: 'No confirmation / follow-up.',
    },
    NATURAL_TRANSPORT_POLITENESS: {
      pass: 'Acceptable politeness / register.',
      partial: 'Neutral.',
      fail: 'Abrupt / unusable.',
    },
  },
  buying_ticket: {
    ASK_FOR_TICKET_CLEARY: {
      pass: 'Clear ticket request.',
      partial: 'Some ticket intent but incomplete.',
      fail: 'No clear request.',
    },
    CONFIRM_TICKET_DETAIL: {
      pass: 'At least one ticket detail handled clearly.',
      partial: 'Weak handling.',
      fail: 'No useful detail handling.',
    },
    DESTINATION_OR_ROUTE_REFERENCE: {
      pass: 'Destination/route clear.',
      partial: 'Slight drift.',
      fail: 'No clear target.',
    },
    CLOSE_OR_ACKNOWLEDGE_NATURALLY: {
      pass: 'Natural close/acknowledgment.',
      partial: 'Minimal.',
      fail: 'Abrupt.',
    },
  },
  delays_and_disruptions: {
    ASK_DELAY_OR_DISRUPTION_CLEARY: {
      pass: 'Clear disruption question.',
      partial: 'Delay context but weak phrasing.',
      fail: 'No clear disruption ask.',
    },
    KEEP_ROUTE_CONTEXT_CLEAR: {
      pass: 'Clear route context.',
      partial: 'Some route context.',
      fail: 'No route context.',
    },
    ASK_NEXT_STEP_OR_ALTERNATIVE: {
      pass: 'Asks what to do next.',
      partial: 'Weak next-step attempt.',
      fail: 'No next-step question.',
    },
    ACKNOWLEDGE_OR_CONFIRM_NATURALLY: {
      pass: 'Natural response.',
      partial: 'Minimal.',
      fail: 'Abrupt.',
    },
  },
}

export function buildPublicTransportEvaluationContract(variation: PublicTransportVariationId): ScenarioEvaluationContract {
  if (variation === 'route_and_platform') {
    const g = PUBLIC_TRANSPORT_GOAL_IDS.route_and_platform
    return {
      schemaVersion: 1,
      variationId: 'route_and_platform',
      variationTitle: 'Find the right route / platform / stop',
      userGoalSummary:
        'The learner asks which route, line, platform, or stop they need, and confirms the answer.',
      completionRequiredPassGoalIds: [g.ASK_ROUTE_OR_BOARDING_QUESTION, g.IDENTIFY_DESTINATION_OR_LINE_CLEARY],
      recapHooksPositive: [
        'asked route/platform question clearly',
        'destination or line was clear',
        'confirmed the next step',
      ],
      recapHooksImprove: [
        'ask the boarding question more directly',
        'name the destination or line more clearly',
        'confirm what to do next',
      ],
      coachingHooks: ['route_question', 'destination_clarity', 'transport_line_vocab', 'next_step_confirmation'],
      goalRubrics: RUBRICS.route_and_platform,
    }
  }
  if (variation === 'buying_ticket') {
    const g = PUBLIC_TRANSPORT_GOAL_IDS.buying_ticket
    return {
      schemaVersion: 1,
      variationId: 'buying_ticket',
      variationTitle: 'Buy or ask about a ticket',
      userGoalSummary: 'The learner asks for a ticket and confirms key ticket details.',
      completionRequiredPassGoalIds: [g.ASK_FOR_TICKET_CLEARY, g.CONFIRM_TICKET_DETAIL],
      recapHooksPositive: [
        'asked for the ticket clearly',
        'handled ticket detail well',
        'kept destination clear',
      ],
      recapHooksImprove: [
        'ask for the ticket more directly',
        'confirm one key ticket detail',
        'keep the route/destination specific',
      ],
      coachingHooks: ['ticket_request', 'ticket_detail', 'destination_reference', 'transaction_close'],
      goalRubrics: RUBRICS.buying_ticket,
    }
  }
  const g = PUBLIC_TRANSPORT_GOAL_IDS.delays_and_disruptions
  return {
    schemaVersion: 1,
    variationId: 'delays_and_disruptions',
    variationTitle: 'Ask about delays / route changes',
    userGoalSummary:
      'The learner asks about a delay or disruption, keeps the route context clear, and asks what to do next.',
    completionRequiredPassGoalIds: [g.ASK_DELAY_OR_DISRUPTION_CLEARY, g.ASK_NEXT_STEP_OR_ALTERNATIVE],
    recapHooksPositive: [
      'asked about disruption clearly',
      'route context stayed clear',
      'asked what to do next',
    ],
    recapHooksImprove: [
      'mention the destination/line clearly',
      'ask the next-step question directly',
      'confirm the route change clearly',
    ],
    coachingHooks: ['delay_question', 'route_context', 'alternative_route', 'transfer_language'],
    goalRubrics: RUBRICS.delays_and_disruptions,
  }
}

function norm(s: string): string {
  return s.trim().toLowerCase()
}

function hasCompletedLabel(completed: Set<string>, goals: ScenarioRuntimeGoal[], id: string): boolean {
  const label = goals.find((g) => g.id === id)?.label
  if (!label) return false
  return completed.has(norm(label))
}

/** Pass = label string appears in recap completed list (exact canonical match after merge). */
export function publicTransportCompletionContractSatisfied(
  runtime: ScenarioRuntimeConfig | null | undefined,
  completedGoalLabels: string[]
): boolean {
  if (runtime?.id !== 'public_transport') return false
  const variation = (runtime.variation ?? '') as PublicTransportVariationId
  const goals = runtime.goals ?? []
  if (!goals.length) return false
  const completed = new Set(completedGoalLabels.map(norm))
  const ec = runtime.evaluationContract ?? buildPublicTransportEvaluationContract(variation)
  for (const id of ec.completionRequiredPassGoalIds) {
    if (!hasCompletedLabel(completed, goals, id)) return false
  }
  return true
}

export type PublicTransportCoachingHook =
  | 'route_question'
  | 'destination_clarity'
  | 'transport_line_vocab'
  | 'next_step_confirmation'
  | 'ticket_request'
  | 'ticket_detail'
  | 'destination_reference'
  | 'transaction_close'
  | 'delay_question'
  | 'route_context'
  | 'alternative_route'
  | 'transfer_language'

const COACHING_BY_GOAL_ID: Record<string, PublicTransportCoachingHook[]> = {
  ASK_ROUTE_OR_BOARDING_QUESTION: ['route_question'],
  IDENTIFY_DESTINATION_OR_LINE_CLEARY: ['destination_clarity'],
  CONFIRM_NEXT_STEP: ['next_step_confirmation'],
  NATURAL_TRANSPORT_POLITENESS: ['transport_line_vocab'],
  ASK_FOR_TICKET_CLEARY: ['ticket_request'],
  CONFIRM_TICKET_DETAIL: ['ticket_detail'],
  DESTINATION_OR_ROUTE_REFERENCE: ['destination_reference'],
  CLOSE_OR_ACKNOWLEDGE_NATURALLY: ['transaction_close'],
  ASK_DELAY_OR_DISRUPTION_CLEARY: ['delay_question'],
  KEEP_ROUTE_CONTEXT_CLEAR: ['route_context'],
  ASK_NEXT_STEP_OR_ALTERNATIVE: ['alternative_route', 'transfer_language'],
  ACKNOWLEDGE_OR_CONFIRM_NATURALLY: ['transfer_language'],
}

export function coachingHooksForPublicTransportMissedGoalIds(goalIds: string[]): PublicTransportCoachingHook[] {
  const out = new Set<PublicTransportCoachingHook>()
  for (const id of goalIds) {
    for (const h of COACHING_BY_GOAL_ID[id] ?? []) out.add(h)
  }
  return [...out]
}

function completedHasFragment(completedNorm: Set<string>, fragment: string): boolean {
  const f = fragment.toLowerCase()
  for (const c of completedNorm) {
    if (c.includes(f)) return true
  }
  return false
}

export type PublicTransportRecapHookBundle = {
  positive: string[]
  improve: string[]
  coachingHooks: PublicTransportCoachingHook[]
}

export function buildPublicTransportRecapHookBundle(params: {
  variation: PublicTransportVariationId | string | undefined
  contractMet: boolean
  completedGoalLabels: string[]
  missedGoalLabels: string[]
  runtime: ScenarioRuntimeConfig | null | undefined
}): PublicTransportRecapHookBundle {
  const v = (params.variation ?? 'route_and_platform') as PublicTransportVariationId
  const goals = params.runtime?.goals ?? []
  const missedNorm = new Set(params.missedGoalLabels.map(norm))
  const completedNorm = new Set(params.completedGoalLabels.map(norm))
  const missedIds = new Set(goals.filter((g) => missedNorm.has(norm(g.label))).map((g) => g.id))
  const coachingHooks = coachingHooksForPublicTransportMissedGoalIds([...missedIds])
  const ec = params.runtime?.evaluationContract ?? buildPublicTransportEvaluationContract(v)

  if (params.contractMet) {
    const positive: string[] = []
    if (v === 'route_and_platform') {
      if (completedHasFragment(completedNorm, 'route, line, platform')) positive.push(ec.recapHooksPositive[0] ?? 'asked route/platform question clearly')
      if (completedHasFragment(completedNorm, 'destination, line, or direction')) positive.push(ec.recapHooksPositive[1] ?? 'destination or line was clear')
      if (completedHasFragment(completedNorm, 'confirm what to do next')) positive.push(ec.recapHooksPositive[2] ?? 'confirmed the next step')
    } else if (v === 'buying_ticket') {
      if (completedHasFragment(completedNorm, 'ticket')) positive.push(ec.recapHooksPositive[0] ?? 'asked for the ticket clearly')
      if (completedHasFragment(completedNorm, 'ticket detail')) positive.push(ec.recapHooksPositive[1] ?? 'handled ticket detail well')
      if (completedHasFragment(completedNorm, 'destination or route context')) positive.push(ec.recapHooksPositive[2] ?? 'kept destination clear')
    } else {
      if (completedHasFragment(completedNorm, 'delay')) positive.push(ec.recapHooksPositive[0] ?? 'asked about disruption clearly')
      if (completedHasFragment(completedNorm, 'route context')) positive.push(ec.recapHooksPositive[1] ?? 'route context stayed clear')
      if (completedHasFragment(completedNorm, 'what to do next')) positive.push(ec.recapHooksPositive[2] ?? 'asked what to do next')
    }
    return { positive, improve: [], coachingHooks }
  }

  return {
    positive: [],
    improve: [...ec.recapHooksImprove],
    coachingHooks,
  }
}

/** Stretch tier: politeness / natural close goals get the small remainder pool in evaluation. */
export function publicTransportGoalIsStretchTier(goalLabel: string, variation: PublicTransportVariationId | string | undefined): boolean {
  const gl = norm(goalLabel)
  const v = (variation ?? '') as PublicTransportVariationId
  if (v === 'route_and_platform') {
    return gl.includes('polite') || gl.includes('naturally polite')
  }
  if (v === 'buying_ticket') {
    return gl.includes('acknowledge naturally') || gl.includes('close or acknowledge')
  }
  if (v === 'delays_and_disruptions') {
    return gl.includes('acknowledge or confirm naturally')
  }
  return false
}

/**
 * Map train-station slot ids (recap after {@link reconcileTrainStationLiveRecap}) to public-transport goal labels
 * so evaluation evidence can reuse ASK_* transcript grounding.
 */
export function publicTransportStructuredSlotProjection(
  goalLabel: string,
  variation: PublicTransportVariationId | string | undefined
): string[] {
  const lower = goalLabel.toLowerCase()
  const v = (variation ?? 'route_and_platform') as PublicTransportVariationId
  if (v === 'route_and_platform') {
    const ids: string[] = []
    if (/(route|platform|stop|boarding|perron|spoor|halte|lijn|uitstappen)/i.test(lower)) {
      ids.push('ASK_PLATFORM', 'ASK_DEPARTURE_TIME')
    }
    if (/(destination|direction|line|naar)/i.test(lower)) ids.push('ASK_DESTINATION')
    if (/(confirm|next step|dus |klopt)/i.test(lower)) ids.push('CONFIRM_DETAIL')
    if (/(polite|thanks|dank|bedank)/i.test(lower)) ids.push('THANK_AND_CLOSE')
    return [...new Set(ids)]
  }
  if (v === 'buying_ticket') {
    const ids: string[] = []
    if (/(ticket|kaartje|retour|enkele)/i.test(lower)) ids.push('ASK_DESTINATION', 'CONFIRM_DETAIL')
    if (/(price|pay|pinnen|geldig|zone)/i.test(lower)) ids.push('CONFIRM_DETAIL')
    if (/(destination|route|naar)/i.test(lower)) ids.push('ASK_DESTINATION')
    if (/(dank|oké|oke|prima)/i.test(lower)) ids.push('THANK_AND_CLOSE')
    return [...new Set(ids)]
  }
  const ids: string[] = []
  if (/(delay|disruption|op tijd|vertraging|rijdt|uitval)/i.test(lower)) ids.push('ASK_DELAY_STATUS')
  if (/(route|destination|lijn|halte|perron)/i.test(lower)) ids.push('ASK_DESTINATION', 'ASK_PLATFORM')
  if (/(next|alternative|overstap|andere route|welke tram|welke bus)/i.test(lower)) ids.push('CONFIRM_DETAIL', 'ASK_DEPARTURE_TIME', 'ASK_PLATFORM')
  if (/(dank|oké|oke|begrepen)/i.test(lower)) ids.push('THANK_AND_CLOSE')
  return [...new Set(ids)]
}

/** Ground Speak Live LLM eval / scene with the measurable contract (English). */
export function buildPublicTransportSpeakLiveLlmContract(runtime: ScenarioRuntimeConfig): string {
  if (runtime.id !== 'public_transport') return ''
  const v = (runtime.variation ?? 'route_and_platform') as PublicTransportVariationId
  const ec = runtime.evaluationContract ?? buildPublicTransportEvaluationContract(v)
  const goalLines =
    runtime.goals?.map((g) => `- ${g.label} (weight ${g.weight}%; skill=${g.skill})`).join('\n') ?? ''
  const rubricLines = ec.goalRubrics
    ? runtime.goals
        ?.map((g) => {
          const r = ec.goalRubrics?.[g.id]
          if (!r) return ''
          return `- ${g.id}: pass=${r.pass}; partial=${r.partial}; fail=${r.fail}`
        })
        .filter(Boolean)
        .join('\n') ?? ''
    : ''
  return [
    '--- Public transport (Speak Live) · evaluation contract (English meta) ---',
    `Variation: ${ec.variationTitle} (${ec.variationId})`,
    `User goal: ${ec.userGoalSummary}`,
    `Session complete when these goal ids are satisfied in recap: ${ec.completionRequiredPassGoalIds.join(' AND ')}.`,
    `Recap positives: ${ec.recapHooksPositive.join('; ')}`,
    `Recap improve: ${ec.recapHooksImprove.join('; ')}`,
    `Coaching hooks: ${ec.coachingHooks.join(', ')}`,
    goalLines ? `Weighted goals:\n${goalLines}` : '',
    rubricLines ? `Rubric (pass / partial / fail):\n${rubricLines}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}
