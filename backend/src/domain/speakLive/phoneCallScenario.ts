import type { PersonaConfig, ScenarioConfig, ScenarioRuntimeConfig, ScenarioSelectionOverrides } from '../../models/contracts'
import { pickOne } from './bookingReservationsVocabularyPools'
import {
  PHONE_CALL_SCENARIO_ID,
  buildPhoneCallEvaluationContract,
  buildPhoneCallRuntimeGoals,
  type PhoneCallLevel,
  type PhoneCallSubtype,
  type PhoneCallVariation,
} from './phoneCallEvaluationContract'

export type { PhoneCallLevel, PhoneCallSubtype, PhoneCallVariation } from './phoneCallEvaluationContract'
export { PHONE_CALL_SCENARIO_ID } from './phoneCallEvaluationContract'

export const PHONE_CALL_TITLE = 'Phone call' as const
export const PHONE_CALL_CATEGORY = 'Advanced' as const

export const PHONE_CALL_SUBTYPES = ['appointment_call', 'service_call', 'information_call'] as const
export const PHONE_CALL_VARIATIONS = ['starting_call', 'handling_call', 'repair_misunderstanding'] as const

export type PhoneCallCallTopic = 'opening_hours' | 'appointment_slot' | 'issue_report' | 'availability_question'

const SUBTYPE_PERSONA: Record<
  PhoneCallSubtype,
  { role: string; displayName: string; openingLine: string; sceneLabel: string }
> = {
  appointment_call: {
    role: 'Balie / planning',
    displayName: 'Planning',
    openingLine: 'Goedemiddag, u spreekt met de planning — waarmee kan ik u helpen?',
    sceneLabel: 'afspraak of reservering per telefoon',
  },
  service_call: {
    role: 'Klantenservice',
    displayName: 'Service',
    openingLine: 'Hallo, klantenservice — goedemiddag. Waar belt u over?',
    sceneLabel: 'service of melding per telefoon',
  },
  information_call: {
    role: 'Receptie / algemeen nummer',
    displayName: 'Receptie',
    openingLine: 'Goedemiddag, receptie — hoe kan ik u helpen?',
    sceneLabel: 'informatie opvragen per telefoon',
  },
}

const TOPIC_LINE_NL: Record<PhoneCallCallTopic, string> = {
  opening_hours: 'Je vraagt naar openingstijden of wanneer iets open is.',
  appointment_slot: 'Je wilt een tijd of datum afstemmen voor een afspraak of reservering.',
  issue_report: 'Je meldt kort een probleem of storing en vraagt wat de volgende stap is.',
  availability_question: 'Je vraagt of iets beschikbaar is (plek, product, afspraakmogelijkheid).',
}

function clampRoll(rng: () => number): number {
  const n = Number(rng())
  if (!Number.isFinite(n)) return Math.random()
  if (n <= 0) return 0
  if (n >= 1) return 0.999_999
  return n
}

export function normalizePhoneCallSubtype(raw: string | undefined): PhoneCallSubtype | undefined {
  const v = (raw ?? '').trim().toLowerCase().replace(/-/g, '_')
  if (v === 'appointment' || v === 'booking' || v === 'afspraak') return 'appointment_call'
  if (v === 'service' || v === 'klacht' || v === 'support') return 'service_call'
  if (v === 'info' || v === 'information' || v === 'informatie') return 'information_call'
  return (PHONE_CALL_SUBTYPES as readonly string[]).includes(v) ? (v as PhoneCallSubtype) : undefined
}

export function normalizePhoneCallVariation(raw: string | undefined): PhoneCallVariation | undefined {
  const v = (raw ?? '').trim().toLowerCase().replace(/-/g, '_')
  if (v === 'start' || v === 'opening' || v === 'starting_call') return 'starting_call'
  if (v === 'handle' || v === 'middle' || v === 'handling_call') return 'handling_call'
  if (v === 'repair' || v === 'misunderstanding' || v === 'repair_misunderstanding') return 'repair_misunderstanding'
  return (PHONE_CALL_VARIATIONS as readonly string[]).includes(v) ? (v as PhoneCallVariation) : undefined
}

