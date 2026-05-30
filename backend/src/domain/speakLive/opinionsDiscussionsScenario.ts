import type {
  PersonaConfig,
  ScenarioConfig,
  ScenarioRuntimeConfig,
  ScenarioSelectionOverrides,
} from '../../models/contracts'
import { pickOne } from './bookingReservationsVocabularyPools'
import {
  OPINIONS_DISCUSSIONS_SCENARIO_ID,
  buildOpinionsDiscussionsEvaluationContract,
  buildOpinionsDiscussionsRuntimeGoals,
  type OpinionsDiscussionsLevel,
  type OpinionsDiscussionsSubtype,
  type OpinionsDiscussionsVariation,
} from './opinionsDiscussionsEvaluationContract'

export type { OpinionsDiscussionsLevel, OpinionsDiscussionsSubtype, OpinionsDiscussionsVariation } from './opinionsDiscussionsEvaluationContract'
export { OPINIONS_DISCUSSIONS_SCENARIO_ID } from './opinionsDiscussionsEvaluationContract'

export const OPINIONS_DISCUSSIONS_TITLE = 'Opinions & discussions' as const
export const OPINIONS_DISCUSSIONS_CATEGORY = 'Advanced' as const

export const OPINIONS_DISCUSSIONS_SUBTYPES = ['casual_opinion', 'work_discussion', 'social_debate'] as const
export const OPINIONS_DISCUSSIONS_VARIATIONS = ['agree_disagree', 'give_reasons'] as const

const TOPIC_KEYS = ['casual', 'work', 'social'] as const
type TopicKey = (typeof TOPIC_KEYS)[number]

/** Assistant opens with a clear opinion + short hook (Dutch). */
const OPINION_OPENERS: Record<TopicKey, string[]> = {
  casual: [
    'Ik vind het lekkerder om thuis te koken dan vaak uit eten te gaan. Wat vind jij?',
    'Ik geniet meer van rust in het weekend dan van een heel druk programma. Hoe zit dat voor jou?',
    'Ik vind fietsen in de stad fijner dan met de auto voor korte afstanden. Ben jij het daarmee eens?',
    'Ik hou meer van warm weer dan van een hele koude winterdag. Wat vind jij?',
  ],
  work: [
    'Ik vind thuiswerken op sommige dagen productiever dan elke dag op kantoor. Wat is jouw mening?',
    'Ik vind korte vergaderingen effectiever dan lange meetings zonder duidelijk doel. Ben jij het eens?',
    'Ik werk liever ’s ochtends aan concentratiewerk dan laat op de avond. Hoe zie jij dat?',
  ],
  social: [
    'Ik vind een stedentrip met de trein relaxter dan met de auto. Wat vind jij?',
    'Ik houd meer van het platteland voor uitwaaien dan van druk centrum elke week. Ben jij het daarmee eens?',
    'Ik vind reizen met een kleine rugzak prettiger dan met heel veel bagage. Wat is jouw voorkeur?',
  ],
}

const VARIATION_FOCUS: Record<OpinionsDiscussionsVariation, string> = {
  agree_disagree:
    'Variatie A — agree_disagree: focus op duidelijk eens/oneens/genuanceerd en nette toon; korte reacties.',
  give_reasons:
    'Variatie B — give_reasons: focus op “omdat/want”, korte argumenten, max. één extra reden per beurt op B1.',
}

function clampRoll(rng: () => number): number {
  const n = Number(rng())
  if (!Number.isFinite(n)) return Math.random()
  if (n <= 0) return 0
  if (n >= 1) return 0.999_999
  return n
}

export function normalizeOpinionsDiscussionsSubtype(raw: string | undefined): OpinionsDiscussionsSubtype | undefined {
  const v = (raw ?? '').trim().toLowerCase().replace(/-/g, '_')
  if (v === 'casual' || v === 'casual_opinion') return 'casual_opinion'
  if (v === 'work' || v === 'werk' || v === 'work_discussion') return 'work_discussion'
  if (v === 'social' || v === 'social_debate' || v === 'debate') return 'social_debate'
  return (OPINIONS_DISCUSSIONS_SUBTYPES as readonly string[]).includes(v) ? (v as OpinionsDiscussionsSubtype) : undefined
}

