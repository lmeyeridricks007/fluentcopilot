import type {
  PersonaConfig,
  ScenarioConfig,
  ScenarioRuntimeConfig,
  ScenarioSelectionOverrides,
} from '../../models/contracts'

import { getBookingReservationsStarterHintsForRuntime } from './bookingReservationsLearnerStarters'
import {
  buildBookingReservationsEvaluationContract,
  buildBookingReservationsRuntimeGoals,
} from './bookingReservationsEvaluationContract'
import {
  bookingDifficultyAdjustments,
  buildBookingReservationsAssistantBehavior,
  buildBookingReservationsRuntimeContext,
} from './bookingReservationsPrompts'
import {
  BOOKING_APPOINTMENT_KIND_LONG_POOL,
  BOOKING_APPOINTMENT_KIND_POOL,
  BOOKING_HAIRDRESSER_SERVICE_POOL,
  BOOKING_NAME_POOL,
  BOOKING_RESTAURANT_PARTY_POOL,
  BOOKING_RESTAURANT_SEATING_POOL,
  BOOKING_STYLIST_HINT_POOL,
  pickAppointmentDayPhrase,
  pickAppointmentTimePhrase,
  pickHairdresserDayPhrase,
  pickHairdresserTimePhrase,
  pickOne,
  pickRestaurantDayPhrase,
  pickRestaurantTimePhrase,
} from './bookingReservationsVocabularyPools'

export const BOOKING_RESERVATIONS_SCENARIO_ID = 'booking_reservations' as const
export const BOOKING_RESERVATIONS_TITLE = 'Reserveren / afspraken' as const
export const BOOKING_RESERVATIONS_CATEGORY = 'Afspraken' as const

export const BOOKING_RESERVATIONS_SUBTYPES = [
  'restaurant_booking',
  'hairdresser_booking',
  'appointment_booking',
] as const

export const BOOKING_RESERVATIONS_VARIATIONS = [
  'asking_availability',
  'making_booking',
  'confirming_details',
] as const

export type BookingReservationsLevel = 'A1' | 'A2' | 'B1'
export type BookingReservationsSubtype = (typeof BOOKING_RESERVATIONS_SUBTYPES)[number]
export type BookingReservationsVariation = (typeof BOOKING_RESERVATIONS_VARIATIONS)[number]

/** Optional URL/API override — biases randomized detail bundles. */
export type BookingReservationsDetailFocus =
  | 'time_day'
  | 'party_size'
  | 'service_type'
  | 'name'
  | 'stylist'
  | 'outdoor'
  | 'reason'

type BuildParams = {
  level: BookingReservationsLevel
  subType?: BookingReservationsSubtype
  variation?: BookingReservationsVariation | string
  detailFocus?: BookingReservationsDetailFocus | string
  random?: () => number
}

const SUBTYPE_LABEL_NL: Record<BookingReservationsSubtype, string> = {
  restaurant_booking: 'restaurant (reserveren)',
  hairdresser_booking: 'kapsalon',
  appointment_booking: 'balie / afspraak',
}

const PERSONA_BY_SUBTYPE: Record<
  BookingReservationsSubtype,
  { role: string; displayName: string; openingLine: string }
> = {
  restaurant_booking: {
    role: 'Host / restaurantmedewerker',
    displayName: 'Medewerker',
    openingLine: 'Goedenavond, waarmee kan ik u helpen?',
  },
  hairdresser_booking: {
    role: 'Receptionist kapsalon',
    displayName: 'Receptionist',
    openingLine: 'Hallo, waarmee kan ik u van dienst zijn?',
  },
  appointment_booking: {
    role: 'Balie / receptionist',
    displayName: 'Medewerker balie',
    openingLine: 'Goedemiddag, hoe kan ik u helpen?',
  },
}

function clampRoll(rng: () => number): number {
  const n = Number(rng())
  if (!Number.isFinite(n)) return Math.random()
  if (n <= 0) return 0
  if (n >= 1) return 0.999_999
  return n
}

