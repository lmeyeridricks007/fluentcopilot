import type {
  PersonaConfig,
  ScenarioConfig,
  ScenarioRuntimeConfig,
  ScenarioSelectionOverrides,
} from '../../models/contracts'

import { DOCTOR_PHARMACY_HELP_CONTEXT_SNIPPETS_NL } from './doctorPharmacyVocabularyPools'
import { getDoctorPharmacyStarterHintsForRuntime } from './doctorPharmacyLearnerStarters'
import {
  buildDoctorPharmacyEvaluationContract,
  buildDoctorPharmacyRuntimeGoals,
} from './doctorPharmacyEvaluationContract'
import {
  buildDoctorPharmacyAssistantBehavior,
  buildDoctorPharmacyRuntimeContext,
  doctorPharmacyDifficultyAdjustments,
} from './doctorPharmacyPrompts'

export const DOCTOR_PHARMACY_SCENARIO_ID = 'doctor_pharmacy' as const
export const DOCTOR_PHARMACY_TITLE = 'Dokter / apotheek' as const
export const DOCTOR_PHARMACY_CATEGORY = 'Gezondheid' as const

/** Bump so existing active Speak Live threads are not reused after changing the first assistant line / pool. */
export const DOCTOR_PHARMACY_SPEAK_LIVE_OPENING_CONTRACT_VERSION = 1 as const

/**
 * True when an existing Speak Live thread should not be resumed: missing runtime, wrong id, or opening
 * contract version too old (stale seeded assistant greeting).
 */
export function isDoctorPharmacySpeakLiveRuntimeOpeningStale(
  scenarioSlug: string,
  existingState: { scenarioRuntimeConfig?: ScenarioRuntimeConfig | null } | null | undefined,
): boolean {
  const slug = scenarioSlug.trim().toLowerCase().replace(/-/g, '_')
  if (slug !== DOCTOR_PHARMACY_SCENARIO_ID) return false
  const rc = existingState?.scenarioRuntimeConfig
  if (!rc || rc.id !== DOCTOR_PHARMACY_SCENARIO_ID) return true
  const v = rc.doctorPharmacyOpeningContractVersion
  if (typeof v !== 'number' || v < DOCTOR_PHARMACY_SPEAK_LIVE_OPENING_CONTRACT_VERSION) return true
  return false
}

export const DOCTOR_PHARMACY_SUBTYPES = ['doctor_visit', 'pharmacy', 'clinic_reception'] as const
export const DOCTOR_PHARMACY_VARIATIONS = ['symptoms', 'asking_for_help', 'understanding_instructions'] as const

export const DOCTOR_PHARMACY_HEALTH_FOCUS_IDS = [
  'headache',
  'cough',
  'sore_throat',
  'fever',
  'stomach_ache',
  'dizziness',
  'allergies',
  'tiredness',
  'medicine_instructions',
  'appointment_request',
] as const

export type DoctorPharmacyLevel = 'A1' | 'A2' | 'B1'
export type DoctorPharmacySubtype = (typeof DOCTOR_PHARMACY_SUBTYPES)[number]
export type DoctorPharmacyVariation = (typeof DOCTOR_PHARMACY_VARIATIONS)[number]
export type DoctorPharmacyHealthFocus = (typeof DOCTOR_PHARMACY_HEALTH_FOCUS_IDS)[number]

type BuildParams = {
  level: DoctorPharmacyLevel
  subType?: DoctorPharmacySubtype
  variation?: DoctorPharmacyVariation | string
  healthFocus?: DoctorPharmacyHealthFocus | string
  random?: () => number
}

const PERSONA_BY_SUBTYPE: Record<
  DoctorPharmacySubtype,
  { role: string; displayName: string; openingLine: string }
> = {
  doctor_visit: {
    role: 'Huisarts / arts (taaloefening)',
    displayName: 'Arts',
    openingLine: 'Goedemiddag — waarmee kan ik u helpen?',
  },
  pharmacy: {
    role: 'Apotheker / medewerker apotheek',
    displayName: 'Apotheker',
    openingLine: 'Goedendag — waarmee kan ik u helpen?',
  },
  clinic_reception: {
    role: 'Receptionist praktijk / poli',
    displayName: 'Receptionist',
    openingLine: 'Hallo — welkom bij de balie. Waarmee kan ik u helpen?',
  },
}

const SUBTYPE_LABEL_NL: Record<DoctorPharmacySubtype, string> = {
  doctor_visit: 'huisarts / consult',
  pharmacy: 'apotheek',
  clinic_reception: 'balie / praktijk',
}

