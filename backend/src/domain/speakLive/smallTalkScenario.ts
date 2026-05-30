import type {
  PersonaConfig,
  ScenarioConfig,
  ScenarioRuntimeConfig,
  ScenarioSelectionOverrides,
} from '../../models/contracts'
import { pickOne } from './bookingReservationsVocabularyPools'
import {
  SMALL_TALK_SCENARIO_ID,
  buildSmallTalkEvaluationContract,
  buildSmallTalkRuntimeGoals,
  type SmallTalkLevel,
  type SmallTalkSubtype,
  type SmallTalkVariation,
} from './smallTalkEvaluationContract'

export type { SmallTalkLevel, SmallTalkSubtype, SmallTalkVariation } from './smallTalkEvaluationContract'
export { SMALL_TALK_SCENARIO_ID } from './smallTalkEvaluationContract'

export const SMALL_TALK_TITLE = 'Small talk' as const
export const SMALL_TALK_CATEGORY = 'Social' as const

export const SMALL_TALK_SUBTYPES = ['meeting_someone', 'casual_chat', 'social_checkin'] as const
export const SMALL_TALK_VARIATIONS = [
  'meeting_someone',
  'talking_about_weekend',
  'talking_about_weather',
] as const

const SETTING_KEYS = ['office', 'cafe', 'gym', 'walking_outside', 'meeting_new'] as const
type SmallTalkSetting = (typeof SETTING_KEYS)[number]

const PERSONALITY_KEYS = ['friendly', 'neutral', 'slightly_reserved'] as const
type SmallTalkPersonality = (typeof PERSONALITY_KEYS)[number]

const PATH_KEYS = ['stay_on_topic', 'slight_topic_shift', 'ask_user_questions'] as const
type SmallTalkPath = (typeof PATH_KEYS)[number]

const SETTING_NL: Record<SmallTalkSetting, string> = {
  office: 'Sfeer: even op kantoor bij de koffieautomaat of gang — informeel.',
  cafe: 'Sfeer: rustig café — achtergrondgeluiden verzin je niet; blijf kort.',
  gym: 'Sfeer: sportschool of entree — kort en praktisch, geen coach-jargon.',
  walking_outside: 'Sfeer: buiten onderweg — licht commentaar op omgeving mag, blijf natuurlijk.',
  meeting_new: 'Sfeer: iemand nieuw ontmoeten — voorstellen en eerste kennismaking.',
}

const PERSONALITY_NL: Record<SmallTalkPersonality, string> = {
  friendly: 'Jouw toon: warm en open, maar niet overdreven enthousiast (Nederlands-realistisch).',
  neutral: 'Jouw toon: relaxed en neutraal — gezellig maar zakelijk licht.',
  slightly_reserved: 'Jouw toon: iets ingetogen (typisch NL) — nog steeds vriendelijk, iets kortere zinnen.',
}

const PATH_NL: Record<SmallTalkPath, string> = {
  stay_on_topic: 'Gesprekspad: blijf dicht bij het startonderwerp; maximaal één lichte zijstap.',
  slight_topic_shift: 'Gesprekspad: mag een kleine topic-shift (bijv. weekend → weer), max één keer per 2 beurten.',
  ask_user_questions: 'Gesprekspad: stel regelmatig een korte vraag terug; niet als interviewer, wel nieuwsgierig.',
}

const SUBTYPE_OPENING: Record<SmallTalkSubtype, string[]> = {
  meeting_someone: [
    'Hoi — ik geloof dat we elkaar nog niet kennen. Hoe is je dag tot nu toe?',
    'Hé — dag. Ik ben hier even in de buurt. Kom je hier vaker?',
  ],
  casual_chat: [
    'Hoi — fijn even kletsen. Hoe gaat het bij jou de laatste tijd?',
    'Dag — rustig hè? Hoe was je start van de week?',
  ],
  social_checkin: [
    'Hoi — even checken hoe het met je gaat. Alles een beetje oké?',
    'Hey — ik wilde even horen hoe het loopt. Hoe voel je je vandaag?',
  ],
}

const VARIATION_FOCUS: Record<SmallTalkVariation, string> = {
  meeting_someone:
    'Variatie A — meeting_someone: korte voorstelling + simpele vragen (waar vandaan, werk/hobby licht). Geen sollicitatie-interview.',
  talking_about_weekend:
    'Variatie B — talking_about_weekend: weekend plannen of terugblik; natuurlijke reacties (“oh leuk”, “serieus?”) en 1–2 vervolgvragen.',
  talking_about_weather:
    'Variatie C — talking_about_weather: weer als opener; daarna zacht doorpraten naar iets menselijks (weekend, plannen) — cliché mag, maar blijf kort.',
}

function clampRoll(rng: () => number): number {
  const n = Number(rng())
  if (!Number.isFinite(n)) return Math.random()
  if (n <= 0) return 0
  if (n >= 1) return 0.999_999
  return n
}