export function normalizeBookingSubtype(raw: string | undefined): BookingReservationsSubtype | undefined {
  const v = (raw ?? '').trim().toLowerCase().replace(/-/g, '_')
  if (v === 'restaurant' || v === 'restaurant_booking') return 'restaurant_booking'
  if (v === 'hairdresser' || v === 'hair' || v === 'hairdresser_booking' || v === 'salon') return 'hairdresser_booking'
  if (v === 'appointment' || v === 'appointment_booking' || v === 'office' || v === 'desk') return 'appointment_booking'
  return (BOOKING_RESERVATIONS_SUBTYPES as readonly string[]).includes(v) ? (v as BookingReservationsSubtype) : undefined
}

export function normalizeBookingVariation(raw: string | undefined): BookingReservationsVariation | undefined {
  const v = (raw ?? '').trim().toLowerCase().replace(/-/g, '_')
  if (v === 'availability' || v === 'asking_availability' || v === 'ask') return 'asking_availability'
  if (v === 'booking' || v === 'making_booking' || v === 'reserve') return 'making_booking'
  if (v === 'confirm' || v === 'confirming' || v === 'confirming_details') return 'confirming_details'
  return (BOOKING_RESERVATIONS_VARIATIONS as readonly string[]).includes(v) ? (v as BookingReservationsVariation) : undefined
}

export function normalizeBookingDetailFocus(raw: string | undefined): BookingReservationsDetailFocus | undefined {
  const v = (raw ?? '').trim().toLowerCase().replace(/-/g, '_')
  const allowed: readonly BookingReservationsDetailFocus[] = [
    'time_day',
    'party_size',
    'service_type',
    'name',
    'stylist',
    'outdoor',
    'reason',
  ]
  return allowed.includes(v as BookingReservationsDetailFocus) ? (v as BookingReservationsDetailFocus) : undefined
}

type DetailBundle = {
  dayPhrase: string
  timePhrase: string
  namePhrase: string
  partyPhrase?: string
  outdoorNote?: string
  servicePhrase?: string
  stylistPhrase?: string
  appointmentKind?: string
}

function rollDetailBundle(
  subType: BookingReservationsSubtype,
  focus: BookingReservationsDetailFocus | undefined,
  level: BookingReservationsLevel,
  rng: () => number
): DetailBundle {
  const namePhrase = pickOne(BOOKING_NAME_POOL, rng)
  const dayPhrase =
    subType === 'restaurant_booking'
      ? pickRestaurantDayPhrase(rng)
      : subType === 'hairdresser_booking'
        ? pickHairdresserDayPhrase(rng)
        : pickAppointmentDayPhrase(rng)
  const timePhrase =
    subType === 'restaurant_booking'
      ? pickRestaurantTimePhrase(rng)
      : subType === 'hairdresser_booking'
        ? pickHairdresserTimePhrase(rng)
        : pickAppointmentTimePhrase(rng)
  const base: DetailBundle = { dayPhrase, timePhrase, namePhrase }

  if (subType === 'restaurant_booking') {
    base.partyPhrase =
      level === 'A1'
        ? pickOne(['voor twee personen', 'voor één persoon'] as const, rng)
        : pickOne(BOOKING_RESTAURANT_PARTY_POOL, rng)
    if (focus === 'outdoor' || (!focus && clampRoll(rng) < 0.35)) {
      const seat = pickOne(BOOKING_RESTAURANT_SEATING_POOL, rng)
      base.outdoorNote = seat === 'buiten' ? 'buiten op het terras' : 'binnen'
    }
  } else if (subType === 'hairdresser_booking') {
    base.servicePhrase =
      level === 'A1' ? pickOne(['knippen', 'alleen knippen'] as const, rng) : pickOne(BOOKING_HAIRDRESSER_SERVICE_POOL, rng)
    if (level !== 'A1' && (focus === 'stylist' || clampRoll(rng) < 0.3)) {
      base.stylistPhrase = pickOne(BOOKING_STYLIST_HINT_POOL, rng)
    }
  } else {
    const shortKind = pickOne(BOOKING_APPOINTMENT_KIND_POOL, rng)
    base.appointmentKind =
      level === 'A1'
        ? `een ${shortKind}`
        : clampRoll(rng) < 0.45
          ? `een ${shortKind}`
          : pickOne(BOOKING_APPOINTMENT_KIND_LONG_POOL, rng)
  }

  if (focus === 'party_size' && subType === 'restaurant_booking') {
    base.partyPhrase = pickOne(BOOKING_RESTAURANT_PARTY_POOL, rng)
  }
  if (focus === 'time_day') {
    const dayPart = ['vandaag', 'morgen', 'vrijdag', 'vanavond', 'morgenochtend'] as const
    const timePart = ['om drie uur', 'om half zeven', 'om zes uur', 'iets later', 'iets eerder'] as const
    base.dayPhrase = pickOne(dayPart, rng)
    base.timePhrase = pickOne(timePart, rng)
  }
  if (focus === 'name') {
    base.namePhrase = pickOne(['Lee', 'Smit', 'Van Dijk'] as const, rng)
  }
  if (focus === 'service_type' && subType === 'hairdresser_booking') {
    base.servicePhrase = pickOne(BOOKING_HAIRDRESSER_SERVICE_POOL, rng)
  }
  if (focus === 'reason' && subType === 'appointment_booking') {
    base.appointmentKind = pickOne(
      ['een kort consult', 'een document afhalen', 'een intakegesprek'],
      rng
    )
  }
  return base
}