const HEALTH_FOCUS_NL: Record<DoctorPharmacyHealthFocus, string> = {
  headache: 'hoofdpijn',
  cough: 'hoesten',
  sore_throat: 'keelpijn',
  fever: 'koorts',
  stomach_ache: 'buikpijn',
  dizziness: 'duizeligheid',
  allergies: 'allergie / jeuk',
  tiredness: 'vermoeidheid',
  medicine_instructions: 'uitleg medicijngebruik',
  appointment_request: 'afspraak regelen',
}

const FRICTION_POOL: Record<DoctorPharmacySubtype, readonly string[]> = {
  doctor_visit: [
    'Vraag kort hoe lang het al speelt.',
    'Vraag of er ook koorts bij is.',
    'Herhaal een tijd verkeerd zodat de oefenaar moet corrigeren.',
  ],
  pharmacy: [
    'Vraag of de oefenaar tabletten of liever siroop wil.',
    'Vraag of de oefenaar allergisch is voor ibuprofen (één vraag).',
    'Leg een dosering uit die de oefenaar moet bevestigen.',
  ],
  clinic_reception: [
    'Vraag om de reden van het bezoek in één korte zin.',
    'Noem een tijd die de oefenaar moet bevestigen.',
    'Vraag of de oefenaar een verwijsbrief heeft (ja/nee).',
  ],
}

function clampRoll(rng: () => number): number {
  const n = Number(rng())
  if (!Number.isFinite(n)) return Math.random()
  if (n <= 0) return 0
  if (n >= 1) return 0.999_999
  return n
}

function pickOne<T>(items: readonly T[], rng: () => number): T {
  return items[Math.floor(clampRoll(rng) * items.length)] ?? items[0]!
}

export function normalizeDoctorPharmacySubtype(raw: string | undefined): DoctorPharmacySubtype | undefined {
  const v = (raw ?? '').trim().toLowerCase().replace(/-/g, '_')
  if (v === 'doctor' || v === 'doctor_visit' || v === 'huisarts' || v === 'gp') return 'doctor_visit'
  if (v === 'pharmacy' || v === 'apotheek' || v === 'chemist') return 'pharmacy'
  if (v === 'clinic' || v === 'clinic_reception' || v === 'reception' || v === 'balie') return 'clinic_reception'
  return (DOCTOR_PHARMACY_SUBTYPES as readonly string[]).includes(v) ? (v as DoctorPharmacySubtype) : undefined
}

export function normalizeDoctorPharmacyVariation(raw: string | undefined): DoctorPharmacyVariation | undefined {
  const v = (raw ?? '').trim().toLowerCase().replace(/-/g, '_')
  if (v === 'symptom' || v === 'symptoms') return 'symptoms'
  if (v === 'help' || v === 'asking' || v === 'asking_for_help') return 'asking_for_help'
  if (v === 'instructions' || v === 'understanding' || v === 'understanding_instructions') return 'understanding_instructions'
  return (DOCTOR_PHARMACY_VARIATIONS as readonly string[]).includes(v) ? (v as DoctorPharmacyVariation) : undefined
}

export function normalizeDoctorPharmacyHealthFocus(raw: string | undefined): DoctorPharmacyHealthFocus | undefined {
  const v = (raw ?? '').trim().toLowerCase().replace(/-/g, '_')
  const map: Record<string, DoctorPharmacyHealthFocus> = {
    headache: 'headache',
    hoofdpijn: 'headache',
    cough: 'cough',
    hoest: 'cough',
    sore_throat: 'sore_throat',
    keelpijn: 'sore_throat',
    fever: 'fever',
    koorts: 'fever',
    stomach_ache: 'stomach_ache',
    buikpijn: 'stomach_ache',
    dizziness: 'dizziness',
    duizelig: 'dizziness',
    allergies: 'allergies',
    allergy: 'allergies',
    tiredness: 'tiredness',
    moe: 'tiredness',
    medicine_instructions: 'medicine_instructions',
    medicine: 'medicine_instructions',
    appointment_request: 'appointment_request',
    appointment: 'appointment_request',
    afspraak: 'appointment_request',
  }
  const x = map[v]
  if (x) return x
  return (DOCTOR_PHARMACY_HEALTH_FOCUS_IDS as readonly string[]).includes(v) ? (v as DoctorPharmacyHealthFocus) : undefined
}

function rollHealthFocus(rng: () => number): DoctorPharmacyHealthFocus {
  return pickOne([...DOCTOR_PHARMACY_HEALTH_FOCUS_IDS], rng)
}