export function normalizePhoneCallTopic(raw: string | undefined): PhoneCallCallTopic | undefined {
  const v = (raw ?? '').trim().toLowerCase().replace(/-/g, '_')
  if (v === 'hours' || v === 'opening' || v === 'opening_hours' || v === 'open') return 'opening_hours'
  if (v === 'slot' || v === 'time' || v === 'appointment_slot' || v === 'datum') return 'appointment_slot'
  if (v === 'issue' || v === 'problem' || v === 'issue_report' || v === 'storing') return 'issue_report'
  if (v === 'availability' || v === 'beschikbaar' || v === 'availability_question') return 'availability_question'
  return undefined
}

function rollTopic(subType: PhoneCallSubtype, requested: PhoneCallCallTopic | undefined, rng: () => number): PhoneCallCallTopic {
  if (requested) return requested
  if (subType === 'appointment_call') {
    return clampRoll(rng) < 0.55 ? 'appointment_slot' : 'availability_question'
  }
  if (subType === 'service_call') {
    return clampRoll(rng) < 0.6 ? 'issue_report' : 'availability_question'
  }
  return clampRoll(rng) < 0.5 ? 'opening_hours' : 'availability_question'
}

function buildContext(params: {
  subType: PhoneCallSubtype
  variation: PhoneCallVariation
  level: PhoneCallLevel
  topic: PhoneCallCallTopic
  topicLine: string
}): string {
  const persona = SUBTYPE_PERSONA[params.subType]
  const levelLine =
    params.level === 'A1'
      ? 'Niveau A1: assistent spreekt langzaam, heel korte zinnen, weinig woordvariatie; maximaal één lichte misverstand-stap.'
      : params.level === 'B1'
        ? 'Niveau B1: natuurlijker telefoontempo; minstens één moment waar de oefenaar moet herstellen of bevestigen; iets meer woordvariatie.'
        : 'Niveau A2: normaal telefoontempo; één misverstand of snelle zin is genoeg; blijf vriendelijk en duidelijk.'

  const variationLine =
    params.variation === 'starting_call'
      ? 'Variatie A — starting_call: de oefenaar moet zelf de lijn openen (na jouw korte begroeting) met naam + doel.'
      : params.variation === 'handling_call'
        ? 'Variatie B — handling_call: jij stelt gerichte vragen; de oefenaar geeft korte antwoorden op details.'
        : 'Variatie C — repair_misunderstanding: plan extra ruimte voor “sorry, wat zei u?” / bevestigen / langzamer — maar blijf realistisch en niet frustrerend.'

  return [
    'SPEAK LIVE — TELEFOONLIJN (geen beeld, alleen stem):',
    `Subtype: ${persona.sceneLabel}.`,
    params.topicLine,
    variationLine,
    levelLine,
    'Wrijving (licht, maximaal één tegelijk): (1) spreek één zin iets te snel of laat een detail even dubbel klinken; (2) vraag één keer expliciet om bevestiging (“Even checken: morgenochtend tien uur?”).',
    'Als de oefenaar hersteltaal gebruikt, reageer direct natuurlijk en herhaal het dan helder in normaal tempo.',
    'Geen Engels. Geen les uitleggen. Blijf in rol.',
  ].join(' ')
}

