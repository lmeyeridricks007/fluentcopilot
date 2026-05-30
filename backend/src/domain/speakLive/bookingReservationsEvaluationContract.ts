import type {
  ScenarioEvaluationContract,
  ScenarioRuntimeConfig,
  ScenarioRuntimeGoal,
} from '../../models/contracts'
import type { BookingReservationsVariation } from './bookingReservationsScenario'

/**
 * Stable ids — must match {@link buildBookingReservationsRuntimeGoals}.
 * Spec spelling “clearly” is normalized to `_clearly` (not “cleary”).
 */
export const BOOKING_GOAL_IDS = {
  asking_availability: {
    askAvailabilityClearly: 'ask_availability_clearly',
    nameTimeOrPreferenceClearly: 'name_time_or_preference_clearly',
    reactOrNegotiate: 'react_or_negotiate',
    naturalPoliteness: 'natural_politeness',
  },
  making_booking: {
    stateBookingIntentClearly: 'state_booking_intent_clearly',
    provideKeyDetails: 'provide_key_details',
    keepSubtypeContextClear: 'keep_subtype_context_clear',
    closeOrConfirmNaturally: 'close_or_confirm_naturally',
  },
  confirming_details: {
    confirmDetailsClearly: 'confirm_details_clearly',
    useCorrectDetailLanguage: 'use_correct_detail_language',
    clarifyOrCorrectIfNeeded: 'clarify_or_correct_if_needed',
    acknowledgeNaturally: 'acknowledge_naturally',
  },
} as const

const RUBRICS: Record<BookingReservationsVariation, Record<string, { pass: string; partial: string; fail: string }>> = {
  asking_availability: {
    ask_availability_clearly: {
      pass: 'Clear availability question (e.g. “Heeft u morgen om zes uur plek?”, “Is er nog plaats voor twee personen?”, “Wanneer kan ik langskomen?”).',
      partial: 'Booking intent is present but the availability ask is vague or indirect.',
      fail: 'No meaningful question about space, time, or availability.',
    },
    name_time_or_preference_clearly: {
      pass: 'Day or time preference is clear (e.g. morgen, vanavond, om zes uur, vrijdagmiddag).',
      partial: 'Time reference is vague (“later”, “binnenkort”) or underspecified.',
      fail: 'No usable timing or day reference.',
    },
    react_or_negotiate: {
      pass: 'Useful reaction or negotiation (e.g. “Heeft u iets later?”, “Dan neem ik half zeven.”, “Is er morgen iets?”).',
      partial: 'Weak acknowledgment with little follow-through.',
      fail: 'No reaction or follow-up to the answer.',
    },
    natural_politeness: {
      pass: 'Politeness markers feel natural (e.g. graag, alstublieft, dank u).',
      partial: 'Neutral tone — neither rude nor clearly polite.',
      fail: 'Abrupt, blunt, or unnatural for a booking context.',
    },
  },
  making_booking: {
    state_booking_intent_clearly: {
      pass: 'Booking intent is explicit (e.g. “Ik wil graag een tafel reserveren.”, “Ik wil graag een afspraak maken.”).',
      partial: 'Intent is implied but the request is weak or hedged.',
      fail: 'No clear booking or reservation request.',
    },
    provide_key_details: {
      pass: 'At least one key detail is clear (party size, service, time/day, name, etc.).',
      partial: 'A detail is attempted but vague or incomplete.',
      fail: 'No useful booking detail.',
    },
    keep_subtype_context_clear: {
      pass: 'It is clear this is a table, haircut/salon visit, or office-style appointment.',
      partial: 'Some context hints exist but the subtype stays ambiguous.',
      fail: 'Ambiguous — listener cannot tell restaurant vs salon vs appointment desk.',
    },
    close_or_confirm_naturally: {
      pass: 'Natural close or confirmation (e.g. “Dank u”, “Ja, graag”, “Dat is goed”).',
      partial: 'Minimal close (“ok”, “ja”) without warmth.',
      fail: 'Abrupt stop with no confirmation or thanks.',
    },
  },
  confirming_details: {
    confirm_details_clearly: {
      pass: 'Clear confirmation of date, time, name, or service (e.g. “Dus vrijdag om half drie?”, “Voor twee personen.”, “Onder de naam Lee.”, “Alleen knippen.”).',
      partial: 'Some detail is repeated but the confirmation is incomplete or fuzzy.',
      fail: 'No useful confirmation of the offered details.',
    },
    use_correct_detail_language: {
      pass: 'Date/time/name/service words are clear and unambiguous.',
      partial: 'Understandable but loosely phrased or underspecified.',
      fail: 'Confusing or incorrect detail wording.',
    },
    clarify_or_correct_if_needed: {
      pass: 'Natural correction or clarification when needed (e.g. “Nee, om drie uur.”, “Niet morgen, maar vrijdag.”).',
      partial: 'Weak or indirect correction.',
      fail: 'No correction when the staff member clearly misunderstood.',
    },
    acknowledge_naturally: {
      pass: 'Natural acknowledgment (e.g. “Ja, dat klopt.”, “Prima, dank u.”).',
      partial: 'Minimal acknowledgment.',
      fail: 'Abrupt or missing acknowledgment.',
    },
  },
}

