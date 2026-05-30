import type {
  PersonaConfig,
  ScenarioConfig,
  ScenarioRuntimeConfig,
  ScenarioSelectionOverrides,
} from '../../models/contracts'
import { pickOne } from './bookingReservationsVocabularyPools'
import {
  PARTY_SOCIAL_SCENARIO_ID,
  buildPartySocialEvaluationContract,
  buildPartySocialRuntimeGoals,
  type PartySocialLevel,
  type PartySocialSubtype,
  type PartySocialVariation,
} from './partySocialEvaluationContract'

export type { PartySocialLevel, PartySocialSubtype, PartySocialVariation } from './partySocialEvaluationContract'
export { PARTY_SOCIAL_SCENARIO_ID } from './partySocialEvaluationContract'

export const PARTY_SOCIAL_TITLE = 'At a party / social setting' as const
export const PARTY_SOCIAL_CATEGORY = 'Social' as const

export const PARTY_SOCIAL_SUBTYPES = ['house_party', 'networking_event', 'casual_gathering'] as const
export const PARTY_SOCIAL_VARIATIONS = ['keeping_conversation_going', 'asking_questions'] as const

const SETTING_KEYS = ['house_party', 'bar', 'networking_event', 'meetup', 'birthday'] as const
type PsSetting = (typeof SETTING_KEYS)[number]

const PERSON_TYPE_KEYS = ['extrovert', 'introvert', 'neutral_dutch', 'expat'] as const
type PsPersonType = (typeof PERSON_TYPE_KEYS)[number]

const TOPIC_KEYS = ['work', 'weekend', 'travel', 'hobbies', 'why_here'] as const
type PsTopic = (typeof TOPIC_KEYS)[number]

const SETTING_NL: Record<PsSetting, string> = {
  house_party: 'Sfeer: huisfeest — informeel, wat drukker geluid in gedachten.',
  bar: 'Sfeer: bar of café met borrel — korte zinnen, iets sneller tempo.',
  networking_event: 'Sfeer: netwerkborrel — licht professioneel maar nog steeds sociaal.',
  meetup: 'Sfeer: meetup / hobbygroep — open en nieuwsgierig.',
  birthday: 'Sfeer: verjaardag — warm, persoonlijk, maar niet té privé.',
}

const PERSON_NL: Record<PsPersonType, string> = {
  extrovert: 'Gesprekspartner: extravert — iets sneller praten, meer initiatief.',
  introvert: 'Gesprekspartner: introvert — iets kortere antwoorden, rustiger tempo.',
  neutral_dutch: 'Gesprekspartner: neutraal Nederlands — licht ingetogen, niet overdreven.',
  expat: 'Gesprekspartner: expat — herken “nieuw in NL”-vibe subtiel.',
}

const TOPIC_NL: Record<PsTopic, string> = {
  work: 'Mini-topic: werk / studie — kort houden.',
  weekend: 'Mini-topic: weekend — plannen of net gedaan.',
  travel: 'Mini-topic: reizen — licht, geen vakantie-interview.',
  hobbies: 'Mini-topic: hobby’s — snelle haakjes.',
  why_here: 'Mini-topic: waarom je hier bent — host, uitnodiging, toevallig.',
}

const VARIATION_FOCUS: Record<PartySocialVariation, string> = {
  keeping_conversation_going:
    'Variatie A — keeping_conversation_going: doorreacties (“Oh echt?”, “Leuk!”), mini-opmerkingen, “en verder?” — stilte opvangen.',
  asking_questions:
    'Variatie B — asking_questions: natuurlijke feestvragen (“Ken je veel mensen hier?”, “Hoe ken je de host?”) — nieuwsgierig, niet als verhoor.',
}

const SUBTYPE_OPENING: Record<PartySocialSubtype, string[]> = {
  house_party: [
    'Hé — gezellige avond hè? Leuke drukte hier. Ik ben via vrienden van de host gekomen — ken jij de host al lang?',
    'Hoi — ik sta even met een drankje. Ben je al lang hier, of net binnen?',
  ],
  networking_event: [
    'Hoi — leuke mix van mensen. Wat brengt jou hier vanavond?',
    'Hey — ik zag dat je net bij die praatgroep stond. Kom je vaker naar dit soort events?',
  ],
  casual_gathering: [
    'Hoi — rustig feestje. Ken je veel mensen hier of vooral via één iemand?',
    'Hé — ik zat net binnen. Hoe bevalt het hier tot nu toe?',
  ],
}

function clampRoll(rng: () => number): number {
  const n = Number(rng())
  if (!Number.isFinite(n)) return Math.random()
  if (n <= 0) return 0
  if (n >= 1) return 0.999_999
  return n
}