function formatDetailLine(subType: BookingReservationsSubtype, d: DetailBundle): string {
  if (subType === 'restaurant_booking') {
    const parts = [d.partyPhrase ?? 'voor twee personen', d.dayPhrase, d.timePhrase]
    if (d.outdoorNote) parts.push(d.outdoorNote === 'buiten op het terras' ? 'liefst buiten' : 'binnen')
    parts.push(`naam: ${d.namePhrase}`)
    return parts.join(', ')
  }
  if (subType === 'hairdresser_booking') {
    const parts = [d.servicePhrase ?? 'knippen', d.dayPhrase, d.timePhrase, `naam: ${d.namePhrase}`]
    if (d.stylistPhrase) parts.push(`voorkeur: ${d.stylistPhrase}`)
    return parts.join(', ')
  }
  return `${d.appointmentKind ?? 'een afspraak'}, ${d.dayPhrase}, ${d.timePhrase}, naam: ${d.namePhrase}`
}

function buildLearnerSituationSummary(params: {
  subType: BookingReservationsSubtype
  variation: BookingReservationsVariation
  detailLine: string
}): string {
  const place = SUBTYPE_LABEL_NL[params.subType]
  const task =
    params.variation === 'asking_availability'
      ? 'Je wilt weten of een tijd of plek vrij is en reageert op het antwoord.'
      : params.variation === 'making_booking'
        ? 'Je wilt reserveren of een afspraak maken en geeft kerngegevens.'
        : 'Je bevestigt een voorstel of corrigeert een misverstand over de details.'
  return `${task} Setting: ${place}. Jouw voorkeur in deze run: ${params.detailLine}.`.replace(/\s+/g, ' ').trim()
}

function pickFrictionLine(level: BookingReservationsLevel, subType: BookingReservationsSubtype, rng: () => number): string {
  const pool =
    subType === 'restaurant_booking'
      ? [
          'de gevraagde tijd is niet vrij — bied precies één tijdslot dichtbij (bijv. halfuur eerder of later), niet meer',
          'er mist nog één gegeven — vraag kort alleen: “Voor hoeveel personen?”',
          'er mist een naam — vraag kort alleen: “Onder welke naam?”',
        ]
      : subType === 'hairdresser_booking'
        ? [
            'de gevraagde tijd valt weg — bied precies één nabije tijd als alternatief',
            'vraag kort: “Alleen knippen, of ook wassen?” (één detail)',
            'je noteert per ongeluk een verkeerde naam — laat de oefenaar in één zin corrigeren',
          ]
        : [
            'die dag is vol — bied precies één alternatief (andere dag of dagdeel)',
            'vraag kort naar de reden van het bezoek (één vraag)',
            'je herhaalt de tijd verkeerd — de oefenaar bevestigt of corrigeert het juiste tijdstip kort',
          ]
  if (level === 'A1') return pickOne([pool[0]!, 'één ontbrekend detail: vraag alleen naar tijd óf alleen naar naam.'], rng)
  return pickOne(pool, rng)
}