export function buildBookingReservationsRuntimeGoals(variation: BookingReservationsVariation): ScenarioRuntimeGoal[] {
  if (variation === 'asking_availability') {
    const g = BOOKING_GOAL_IDS.asking_availability
    return [
      {
        id: g.askAvailabilityClearly,
        label: 'Vraag duidelijk naar beschikbaarheid.',
        weight: 40,
        required: true,
        skill: 'availability_question',
      },
      {
        id: g.nameTimeOrPreferenceClearly,
        label: 'Noem dag, tijd of tijdvoorkeur duidelijk.',
        weight: 25,
        required: true,
        skill: 'time_day_language',
      },
      {
        id: g.reactOrNegotiate,
        label: 'Reageer op het antwoord of vraag een alternatief.',
        weight: 20,
        required: false,
        skill: 'alternative_time_request',
      },
      {
        id: g.naturalPoliteness,
        label: 'Gebruik natuurlijke beleefdheid.',
        weight: 15,
        required: false,
        skill: 'polite_booking_tone',
      },
    ]
  }
  if (variation === 'making_booking') {
    const g = BOOKING_GOAL_IDS.making_booking
    return [
      {
        id: g.stateBookingIntentClearly,
        label: 'Zeg duidelijk dat u wilt reserveren of een afspraak wilt.',
        weight: 35,
        required: true,
        skill: 'booking_request',
      },
      {
        id: g.provideKeyDetails,
        label: 'Geef minstens één belangrijk reserveringsdetail duidelijk.',
        weight: 30,
        required: true,
        skill: 'booking_detail',
      },
      {
        id: g.keepSubtypeContextClear,
        label: 'Maak duidelijk of het om restaurant, kapsalon of balie-afspraak gaat.',
        weight: 20,
        required: false,
        skill: 'subtype_context',
      },
      {
        id: g.closeOrConfirmNaturally,
        label: 'Sluit natuurlijk af of bevestig kort.',
        weight: 15,
        required: false,
        skill: 'natural_close',
      },
    ]
  }
  const g = BOOKING_GOAL_IDS.confirming_details
  return [
    {
      id: g.confirmDetailsClearly,
      label: 'Bevestig datum, tijd, naam of dienst duidelijk.',
      weight: 40,
      required: true,
      skill: 'detail_confirmation',
    },
    {
      id: g.useCorrectDetailLanguage,
      label: 'Gebruik duidelijke woorden voor datum, tijd, naam of dienst.',
      weight: 25,
      required: true,
      skill: 'time_date_confirmation',
    },
    {
      id: g.clarifyOrCorrectIfNeeded,
      label: 'Corrigeer of verduidelijk indien nodig.',
      weight: 20,
      required: false,
      skill: 'correction_language',
    },
    {
      id: g.acknowledgeNaturally,
      label: 'Reageer natuurlijk (begrip / akkoord).',
      weight: 15,
      required: false,
      skill: 'acknowledgment_phrase',
    },
  ]
}