export function normalizeSmallTalkSubtype(raw: string | undefined): SmallTalkSubtype | undefined {
  const v = (raw ?? '').trim().toLowerCase().replace(/-/g, '_')
  if (v === 'meeting' || v === 'meet' || v === 'new_person') return 'meeting_someone'
  if (v === 'casual' || v === 'chat' || v === 'klets') return 'casual_chat'
  if (v === 'social' || v === 'checkin' || v === 'check_in' || v === 'social_checkin') return 'social_checkin'
  return (SMALL_TALK_SUBTYPES as readonly string[]).includes(v) ? (v as SmallTalkSubtype) : undefined
}

export function normalizeSmallTalkVariation(raw: string | undefined): SmallTalkVariation | undefined {
  const v = (raw ?? '').trim().toLowerCase().replace(/-/g, '_')
  if (v === 'weekend' || v === 'talking_about_weekend') return 'talking_about_weekend'
  if (v === 'weather' || v === 'weer' || v === 'talking_about_weather') return 'talking_about_weather'
  if (v === 'meeting' || v === 'meeting_someone') return 'meeting_someone'
  return (SMALL_TALK_VARIATIONS as readonly string[]).includes(v) ? (v as SmallTalkVariation) : undefined
}

function levelBlock(level: SmallTalkLevel): string {
  if (level === 'A1') {
    return (
      'Niveau A1: heel korte zinnen, veel herhaling oké, maximaal één vraag per beurt, ' +
      '6–8 wisselingen totaal in gedachten — niet haasten.'
    )
  }
  if (level === 'B1') {
    return (
      'Niveau B1: vlottere small talk, iets meer variatie en lichte topic-shifts toegestaan, ' +
      '8–10 wisselingen oké — blijf menselijk, niet als podcast.'
    )
  }
  return (
    'Niveau A2: natuurlijke korte conversatie, 1–2 vervolgvragen per thema, ' +
    'ongeveer 7–9 wisselingen — geen lange monologen.'
  )
}

function frictionLine(level: SmallTalkLevel): string {
  if (level === 'A1') {
    return 'Lichte wrijving (max één tegelijk): iets kort antwoorden OF een mini-misverstand dat je samen lacht wegwerkt.'
  }
  return (
    'Lichte wrijving (max één tegelijk): iets korte reactie, lichte “awkward pause”, ' +
    'of een klein misverstand — daarna gewoon door.'
  )
}

function buildContext(params: {
  subType: SmallTalkSubtype
  variation: SmallTalkVariation
  level: SmallTalkLevel
  setting: SmallTalkSetting
  personality: SmallTalkPersonality
  path: SmallTalkPath
}): string {
  return [
    'SPEAK LIVE — SMALL TALK (flow-first, niet transactioneel):',
    VARIATION_FOCUS[params.variation],
    SETTING_NL[params.setting],
    PERSONALITY_NL[params.personality],
    PATH_NL[params.path],
    levelBlock(params.level),
    frictionLine(params.level),
    'Je bent geen docent: geen grammaticauitleg, geen vocabulaire-lijsten. Geen Engels naar de oefenaar.',
    'Houd het luchtig: “Oh leuk”, “nice”, “echt?”, “wat deed je daar dan?” mag — blijf overweg Nederlands.',
    'Doel: vertrouwen en natuurlijke frasen; perfectie is niet nodig.',
  ].join(' ')
}

function assistantBehavior(level: SmallTalkLevel): ScenarioRuntimeConfig['assistantBehavior'] {
  return {
    pace: level === 'A1' ? 'Rustig, korte bundels.' : level === 'B1' ? 'Vlot maar nog steeds korte zinnen.' : 'Normaal sociaal tempo.',
    register: 'Informeel Nederlands — alsof je echt even staat te praten.',
    tone: 'Luchtig, casual, licht Nederlands-realistisch; niet overdreven enthousiast.',
    responseStyle: [
      'Stel af en toe een vervolgvraag',
      'Reageer met kleine tussenstukjes',
      'Laat de ander ook praten — geen monoloog',
    ],
    frictionStyle: ['Soms iets kort of “awkward” — daarna gewoon door', 'Eén mini-misverstand mag', 'Geen harde correcties'],
    openingVariants: [],
    recommendationStyle: 'Geen lesplannen; max één zachte alternatieve zin als het past.',
    frictionChance: level === 'B1' ? 'medium' : 'light',
    guardrails: ['Geen docent-gedrag', 'Geen zware persoonlijke therapie-vragen', 'Blijf PG en respectvol'],
  }
}