export function normalizePartySocialSubtype(raw: string | undefined): PartySocialSubtype | undefined {
  const v = (raw ?? '').trim().toLowerCase().replace(/-/g, '_')
  if (v === 'house' || v === 'houseparty' || v === 'house_party') return 'house_party'
  if (v === 'network' || v === 'networking' || v === 'networking_event') return 'networking_event'
  if (v === 'casual' || v === 'gathering' || v === 'casual_gathering' || v === 'borrel') return 'casual_gathering'
  return (PARTY_SOCIAL_SUBTYPES as readonly string[]).includes(v) ? (v as PartySocialSubtype) : undefined
}

export function normalizePartySocialVariation(raw: string | undefined): PartySocialVariation | undefined {
  const v = (raw ?? '').trim().toLowerCase().replace(/-/g, '_')
  if (v === 'keeping' || v === 'flow' || v === 'keeping_conversation_going' || v === 'a') return 'keeping_conversation_going'
  if (v === 'asking' || v === 'questions' || v === 'asking_questions' || v === 'b') return 'asking_questions'
  return (PARTY_SOCIAL_VARIATIONS as readonly string[]).includes(v) ? (v as PartySocialVariation) : undefined
}

function levelBlock(level: PartySocialLevel): string {
  if (level === 'A1') {
    return 'Niveau A1: heel korte zinnen; simpele reacties + 1 simpele vraag per burst; 4–7 beurten totaal oké.'
  }
  if (level === 'B1') {
    return 'Niveau B1: vlottere topic-shifts; sterkere reacties; 8–14 beurten; bursts mogen overlappen.'
  }
  return 'Niveau A2: natuurlijke mini-bursts; 1–2 follow-ups per burst; 6–11 beurten.'
}

function buildContext(params: {
  subType: PartySocialSubtype
  variation: PartySocialVariation
  level: PartySocialLevel
  setting: PsSetting
  personType: PsPersonType
  topicSeed: PsTopic
}): string {
  return [
    'SPEAK LIVE — FEEST / SOCIALE SETTING (kort, dynamisch, multi-thread):',
    VARIATION_FOCUS[params.variation],
    SETTING_NL[params.setting],
    PERSON_NL[params.personType],
    TOPIC_NL[params.topicSeed],
    levelBlock(params.level),
    'Je bent geen docent: geen grammaticauitleg. Nederlands naar de oefenaar.',
    'Doel: korte sociale wissels — reageren, vragen, soms onderwerp laten springen.',
    'Eerste assistent-zin: klinkt als echt gesproken NL — geen brokkige calques (“van sport”); liever één duidelijke vraag of hook dan twee harde vragen achter elkaar.',
  ].join(' ')
}

function assistantBehavior(level: PartySocialLevel): ScenarioRuntimeConfig['assistantBehavior'] {
  return {
    pace: level === 'A1' ? 'Rustig feesttempo.' : level === 'B1' ? 'Vlot borreltempo.' : 'Normaal borreltempo.',
    register: 'Informeel — feest of netwerkborrel in Nederland.',
    tone: 'Luchtig, licht NL-ingetoogen; niet overdreven enthousiast; af en toe “oh nice”.',
    responseStyle: [
      'Korte zinnen; af en toe 2 korte zinnen voor warmte',
      'Gemiddeld elke 1–2 assistent-beurten een vraag of uitnodiging om door te praten',
      'Na ~2–3 beurten op hetzelfde haakje: lichte topic-shift mag',
      'Mem: laatste mini-topic kort terug laten komen (“Dus …”) vóór je doorschuift',
      'Soms topic-shift of half antwoord voor realisme',
    ],
    frictionStyle: ['Korte antwoorden', 'Mini-pauze', 'Kleine sprong in onderwerp'],
    openingVariants: [],
    recommendationStyle: 'Geen les; max één zachte alternatieve zin als het past.',
    frictionChance: level === 'B1' ? 'medium' : 'light',
    guardrails: ['Geen docent', 'Geen privé-medische details', 'PG en respectvol'],
  }
}

function difficulty(level: PartySocialLevel): ScenarioRuntimeConfig['difficultyAdjustments'] {
  if (level === 'A1') {
    return {
      learnerLevel: 'A1',
      responsePacing: 'slow_social',
      vocabularyRange: 'minimal',
      followUpStyle: 'single_simple_followup',
      misunderstandingLevel: 'single_light',
    }
  }
  if (level === 'B1') {
    return {
      learnerLevel: 'B1',
      responsePacing: 'natural_social',
      vocabularyRange: 'wider',
      followUpStyle: 'varied_followups',
      misunderstandingLevel: 'light_realism',
    }
  }
  return {
    learnerLevel: 'A2',
    responsePacing: 'normal_social',
    vocabularyRange: 'simple_variation',
    followUpStyle: 'brief_checks',
    misunderstandingLevel: 'one_possible',
  }
}