export function normalizeOpinionsDiscussionsVariation(raw: string | undefined): OpinionsDiscussionsVariation | undefined {
  const v = (raw ?? '').trim().toLowerCase().replace(/-/g, '_')
  if (v === 'a' || v === 'agree' || v === 'agree_disagree' || v === 'eens') return 'agree_disagree'
  if (v === 'b' || v === 'reasons' || v === 'give_reasons' || v === 'redenen') return 'give_reasons'
  return (OPINIONS_DISCUSSIONS_VARIATIONS as readonly string[]).includes(v) ? (v as OpinionsDiscussionsVariation) : undefined
}

function topicKeyForSubtype(subType: OpinionsDiscussionsSubtype, rng: () => number): TopicKey {
  if (subType === 'work_discussion') return 'work'
  if (subType === 'social_debate') return 'social'
  return pickOne(['casual', 'social'], rng)
}

function levelBlock(level: OpinionsDiscussionsLevel): string {
  if (level === 'A1') return 'Niveau A1: korte zinnen; eens/oneens; één simpele reden (“omdat …”).'
  if (level === 'B1') return 'Niveau B1: natuurlijker; tot twee redenen; iets vlottere tegenspraak.'
  return 'Niveau A2: standpunt + korte uitleg; basis connectoren (want, omdat, daarom).'
}

function assistantBehavior(level: OpinionsDiscussionsLevel): ScenarioRuntimeConfig['assistantBehavior'] {
  return {
    pace: level === 'A1' ? 'Rustig — één vraag per beurt.' : level === 'B1' ? 'Natuurlijk — lichte ping-pong.' : 'Normaal — korte beurten.',
    register: 'Informeel-neutraal; respectvol; licht Nederlands-direct.',
    tone: 'Nieuwsgierig, niet pedant; soms zacht oneens; max. één “waarom?” na jouw reactie.',
    responseStyle: [
      'Eerst eigen mening in één zin',
      'Max. één vervolgvraag of lichte tegenspraak',
      'Geen overweldigende argumentenstapel',
    ],
    frictionStyle: ['Lichte tegenspraak', 'Doorvragen “waarom?”', 'Parafrase-check'],
    openingVariants: [],
    recommendationStyle: 'Geen les; alleen taal in rol.',
    frictionChance: level === 'B1' ? 'medium' : 'light',
    guardrails: [
      'Geen zware politiek of gevoelige onderwerpen',
      'Geen persoonlijke aanvallen',
      'Nederlands naar de oefenaar',
    ],
  }
}