function collectOpeningVariants(subType: BookingReservationsSubtype): string[] {
  // Eerste beurt: begroeting + aanbod om te helpen; details (personen, tijd, behandeling) in vervolg.
  if (subType === 'restaurant_booking') {
    return [
      'Goedenavond — welkom. Waarmee kan ik u helpen?',
      'Hallo — goedenavond. Hoe kan ik u van dienst zijn?',
      'Welkom — goedenavond. Waar kan ik u mee helpen?',
      'Goedenavond — restaurant, waarmee kan ik u helpen?',
    ]
  }
  if (subType === 'hairdresser_booking') {
    return [
      'Hallo — goedemiddag. Waarmee kan ik u helpen?',
      'Goedemiddag — welkom bij de salon. Hoe kan ik u van dienst zijn?',
      'Dag — goedemiddag. Waar kan ik u mee helpen?',
      'Hallo — welkom. Waarmee kan ik u vandaag helpen?',
    ]
  }
  return [
    'Goedemiddag — welkom aan de balie. Waarmee kan ik u helpen?',
    'Hallo — goedemiddag. Hoe kan ik u van dienst zijn?',
    'Dag — welkom. Waar kan ik u mee helpen?',
    'Goedemiddag — goed u te zien. Waarmee kan ik u helpen?',
  ]
}

function buildOpeningLine(subType: BookingReservationsSubtype, level: BookingReservationsLevel, rng: () => number): string {
  const variants = collectOpeningVariants(subType)
  if (level === 'A1') {
    const a1 = variants.slice(0, 3)
    return pickOne(a1.length ? a1 : variants, rng)
  }
  return pickOne(variants, rng)
}

function coreSkillsFor(variation: BookingReservationsVariation): string[] {
  if (variation === 'asking_availability') {
    return ['availability_question', 'time_day_language', 'alternative_time_request', 'polite_booking_tone']
  }
  if (variation === 'making_booking') {
    return ['booking_request', 'booking_detail', 'subtype_context', 'natural_close']
  }
  return ['detail_confirmation', 'time_date_confirmation', 'correction_language', 'acknowledgment_phrase']
}

export function hydrateBookingReservationsLearnerSituationSummary(runtime: ScenarioRuntimeConfig): ScenarioRuntimeConfig {
  const normalizedId = runtime.id?.trim().toLowerCase().replace(/-/g, '_')
  if (normalizedId !== BOOKING_RESERVATIONS_SCENARIO_ID) return runtime
  if (runtime.learnerSituationSummary?.trim()) return runtime
  const subType = normalizeBookingSubtype(runtime.subType) ?? 'restaurant_booking'
  const variation = normalizeBookingVariation(runtime.variation) ?? 'making_booking'
  const detailLine = inferDetailLineFromBookingContext(runtime.context, subType)
  return {
    ...runtime,
    learnerSituationSummary: buildLearnerSituationSummary({ subType, variation, detailLine }),
  }
}

function inferDetailLineFromBookingContext(context: string, subType: BookingReservationsSubtype): string {
  const firstLine = (context.split('\n')[0] ?? '').trim()
  const lineM = /^Details voor deze run:\s*(.+)$/i.exec(firstLine)
  if (lineM?.[1]?.trim()) return lineM[1].trim().replace(/\.$/, '')
  const m = /Details voor deze run:\s*([^.]+\.)/i.exec(context)
  if (m?.[1]?.trim()) return m[1].trim().replace(/\.$/, '')
  return formatDetailLine(subType, {
    dayPhrase: 'morgen',
    timePhrase: 'om acht uur',
    namePhrase: '…',
    partyPhrase: subType === 'restaurant_booking' ? 'voor twee personen' : undefined,
    servicePhrase: subType === 'hairdresser_booking' ? 'knippen' : undefined,
    appointmentKind: subType === 'appointment_booking' ? 'een afspraak' : undefined,
  })
}