function starterHints(level: PartySocialLevel, variation: PartySocialVariation): string[] {
  const react = ['Oh echt?', 'Leuk!', 'Nice!', 'Ah cool.', 'En verder?', 'Dat klinkt goed!']
  const ask = [
    'Wat doe jij hier vanavond?',
    'Ken je veel mensen hier?',
    'Hoe ken je de host?',
    'Kom je hier vaker?',
    'Waar werk je ongeveer?',
  ]
  const base = variation === 'asking_questions' ? [...ask, ...react.slice(0, 3)] : [...react, ...ask.slice(0, 3)]
  if (level === 'A1') return base.slice(0, 5)
  if (level === 'B1') return [...base, 'Eigenlijk… wat zijn je plannen voor het weekend?']
  return base
}

export function buildPartySocialScenario(config: {
  level: PartySocialLevel
  subType?: PartySocialSubtype
  variation?: PartySocialVariation
  random?: () => number
}): ScenarioRuntimeConfig {
  const rng = config.random ?? Math.random
  const subType = config.subType ?? pickOne([...PARTY_SOCIAL_SUBTYPES], rng)
  const variation = config.variation ?? pickOne([...PARTY_SOCIAL_VARIATIONS], rng)
  const setting = pickOne([...SETTING_KEYS], rng)
  const personType = pickOne([...PERSON_TYPE_KEYS], rng)
  const topicSeed = pickOne([...TOPIC_KEYS], rng)
  const goals = buildPartySocialRuntimeGoals()
  const openingPool = SUBTYPE_OPENING[subType]
  const openingLine = openingPool[Math.floor(clampRoll(rng) * openingPool.length)]!

  return {
    id: PARTY_SOCIAL_SCENARIO_ID,
    scenarioFamily: PARTY_SOCIAL_SCENARIO_ID,
    title: PARTY_SOCIAL_TITLE,
    category: PARTY_SOCIAL_CATEGORY,
    level: config.level,
    subType,
    variation,
    context: buildContext({ subType, variation, level: config.level, setting, personType, topicSeed }),
    learnerSituationSummary: `Feest of sociale setting — ${SETTING_NL[setting].replace(/^Sfeer:\s*/, '')}`.replace(/\s+/g, ' ').trim(),
    goals,
    weights: Object.fromEntries(goals.map((g) => [g.id, g.weight])),
    assistantBehavior: assistantBehavior(config.level),
    difficultyAdjustments: difficulty(config.level),
    hints: starterHints(config.level, variation),
    persona: {
      role: 'Feestganger',
      displayName: 'Iemand op het feest',
      sceneLabel: 'party_social',
      subType,
      variation,
      setting,
      personType,
      topicSeed,
    },
    coreSkills: ['Continuïteit', 'Vragen', 'Reactie', 'Energie', 'Topic-shift'],
    openingLine,
    evaluationContract: buildPartySocialEvaluationContract({ level: config.level, subType, variation }),
  }
}

export function maybeBuildPartySocialSpeakLiveScenarioRuntime(params: {
  scenario: ScenarioConfig
  level: PartySocialLevel
  overrides?: ScenarioSelectionOverrides | null
}): ScenarioRuntimeConfig | null {
  if (params.scenario.slug !== PARTY_SOCIAL_SCENARIO_ID) return null
  const subType = normalizePartySocialSubtype(params.overrides?.subType as string | undefined)
  const variation = normalizePartySocialVariation(params.overrides?.variation as string | undefined)
  return buildPartySocialScenario({
    level: params.level,
    subType: subType ?? undefined,
    variation: variation ?? undefined,
  })
}

export function parsePartySocialScenarioRuntimeConfig(raw: unknown): ScenarioRuntimeConfig | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const candidate = raw as Partial<ScenarioRuntimeConfig>
  if (candidate.id !== PARTY_SOCIAL_SCENARIO_ID) return null
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

export function hydratePartySocialLearnerSituationSummary(runtime: ScenarioRuntimeConfig): ScenarioRuntimeConfig {
  if (runtime.id?.trim().toLowerCase().replace(/-/g, '_') !== PARTY_SOCIAL_SCENARIO_ID) return runtime
  if (runtime.learnerSituationSummary?.trim()) return runtime
  return {
    ...runtime,
    learnerSituationSummary:
      'Je oefent korte, levendige feest- of borrelgesprekken in het Nederlands — reageren, vragen, en soms van onderwerp wisselen.',
  }
}

export function dutchPersonaForPartySocialIfNeeded(
  scenarioSlug: string,
  runtime: ScenarioRuntimeConfig | null | undefined,
  persona: PersonaConfig,
): PersonaConfig {
  const slug = scenarioSlug.trim().toLowerCase().replace(/-/g, '_')
  if (slug !== PARTY_SOCIAL_SCENARIO_ID) return persona
  if (persona.slug !== 'party_social_partner') return persona
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