function symptomLineForFocus(focus: DoctorPharmacyHealthFocus, level: DoctorPharmacyLevel): string {
  const base = HEALTH_FOCUS_NL[focus]
  if (level === 'A1') return `Ik heb ${base}.`
  if (level === 'B1' && focus === 'cough') return 'Ik hoest al enkele dagen en het wordt niet echt beter.'
  if (level === 'B1' && focus === 'headache') return 'Ik heb aanhoudende hoofdpijn, ook na rusten en water drinken.'
  if (focus === 'medicine_instructions') return 'Ik wil begrijpen hoe ik dit medicijn moet gebruiken.'
  if (focus === 'appointment_request') return 'Ik wil graag een afspraak maken.'
  return `Ik heb last van ${base}.`
}

function collectOpeningVariants(subType: DoctorPharmacySubtype): string[] {
  if (subType === 'doctor_visit') {
    return [
      'Goedemiddag — waarmee kan ik u helpen?',
      'Goedemiddag — wat kan ik voor u doen?',
      'Hallo — hoe kan ik u van dienst zijn?',
      'Dag — waarmee kan ik u helpen?',
    ]
  }
  if (subType === 'pharmacy') {
    return [
      'Goedendag — waarmee kan ik u helpen?',
      'Goedemiddag — wat kan ik voor u doen?',
      'Hallo — hoe kan ik u helpen?',
      'Dag — waarmee kan ik u van dienst zijn?',
    ]
  }
  return [
    'Hallo — welkom bij de balie. Waarmee kan ik u helpen?',
    'Goedemiddag — hoe kan ik u van dienst zijn?',
    'Dag — reception, waarmee kan ik u helpen?',
    'Hallo — goedemiddag. Waar kan ik u mee helpen?',
  ]
}

function buildOpeningLine(subType: DoctorPharmacySubtype, level: DoctorPharmacyLevel, rng: () => number): string {
  const variants = collectOpeningVariants(subType)
  if (level === 'A1') {
    const a1 = variants.slice(0, 3)
    return pickOne(a1.length ? a1 : variants, rng)
  }
  return pickOne(variants, rng)
}

function coreSkillsFor(variation: DoctorPharmacyVariation): string[] {
  if (variation === 'symptoms') {
    return ['symptom_statement', 'body_vocab', 'duration_expression', 'help_seeking_tone']
  }
  if (variation === 'asking_for_help') {
    return ['help_request', 'medicine_or_appointment', 'symptom_context', 'acknowledgment']
  }
  return ['instruction_confirmation', 'time_quantity_language', 'clarification_request', 'natural_response']
}

function buildLearnerSituationSummary(params: {
  subType: DoctorPharmacySubtype
  variation: DoctorPharmacyVariation
  symptomLineNl: string
  helpContextNl: string
}): string {
  const place = SUBTYPE_LABEL_NL[params.subType]
  const task =
    params.variation === 'symptoms'
      ? 'Je beschrijft kort wat er mis is met je gezondheid (taaloefening).'
      : params.variation === 'asking_for_help'
        ? 'Je vraagt duidelijk om hulp: medicijn, afspraak of advies (taaloefening).'
        : 'Je bevestigt of vraagt door over een eenvoudige instructie (taaloefening).'
  return `${task} Setting: ${place}. Jouw situatie in deze run: ${params.symptomLineNl} — ${params.helpContextNl}.`
    .replace(/\s+/g, ' ')
    .trim()
}

export function hydrateDoctorPharmacyLearnerSituationSummary(runtime: ScenarioRuntimeConfig): ScenarioRuntimeConfig {
  const normalizedId = runtime.id?.trim().toLowerCase().replace(/-/g, '_')
  if (normalizedId !== DOCTOR_PHARMACY_SCENARIO_ID) return runtime
  if (runtime.learnerSituationSummary?.trim()) return runtime
  const subType = normalizeDoctorPharmacySubtype(runtime.subType) ?? 'doctor_visit'
  const variation = normalizeDoctorPharmacyVariation(runtime.variation) ?? 'symptoms'
  const firstLine = (runtime.context.split('\n')[0] ?? '').trim()
  const m = /^Details voor deze run:\s*(.+)$/i.exec(firstLine)
  const tail = m?.[1]?.trim() ?? 'korte gezondheidstaal'
  return {
    ...runtime,
    learnerSituationSummary: buildLearnerSituationSummary({
      subType,
      variation,
      symptomLineNl: tail.split(';')[0]?.trim() ?? tail,
      helpContextNl: tail.split(';')[1]?.trim() ?? 'praktische hulp',
    }),
  }
}