export function buildBookingReservationsScenario(config: BuildParams): ScenarioRuntimeConfig {
  const rng = config.random ?? Math.random
  const subType = normalizeBookingSubtype(config.subType) ?? pickOne(BOOKING_RESERVATIONS_SUBTYPES, rng)
  const variation =
    normalizeBookingVariation(config.variation as string | undefined) ?? pickOne(BOOKING_RESERVATIONS_VARIATIONS, rng)
  const detailFocus = normalizeBookingDetailFocus(config.detailFocus as string | undefined)
  const frictionEnabled = clampRoll(rng) < (config.level === 'A1' ? 0.12 : config.level === 'B1' ? 0.22 : 0.18)
  const bundle = rollDetailBundle(subType, detailFocus, config.level, rng)
  const detailLine = formatDetailLine(subType, bundle)
  const frictionLine = frictionEnabled ? pickFrictionLine(config.level, subType, rng) : 'geen extra wrijving in deze run'
  const goals = buildBookingReservationsRuntimeGoals(variation)
  const weights = Object.fromEntries(goals.map((g) => [g.id, g.weight]))
  const persona = PERSONA_BY_SUBTYPE[subType]
  const openingVariants = collectOpeningVariants(subType)

  return {
    id: BOOKING_RESERVATIONS_SCENARIO_ID,
    scenarioFamily: BOOKING_RESERVATIONS_SCENARIO_ID,
    title: BOOKING_RESERVATIONS_TITLE,
    category: BOOKING_RESERVATIONS_CATEGORY,
    level: config.level,
    subType,
    variation,
    context: buildBookingReservationsRuntimeContext({
      subType,
      variation,
      level: config.level,
      detailLine,
      frictionLine,
      frictionEnabled,
    }),
    learnerSituationSummary: buildLearnerSituationSummary({ subType, variation, detailLine }),
    goals,
    weights,
    assistantBehavior: buildBookingReservationsAssistantBehavior({
      subType,
      variation,
      level: config.level,
      frictionEnabled,
      openingVariants,
    }),
    difficultyAdjustments: bookingDifficultyAdjustments(config.level),
    hints: [...getBookingReservationsStarterHintsForRuntime(config.level, variation, subType)],
    persona: {
      role: persona.role,
      displayName: persona.displayName,
      sceneLabel: SUBTYPE_LABEL_NL[subType],
      subType,
      variation,
      ...(detailFocus ? { detailFocus } : {}),
      frictionEnabled: frictionEnabled ? 'light friction enabled for this run' : 'direct helpful run',
    },
    coreSkills: coreSkillsFor(variation),
    openingLine: buildOpeningLine(subType, config.level, rng),
    evaluationContract: buildBookingReservationsEvaluationContract(variation),
  }
}

export function maybeBuildBookingReservationsSpeakLiveScenarioRuntime(params: {
  scenario: ScenarioConfig
  level: BookingReservationsLevel
  overrides?: ScenarioSelectionOverrides | null
}): ScenarioRuntimeConfig | null {
  if (params.scenario.slug !== BOOKING_RESERVATIONS_SCENARIO_ID) return null
  const variation = normalizeBookingVariation(params.overrides?.variation as string | undefined)
  const subType = normalizeBookingSubtype(params.overrides?.subType)
  const detailFocus = normalizeBookingDetailFocus(params.overrides?.detailFocus as string | undefined)
  return buildBookingReservationsScenario({
    level: params.level,
    subType: subType ?? undefined,
    variation: variation ?? undefined,
    detailFocus: detailFocus ?? undefined,
  })
}

export function parseBookingReservationsScenarioRuntimeConfig(raw: unknown): ScenarioRuntimeConfig | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const candidate = raw as Partial<ScenarioRuntimeConfig>
  if (candidate.id !== BOOKING_RESERVATIONS_SCENARIO_ID) return null
  if (
    typeof candidate.title !== 'string' ||
    typeof candidate.category !== 'string' ||
    typeof candidate.level !== 'string' ||
    typeof candidate.subType !== 'string' ||
    typeof candidate.variation !== 'string' ||
    typeof candidate.context !== 'string'
  ) {
    return null
  }
  return hydrateBookingReservationsLearnerSituationSummary(candidate as ScenarioRuntimeConfig)
}

export function dutchPersonaForBookingReservationsIfNeeded(scenarioSlug: string, persona: PersonaConfig): PersonaConfig {
  if (scenarioSlug !== BOOKING_RESERVATIONS_SCENARIO_ID) return persona
  if (persona.slug !== 'booking_service_staff') return persona
  return { ...persona, displayName: 'Medewerker' }
}