function difficulty(level: OpinionsDiscussionsLevel): ScenarioRuntimeConfig['difficultyAdjustments'] {
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

function starterHints(level: OpinionsDiscussionsLevel, variation: OpinionsDiscussionsVariation): string[] {
  const agree = ['Ik ben het eens', 'Ik ben het niet eens', 'Ik ben het niet helemaal eens', 'Dat klopt', 'Ik denk het niet']
  const reason = ['Omdat …', 'Ik vind dat omdat …', 'Want …', 'Het is beter omdat …']
  const base = variation === 'give_reasons' ? [...reason, ...agree.slice(0, 3)] : [...agree, ...reason.slice(0, 2)]
  if (level === 'A1') return base.slice(0, 6)
  if (level === 'B1') return [...base, 'Aan de ene kant … aan de andere kant …']
  return base
}

function buildContext(params: {
  subType: OpinionsDiscussionsSubtype
  variation: OpinionsDiscussionsVariation
  level: OpinionsDiscussionsLevel
  topicKey: TopicKey
  opinionOpenerNl: string
}): string {
  return [
    'SPEAK LIVE — MENINGEN & DISCUSSIE (redeneren, taaloefening):',
    VARIATION_FOCUS[params.variation],
    `Subtype: ${params.subType.replace(/_/g, ' ')}.`,
    `Thema-categorie: ${params.topicKey}.`,
    `Opening door assistent (voorbeeldzin): ${params.opinionOpenerNl}`,
    levelBlock(params.level),
    'Jij bent geen docent: geen theorieles. Nederlands naar de oefenaar.',
  ].join(' ')
}

export function buildOpinionsDiscussionsScenario(config: {
  level: OpinionsDiscussionsLevel
  subType?: OpinionsDiscussionsSubtype
  variation?: OpinionsDiscussionsVariation
  random?: () => number
}): ScenarioRuntimeConfig {
  const rng = config.random ?? Math.random
  const subType = config.subType ?? pickOne([...OPINIONS_DISCUSSIONS_SUBTYPES], rng)
  const variation = config.variation ?? pickOne([...OPINIONS_DISCUSSIONS_VARIATIONS], rng)
  const topicKey = topicKeyForSubtype(subType, rng)
  const pool = OPINION_OPENERS[topicKey]
  const opinionOpenerNl = pool[Math.floor(clampRoll(rng) * pool.length)]!
  const goals = buildOpinionsDiscussionsRuntimeGoals()
  const openingLine = opinionOpenerNl

  return {
    id: OPINIONS_DISCUSSIONS_SCENARIO_ID,
    scenarioFamily: OPINIONS_DISCUSSIONS_SCENARIO_ID,
    title: OPINIONS_DISCUSSIONS_TITLE,
    category: OPINIONS_DISCUSSIONS_CATEGORY,
    level: config.level,
    subType,
    variation,
    context: buildContext({
      subType,
      variation,
      level: config.level,
      topicKey,
      opinionOpenerNl,
    }),
    learnerSituationSummary:
      'Je oefent je mening geven, (on)eens zijn en kort onderbouwen — met lichte discussie en respect.'.replace(/\s+/g, ' ').trim(),
    goals,
    weights: Object.fromEntries(goals.map((g) => [g.id, g.weight])),
    assistantBehavior: assistantBehavior(config.level),
    difficultyAdjustments: difficulty(config.level),
    hints: starterHints(config.level, variation),
    persona: {
      role: 'Gesprekspartner',
      displayName: 'Iemand om mee te discussiëren',
      sceneLabel: 'opinions_discussions',
      subType,
      variation,
      topicCategory: topicKey,
      promptNl: opinionOpenerNl,
    },
    coreSkills: ['Standpunt', 'Redenering', 'Structuur', 'Toon', 'Connectoren'],
    openingLine,
    evaluationContract: buildOpinionsDiscussionsEvaluationContract({
      level: config.level,
      subType,
      variation,
    }),
  }
}

export function maybeBuildOpinionsDiscussionsSpeakLiveScenarioRuntime(params: {
  scenario: ScenarioConfig
  level: OpinionsDiscussionsLevel
  overrides?: ScenarioSelectionOverrides | null
}): ScenarioRuntimeConfig | null {
  if (params.scenario.slug !== OPINIONS_DISCUSSIONS_SCENARIO_ID) return null
  const subType = normalizeOpinionsDiscussionsSubtype(params.overrides?.subType as string | undefined)
  const variation = normalizeOpinionsDiscussionsVariation(params.overrides?.variation as string | undefined)
  return buildOpinionsDiscussionsScenario({
    level: params.level,
    subType: subType ?? undefined,
    variation: variation ?? undefined,
  })
}

export function parseOpinionsDiscussionsScenarioRuntimeConfig(raw: unknown): ScenarioRuntimeConfig | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const candidate = raw as Partial<ScenarioRuntimeConfig>
  if (candidate.id !== OPINIONS_DISCUSSIONS_SCENARIO_ID) return null
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

export function hydrateOpinionsDiscussionsLearnerSituationSummary(runtime: ScenarioRuntimeConfig): ScenarioRuntimeConfig {
  if (runtime.id?.trim().toLowerCase().replace(/-/g, '_') !== OPINIONS_DISCUSSIONS_SCENARIO_ID) return runtime
  if (runtime.learnerSituationSummary?.trim()) return runtime
  return {
    ...runtime,
    learnerSituationSummary:
      'Je oefent meningen, eens/oneens en korte redenen in het Nederlands — met een respectvolle gesprekspartner.',
  }
}

export function dutchPersonaForOpinionsDiscussionsIfNeeded(
  scenarioSlug: string,
  runtime: ScenarioRuntimeConfig | null | undefined,
  persona: PersonaConfig,
): PersonaConfig {
  const slug = scenarioSlug.trim().toLowerCase().replace(/-/g, '_')
  if (slug !== OPINIONS_DISCUSSIONS_SCENARIO_ID) return persona
  if (persona.slug !== 'opinions_discussion_partner') return persona
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