function buildAssistantBehavior(params: { level: PhoneCallLevel; subType: PhoneCallSubtype }): ScenarioRuntimeConfig['assistantBehavior'] {
  const pace =
    params.level === 'A1'
      ? 'Iets sneller dan een rustige balie, maar nog steeds duidelijk A1 — korte zinnen.'
      : params.level === 'B1'
        ? 'Telefoonritme: vlot en compact; soms iets “aan de lijn” praten (niet perfect glad).'
        : 'Telefoonritme: iets vlotter dan chat; korte bundels van 1–2 zinnen.'

  return {
    pace,
    register: 'Telefonisch Nederlands — neutraal-professioneel; geen lange monologen.',
    tone: 'Geholpen maar businesslike; soms lichte onduidelijkheid die uitnodigt tot repair.',
    responseStyle: ['Eén vraag per beurt waar mogelijk', 'Korte bevestigingschecks', 'Natuurlijke overlap-toon is oké (licht)'],
    frictionStyle: [
      'Eén snelle of licht onduidelijke zin per sessie',
      'Eén expliciete bevestigingsvraag',
      'Accepteer repair (“kunt u herhalen?”) zonder af te remmen',
    ],
    openingVariants: [SUBTYPE_PERSONA[params.subType].openingLine],
    recommendationStyle: 'Geen aanbevelingen buiten de call; alleen wat past bij subtype.',
    frictionChance: params.level === 'B1' ? 'medium' : 'light',
    guardrails: [
      'Nooit meer dan één misverstand tegelijk',
      'Niet sarcastisch of afwijzend op repair',
      'Geen persoonlijke data vragen die echt zijn (taaloefening)',
    ],
  }
}

function difficulty(level: PhoneCallLevel): ScenarioRuntimeConfig['difficultyAdjustments'] {
  if (level === 'A1') {
    return {
      learnerLevel: 'A1',
      responsePacing: 'slow_clear',
      vocabularyRange: 'minimal',
      followUpStyle: 'single_simple_followup',
      misunderstandingLevel: 'single_light',
    }
  }
  if (level === 'B1') {
    return {
      learnerLevel: 'B1',
      responsePacing: 'natural_phone',
      vocabularyRange: 'wider',
      followUpStyle: 'varied_followups',
      misunderstandingLevel: 'requires_repair_language',
    }
  }
  return {
    learnerLevel: 'A2',
    responsePacing: 'normal_phone',
    vocabularyRange: 'simple_variation',
    followUpStyle: 'brief_checks',
    misunderstandingLevel: 'one_possible',
  }
}

function starterHints(level: PhoneCallLevel, variation: PhoneCallVariation): string[] {
  const base = [
    'Goedemiddag, met [naam].',
    'Ik bel over een afspraak.',
    'Ik heb een vraag over de openingstijden.',
    'Ik wil graag weten of er nog plek is.',
    'Sorry, kunt u dat herhalen?',
    'Bedoelt u morgen of vandaag?',
    'Kunt u iets langzamer praten?',
    'Dus het is om tien uur — klopt dat?',
  ]
  if (level === 'A1') return base.slice(0, 5)
  if (variation === 'repair_misunderstanding') return [...base.slice(4), 'Ik begrijp het niet helemaal.', 'Zegt u …?']
  return base
}

export function buildPhoneCallScenario(config: {
  level: PhoneCallLevel
  subType?: PhoneCallSubtype
  variation?: PhoneCallVariation
  callTopic?: PhoneCallCallTopic
  random?: () => number
}): ScenarioRuntimeConfig {
  const rng = config.random ?? Math.random
  const subType = config.subType ?? pickOne(PHONE_CALL_SUBTYPES, rng)
  const variation = config.variation ?? pickOne(PHONE_CALL_VARIATIONS, rng)
  const topic = rollTopic(subType, config.callTopic, rng)
  const topicLine = TOPIC_LINE_NL[topic]
  const persona = SUBTYPE_PERSONA[subType]
  const goals = buildPhoneCallRuntimeGoals()

  return {
    id: PHONE_CALL_SCENARIO_ID,
    scenarioFamily: PHONE_CALL_SCENARIO_ID,
    title: PHONE_CALL_TITLE,
    category: PHONE_CALL_CATEGORY,
    level: config.level,
    subType,
    variation,
    context: buildContext({ subType, variation, level: config.level, topic, topicLine }),
    learnerSituationSummary: `Telefoon in het Nederlands — ${persona.sceneLabel}. ${topicLine}`.replace(/\s+/g, ' ').trim(),
    goals,
    weights: Object.fromEntries(goals.map((g) => [g.id, g.weight])),
    assistantBehavior: buildAssistantBehavior({ level: config.level, subType }),
    difficultyAdjustments: difficulty(config.level),
    hints: starterHints(config.level, variation),
    persona: {
      role: persona.role,
      displayName: persona.displayName,
      sceneLabel: persona.sceneLabel,
      subType,
      variation,
      callTopic: topic,
      callTopicLine: topicLine,
    },
    coreSkills: ['Luisteren zonder visuele steun', 'Repair & bevestigen', 'Korte duidelijke antwoorden', 'Telefoonritme'],
    openingLine: persona.openingLine,
    evaluationContract: buildPhoneCallEvaluationContract({ level: config.level, subType, variation }),
  }
}