export function buildBookingReservationsEvaluationContract(
  variation: BookingReservationsVariation
): ScenarioEvaluationContract {
  if (variation === 'asking_availability') {
    const g = BOOKING_GOAL_IDS.asking_availability
    return {
      schemaVersion: 1,
      variationId: 'asking_availability',
      variationTitle: 'Ask about availability',
      userGoalSummary:
        'The learner asks whether there is space or time available and reacts appropriately to the answer.',
      completionRequiredPassGoalIds: [g.askAvailabilityClearly, g.nameTimeOrPreferenceClearly],
      recapHooksPositive: [
        'asked about availability clearly',
        'gave a clear time/day preference',
        'reacted naturally to the answer',
      ],
      recapHooksImprove: [
        'ask for availability more directly',
        'give the day/time clearly',
        'ask for an alternative if the slot is unavailable',
      ],
      coachingHooks: ['availability_question', 'time_day_language', 'alternative_time_request', 'polite_booking_tone'],
      goalRubrics: RUBRICS.asking_availability,
    }
  }
  if (variation === 'making_booking') {
    const g = BOOKING_GOAL_IDS.making_booking
    return {
      schemaVersion: 1,
      variationId: 'making_booking',
      variationTitle: 'Make the booking',
      userGoalSummary:
        'The learner clearly states booking intent and provides the key details needed to make the booking.',
      completionRequiredPassGoalIds: [g.stateBookingIntentClearly, g.provideKeyDetails],
      recapHooksPositive: [
        'made the booking request clearly',
        'gave useful details',
        'kept the booking context clear',
      ],
      recapHooksImprove: [
        'state the booking intent more directly',
        'add the missing detail sooner',
        'make the service or table request clearer',
      ],
      coachingHooks: ['booking_request', 'booking_detail', 'subtype_context', 'natural_close'],
      goalRubrics: RUBRICS.making_booking,
    }
  }
  const g = BOOKING_GOAL_IDS.confirming_details
  return {
    schemaVersion: 1,
    variationId: 'confirming_details',
    variationTitle: 'Confirm the details',
    userGoalSummary:
      'The learner confirms date, time, name, or service details clearly and naturally, and repairs misunderstandings when needed.',
    completionRequiredPassGoalIds: [g.confirmDetailsClearly, g.useCorrectDetailLanguage],
    recapHooksPositive: [
      'confirmed the key detail well',
      'used natural confirmation language',
      'corrected misunderstanding clearly',
    ],
    recapHooksImprove: [
      'repeat the date/time more clearly',
      'use a cleaner confirmation phrase',
      'correct the detail directly when needed',
    ],
    coachingHooks: ['detail_confirmation', 'time_date_confirmation', 'correction_language', 'acknowledgment_phrase'],
    goalRubrics: RUBRICS.confirming_details,
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

export function bookingCompletionContractSatisfied(
  runtime: ScenarioRuntimeConfig | null | undefined,
  completedGoalLabels: string[]
): boolean {
  if (runtime?.id !== 'booking_reservations') return false
  const variation = (runtime.variation ?? 'making_booking') as BookingReservationsVariation
  const goals = runtime.goals ?? []
  if (!goals.length) return false
  const completed = new Set(completedGoalLabels.map(norm))
  const ec = runtime.evaluationContract ?? buildBookingReservationsEvaluationContract(variation)
  for (const id of ec.completionRequiredPassGoalIds) {
    if (!hasCompletedLabel(completed, goals, id)) return false
  }
  return true
}

export type BookingCoachingHook =
  | 'availability_question'
  | 'time_day_language'
  | 'alternative_time_request'
  | 'polite_booking_tone'
  | 'booking_request'
  | 'booking_detail'
  | 'subtype_context'
  | 'natural_close'
  | 'detail_confirmation'
  | 'time_date_confirmation'
  | 'correction_language'
  | 'acknowledgment_phrase'

const COACHING_BY_GOAL_ID: Record<string, BookingCoachingHook[]> = {
  ask_availability_clearly: ['availability_question'],
  name_time_or_preference_clearly: ['time_day_language'],
  react_or_negotiate: ['alternative_time_request'],
  natural_politeness: ['polite_booking_tone'],
  state_booking_intent_clearly: ['booking_request'],
  provide_key_details: ['booking_detail'],
  keep_subtype_context_clear: ['subtype_context'],
  close_or_confirm_naturally: ['natural_close'],
  confirm_details_clearly: ['detail_confirmation'],
  use_correct_detail_language: ['time_date_confirmation'],
  clarify_or_correct_if_needed: ['correction_language'],
  acknowledge_naturally: ['acknowledgment_phrase'],
}

export function coachingHooksForBookingMissedGoalIds(goalIds: string[]): BookingCoachingHook[] {
  const out = new Set<BookingCoachingHook>()
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

export type BookingRecapHookBundle = {
  positive: string[]
  improve: string[]
  coachingHooks: BookingCoachingHook[]
}

export function buildBookingReservationsRecapHookBundle(params: {
  variation: BookingReservationsVariation | string | undefined
  contractMet: boolean
  completedGoalLabels: string[]
  missedGoalLabels: string[]
  runtime: ScenarioRuntimeConfig | null | undefined
}): BookingRecapHookBundle {
  const v = (params.variation ?? 'making_booking') as BookingReservationsVariation
  const goals = params.runtime?.goals ?? []
  const missedNorm = new Set(params.missedGoalLabels.map(norm))
  const completedNorm = new Set(params.completedGoalLabels.map(norm))
  const missedIds = new Set(goals.filter((g) => missedNorm.has(norm(g.label))).map((g) => g.id))
  const coachingHooks = coachingHooksForBookingMissedGoalIds([...missedIds])
  const ec = params.runtime?.evaluationContract ?? buildBookingReservationsEvaluationContract(v)

  if (params.contractMet) {
    const positive: string[] = []
    if (v === 'asking_availability') {
      if (completedHasFragment(completedNorm, 'beschikbaar')) positive.push(ec.recapHooksPositive[0] ?? 'asked about availability clearly')
      if (completedHasFragment(completedNorm, 'tijdvoorkeur') || completedHasFragment(completedNorm, 'dag, tijd'))
        positive.push(ec.recapHooksPositive[1] ?? 'gave a clear time/day preference')
      if (completedHasFragment(completedNorm, 'alternatief') || completedHasFragment(completedNorm, 'reageer'))
        positive.push(ec.recapHooksPositive[2] ?? 'reacted naturally to the answer')
    } else if (v === 'making_booking') {
      if (completedHasFragment(completedNorm, 'reserveren') || completedHasFragment(completedNorm, 'afspraak'))
        positive.push(ec.recapHooksPositive[0] ?? 'made the booking request clearly')
      if (completedHasFragment(completedNorm, 'detail')) positive.push(ec.recapHooksPositive[1] ?? 'gave useful details')
      if (completedHasFragment(completedNorm, 'restaurant') || completedHasFragment(completedNorm, 'kapsalon'))
        positive.push(ec.recapHooksPositive[2] ?? 'kept the booking context clear')
    } else {
      if (completedHasFragment(completedNorm, 'bevestig')) positive.push(ec.recapHooksPositive[0] ?? 'confirmed the key detail well')
      if (completedHasFragment(completedNorm, 'duidelijke woorden')) positive.push(ec.recapHooksPositive[1] ?? 'used natural confirmation language')
      if (completedHasFragment(completedNorm, 'corrigeer') || completedHasFragment(completedNorm, 'verduidelijk'))
        positive.push(ec.recapHooksPositive[2] ?? 'corrected misunderstanding clearly')
    }
    return { positive, improve: [], coachingHooks }
  }

  return {
    positive: [],
    improve: [...ec.recapHooksImprove],
    coachingHooks,
  }
}

/** Stretch goals: politeness, reaction/close, subtype/context — small pool in evaluation orchestrator. */
export function bookingGoalIsStretchTier(goalLabel: string, variation: BookingReservationsVariation | string | undefined): boolean {
  const gl = norm(goalLabel)
  const v = (variation ?? '') as BookingReservationsVariation
  if (v === 'asking_availability') {
    return gl.includes('alternatief') || gl.includes('beleefd')
  }
  if (v === 'making_booking') {
    return gl.includes('restaurant, kapsalon') || gl.includes('sluit natuurlijk')
  }
  if (v === 'confirming_details') {
    return gl.includes('corrigeer') || gl.includes('begrip')
  }
  return gl.includes('beleefd') || gl.includes('sluit')
}

/**
 * Heuristic: map learner Dutch to scenario goal **labels** (same strings as `scenario.goals` after runtime hydrate).
 */
export function inferBookingReservationsGoalLabelsFromUserText(
  scenarioGoals: string[],
  userMessageTexts: string[]
): string[] {
  const t = userMessageTexts.map((s) => s.trim()).filter(Boolean).join('\n').toLowerCase()
  if (!t.trim()) return []

  const out = new Set<string>()
  const addIf = (pred: (gl: string) => boolean) => {
    for (const g of scenarioGoals) {
      if (pred(g.toLowerCase())) out.add(g)
    }
  }

  if (/(plek|plaats|beschikbaar|vrij|vrije tijd|wanneer kan|heeft u|is er nog|reserveren voor|afspraak.*maken)/i.test(t)) {
    addIf((gl) => gl.includes('beschikbaar'))
  }

  if (/(morgen|vanavond|vrijdag|zaterdag|volgende week|om \d|half |uur|’s middags|’s ochtends|dagdeel)/i.test(t)) {
    addIf((gl) => gl.includes('tijdvoorkeur') || gl.includes('dag, tijd'))
  }

  if (/\?/.test(t) && /(anders|later|eerder|morgen iets|plek|tijd)/i.test(t)) {
    addIf((gl) => gl.includes('alternatief') || gl.includes('reageer op het antwoord'))
  }
  if (/(dan neem ik|iets later|half zeven|andere tijd|kan het om|liever|heeft u nog)/i.test(t)) {
    addIf((gl) => gl.includes('reageer op het antwoord'))
  }

  if (/(dank|bedank|alstublieft|graag|mag ik)/i.test(t)) {
    addIf((gl) => gl.includes('beleefd'))
  }

  if (/(ik wil graag|wil graag|kunnen we|mag ik een|reserveren|afspraak maken|tafel)/i.test(t)) {
    addIf((gl) => gl.includes('reserveren of een afspraak'))
  }

  if (/(personen|twee |vier |zes |tafel|knippen|wassen|trim|kapsalon|restaurant|balie|afspraak bij)/i.test(t)) {
    addIf((gl) => gl.includes('belangrijk reserveringsdetail'))
    addIf((gl) => gl.includes('restaurant, kapsalon'))
  }

  if (/(dus |klopt|bevestig|onder de naam|voor twee|alleen knippen|half drie|vrijdag om)/i.test(t)) {
    addIf((gl) => gl.includes('bevestig datum'))
    addIf((gl) => gl.includes('duidelijke woorden voor datum'))
  }

  if (/(nee,|niet morgen|bedoelt u|corrigeer|verkeerd|alleen een)/i.test(t)) {
    addIf((gl) => gl.includes('corrigeer'))
  }

  if (/(ja, dat klopt|dat klopt|prima|begrepen|akkoord)/i.test(t)) {
    addIf((gl) => gl.includes('begrip'))
  }

  if (/(dank u|bedankt|fijne dag|tot ziens)/i.test(t)) {
    addIf((gl) => gl.includes('sluit natuurlijk'))
  }

  return [...out]
}

/** Ground Speak Live LLM eval with the measurable contract (English meta). */
export function buildBookingReservationsSpeakLiveLlmContract(runtime: ScenarioRuntimeConfig): string {
  if (runtime.id !== 'booking_reservations') return ''
  const v = (runtime.variation ?? 'making_booking') as BookingReservationsVariation
  const ec = runtime.evaluationContract ?? buildBookingReservationsEvaluationContract(v)
  const goalLines =
    runtime.goals?.map((g) => `- ${g.label} (id=${g.id}, weight ${g.weight}%, skill=${g.skill})`).join('\n') ?? ''
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
    '--- Booking / reservations (Speak Live) · evaluation contract (English meta) ---',
    `Variation: ${ec.variationTitle} (${ec.variationId})`,
    `User goal: ${ec.userGoalSummary}`,
    `Session complete when these goal ids appear in recap goalsCompleted (by Dutch label match): ${ec.completionRequiredPassGoalIds.join(' AND ')}.`,
    `Recap positives: ${ec.recapHooksPositive.join('; ')}`,
    `Recap improve: ${ec.recapHooksImprove.join('; ')}`,
    `Coaching hooks: ${ec.coachingHooks.join(', ')}`,
    goalLines ? `Weighted goals:\n${goalLines}` : '',
    rubricLines ? `Rubric (pass / partial / fail):\n${rubricLines}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}