export function buildDoctorPharmacyScenario(config: BuildParams): ScenarioRuntimeConfig {
  const rng = config.random ?? Math.random
  const subType = normalizeDoctorPharmacySubtype(config.subType) ?? pickOne(DOCTOR_PHARMACY_SUBTYPES, rng)
  const variation =
    normalizeDoctorPharmacyVariation(config.variation as string | undefined) ?? pickOne(DOCTOR_PHARMACY_VARIATIONS, rng)
  const healthFocus =
    normalizeDoctorPharmacyHealthFocus(config.healthFocus as string | undefined) ?? rollHealthFocus(rng)
  const frictionEnabled = clampRoll(rng) < (config.level === 'A1' ? 0.14 : config.level === 'B1' ? 0.22 : 0.18)
  const symptomLineNl = symptomLineForFocus(healthFocus, config.level)
  const helpContextNl = pickOne(DOCTOR_PHARMACY_HELP_CONTEXT_SNIPPETS_NL, rng)
  const frictionLine = frictionEnabled ? pickOne(FRICTION_POOL[subType], rng) : 'geen extra wrijving in deze run'
  const goals = buildDoctorPharmacyRuntimeGoals(variation)
  const weights = Object.fromEntries(goals.map((g) => [g.id, g.weight]))
  const persona = PERSONA_BY_SUBTYPE[subType]
  const openingVariants = collectOpeningVariants(subType)

  return {
    id: DOCTOR_PHARMACY_SCENARIO_ID,
    scenarioFamily: DOCTOR_PHARMACY_SCENARIO_ID,
    title: DOCTOR_PHARMACY_TITLE,
    category: DOCTOR_PHARMACY_CATEGORY,
    level: config.level,
    subType,
    variation,
    context: buildDoctorPharmacyRuntimeContext({
      subType,
      variation,
      level: config.level,
      symptomLineNl,
      helpContextNl,
      frictionEnabled,
      frictionLine,
    }),
    learnerSituationSummary: buildLearnerSituationSummary({ subType, variation, symptomLineNl, helpContextNl }),
    goals,
    weights,
    assistantBehavior: buildDoctorPharmacyAssistantBehavior({
      subType,
      variation,
      level: config.level,
      frictionEnabled,
      openingVariants,
    }),
    difficultyAdjustments: doctorPharmacyDifficultyAdjustments(config.level),
    hints: [...getDoctorPharmacyStarterHintsForRuntime(config.level, variation)],
    persona: {
      role: persona.role,
      displayName: persona.displayName,
      sceneLabel: SUBTYPE_LABEL_NL[subType],
      subType,
      variation,
      healthFocus,
      frictionEnabled: frictionEnabled ? 'light friction enabled for this run' : 'direct helpful run',
    },
    coreSkills: coreSkillsFor(variation),
    openingLine: buildOpeningLine(subType, config.level, rng),
    doctorPharmacyOpeningContractVersion: DOCTOR_PHARMACY_SPEAK_LIVE_OPENING_CONTRACT_VERSION,
    evaluationContract: buildDoctorPharmacyEvaluationContract(variation),
  }
}

export function maybeBuildDoctorPharmacySpeakLiveScenarioRuntime(params: {
  scenario: ScenarioConfig
  level: DoctorPharmacyLevel
  overrides?: ScenarioSelectionOverrides | null
}): ScenarioRuntimeConfig | null {
  if (params.scenario.slug !== DOCTOR_PHARMACY_SCENARIO_ID) return null
  const variation = normalizeDoctorPharmacyVariation(params.overrides?.variation as string | undefined)
  const subType = normalizeDoctorPharmacySubtype(params.overrides?.subType)
  const healthFocus = normalizeDoctorPharmacyHealthFocus(params.overrides?.detailFocus as string | undefined)
  return buildDoctorPharmacyScenario({
    level: params.level,
    subType: subType ?? undefined,
    variation: variation ?? undefined,
    healthFocus: healthFocus ?? undefined,
  })
}

export function parseDoctorPharmacyScenarioRuntimeConfig(raw: unknown): ScenarioRuntimeConfig | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const candidate = raw as Partial<ScenarioRuntimeConfig>
  if (candidate.id !== DOCTOR_PHARMACY_SCENARIO_ID) return null
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
  return hydrateDoctorPharmacyLearnerSituationSummary(candidate as ScenarioRuntimeConfig)
}

export function dutchPersonaForDoctorPharmacyIfNeeded(scenarioSlug: string, persona: PersonaConfig): PersonaConfig {
  if (scenarioSlug !== DOCTOR_PHARMACY_SCENARIO_ID) return persona
  if (persona.slug !== 'health_service_staff') return persona
  return { ...persona, displayName: 'Zorgmedewerker' }
}