export function maybeBuildPhoneCallSpeakLiveScenarioRuntime(params: {
  scenario: ScenarioConfig
  level: PhoneCallLevel
  overrides?: ScenarioSelectionOverrides | null
}): ScenarioRuntimeConfig | null {
  if (params.scenario.slug !== PHONE_CALL_SCENARIO_ID) return null
  const subType = normalizePhoneCallSubtype(params.overrides?.subType as string | undefined)
  const variation = normalizePhoneCallVariation(params.overrides?.variation as string | undefined)
  const callTopic = normalizePhoneCallTopic(params.overrides?.detailFocus as string | undefined)
  return buildPhoneCallScenario({
    level: params.level,
    subType: subType ?? undefined,
    variation: variation ?? undefined,
    callTopic: callTopic ?? undefined,
  })
}

export function parsePhoneCallScenarioRuntimeConfig(raw: unknown): ScenarioRuntimeConfig | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const candidate = raw as Partial<ScenarioRuntimeConfig>
  if (candidate.id !== PHONE_CALL_SCENARIO_ID) return null
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
  return candidate as ScenarioRuntimeConfig
}

export function hydratePhoneCallLearnerSituationSummary(runtime: ScenarioRuntimeConfig): ScenarioRuntimeConfig {
  const normalizedId = runtime.id?.trim().toLowerCase().replace(/-/g, '_')
  if (normalizedId !== PHONE_CALL_SCENARIO_ID) return runtime
  if (runtime.learnerSituationSummary?.trim()) return runtime
  const line =
    typeof runtime.persona === 'object' && runtime.persona && typeof (runtime.persona as { callTopicLine?: string }).callTopicLine === 'string'
      ? (runtime.persona as { callTopicLine: string }).callTopicLine.trim()
      : ''
  return {
    ...runtime,
    learnerSituationSummary: (
      line ||
      'Je belt in het Nederlands — er is geen beeld, alleen stem. Zeg kort wie je bent en wat je nodig hebt; gebruik repair-taal als iets onduidelijk is.'
    ).replace(/\s+/g, ' '),
  }
}

export function dutchPersonaForPhoneCallIfNeeded(
  scenarioSlug: string,
  runtime: ScenarioRuntimeConfig | null | undefined,
  persona: PersonaConfig
): PersonaConfig {
  const slug = scenarioSlug.trim().toLowerCase().replace(/-/g, '_')
  if (slug !== PHONE_CALL_SCENARIO_ID) return persona
  if (persona.slug !== 'phone_line_staff') return persona
  const rp = runtime?.persona
  const display =
    rp && typeof rp === 'object' && typeof (rp as { displayName?: string }).displayName === 'string'
      ? (rp as { displayName: string }).displayName.trim() || persona.displayName
      : persona.displayName
  const role =
    rp && typeof rp === 'object' && typeof (rp as { role?: string }).role === 'string'
      ? (rp as { role: string }).role.trim() || persona.role
      : persona.role
  return { ...persona, displayName: display, role }
}