function difficulty(level: SmallTalkLevel): ScenarioRuntimeConfig['difficultyAdjustments'] {
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

function starterHints(level: SmallTalkLevel, variation: SmallTalkVariation): string[] {
  const base = [
    'Hoi, ik ben …',
    'Leuk je te ontmoeten.',
    'Hoe was je weekend?',
    'Wat ga je nog doen vandaag?',
    'Het is lekker weer vandaag.',
    'Het regent weer — typisch hè?',
    'Wat heb je dit weekend gedaan?',
    'En jij — hoe gaat het?',
  ]
  if (variation === 'talking_about_weather') return ['Het is lekker weer vandaag.', 'Het regent weer.', 'Eindelijk zon.', ...base.slice(4)]
  if (variation === 'talking_about_weekend') return ['Hoe was je weekend?', 'Wat heb je gedaan dit weekend?', 'Iets leuks gedaan?', ...base]
  if (level === 'A1') return base.slice(0, 5)
  return base
}

export function buildSmallTalkScenario(config: {
  level: SmallTalkLevel
  subType?: SmallTalkSubtype
  variation?: SmallTalkVariation
  random?: () => number
}): ScenarioRuntimeConfig {
  const rng = config.random ?? Math.random
  const subType = config.subType ?? pickOne([...SMALL_TALK_SUBTYPES], rng)
  const variation = config.variation ?? pickOne([...SMALL_TALK_VARIATIONS], rng)
  const setting = pickOne([...SETTING_KEYS], rng)
  const personality = pickOne([...PERSONALITY_KEYS], rng)
  const path = pickOne([...PATH_KEYS], rng)
  const goals = buildSmallTalkRuntimeGoals()
  const openingPool = SUBTYPE_OPENING[subType]
  const openingLine = openingPool[Math.floor(clampRoll(rng) * openingPool.length)]!

  return {
    id: SMALL_TALK_SCENARIO_ID,
    scenarioFamily: SMALL_TALK_SCENARIO_ID,
    title: SMALL_TALK_TITLE,
    category: SMALL_TALK_CATEGORY,
    level: config.level,
    subType,
    variation,
    context: buildContext({ subType, variation, level: config.level, setting, personality, path }),
    learnerSituationSummary: `Small talk in het Nederlands — ${SETTING_NL[setting].replace(/^Sfeer:\s*/, '')}`.replace(/\s+/g, ' ').trim(),
    goals,
    weights: Object.fromEntries(goals.map((g) => [g.id, g.weight])),
    assistantBehavior: assistantBehavior(config.level),
    difficultyAdjustments: difficulty(config.level),
    hints: starterHints(config.level, variation),
    persona: {
      role: 'Gesprekspartner',
      displayName: 'Iemand om mee te praten',
      sceneLabel: 'small talk',
      subType,
      variation,
      setting,
      personality,
      conversationPath: path,
    },
    coreSkills: ['Flow', 'Natuurlijke frasen', 'Vervolgvraag', 'Lichte reacties'],
    openingLine,
    evaluationContract: buildSmallTalkEvaluationContract({ level: config.level, subType, variation }),
  }
}

export function maybeBuildSmallTalkSpeakLiveScenarioRuntime(params: {
  scenario: ScenarioConfig
  level: SmallTalkLevel
  overrides?: ScenarioSelectionOverrides | null
}): ScenarioRuntimeConfig | null {
  if (params.scenario.slug !== SMALL_TALK_SCENARIO_ID) return null
  const subType = normalizeSmallTalkSubtype(params.overrides?.subType as string | undefined)
  const variation = normalizeSmallTalkVariation(params.overrides?.variation as string | undefined)
  return buildSmallTalkScenario({
    level: params.level,
    subType: subType ?? undefined,
    variation: variation ?? undefined,
  })
}

export function parseSmallTalkScenarioRuntimeConfig(raw: unknown): ScenarioRuntimeConfig | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const candidate = raw as Partial<ScenarioRuntimeConfig>
  if (candidate.id !== SMALL_TALK_SCENARIO_ID) return null
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

export function hydrateSmallTalkLearnerSituationSummary(runtime: ScenarioRuntimeConfig): ScenarioRuntimeConfig {
  if (runtime.id?.trim().toLowerCase().replace(/-/g, '_') !== SMALL_TALK_SCENARIO_ID) return runtime
  if (runtime.learnerSituationSummary?.trim()) return runtime
  return {
    ...runtime,
    learnerSituationSummary:
      'Je oefent ontspannen small talk in het Nederlands — geen checklist-stress; het gaat om natuurlijke flow.',
  }
}

export function dutchPersonaForSmallTalkIfNeeded(
  scenarioSlug: string,
  runtime: ScenarioRuntimeConfig | null | undefined,
  persona: PersonaConfig,
): PersonaConfig {
  const slug = scenarioSlug.trim().toLowerCase().replace(/-/g, '_')
  if (slug !== SMALL_TALK_SCENARIO_ID) return persona
  if (persona.slug !== 'small_talk_partner') return persona
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
