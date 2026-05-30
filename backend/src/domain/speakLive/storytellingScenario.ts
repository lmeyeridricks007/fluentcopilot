import type {
  PersonaConfig,
  ScenarioConfig,
  ScenarioRuntimeConfig,
  ScenarioSelectionOverrides,
} from '../../models/contracts'
import { pickOne } from './bookingReservationsVocabularyPools'
import {
  STORYTELLING_SCENARIO_ID,
  buildStorytellingEvaluationContract,
  buildStorytellingRuntimeGoals,
  type StorytellingLevel,
  type StorytellingSubtype,
  type StorytellingVariation,
} from './storytellingEvaluationContract'

export type { StorytellingLevel, StorytellingSubtype, StorytellingVariation } from './storytellingEvaluationContract'
export { STORYTELLING_SCENARIO_ID } from './storytellingEvaluationContract'

export const STORYTELLING_TITLE = 'Storytelling' as const
export const STORYTELLING_CATEGORY = 'Advanced' as const

export const STORYTELLING_SUBTYPES = ['daily_story', 'travel_story', 'personal_experience'] as const
export const STORYTELLING_VARIATIONS = ['what_you_did_yesterday', 'travel_story'] as const

const TOPIC_CATEGORY_KEYS = ['daily', 'travel', 'personal'] as const
type TopicCat = (typeof TOPIC_CATEGORY_KEYS)[number]

const PROMPT_BY_CATEGORY: Record<TopicCat, string[]> = {
  daily: [
    'Vertel wat je gisteren hebt gedaan — van begin tot einde van de dag.',
    'Vertel over je weekend — iets concreets dat je hebt gedaan.',
    'Vertel over een avond thuis of uit: wat gebeurde er, en hoe was het?',
  ],
  travel: [
    'Vertel over een stedentrip of uitje — waar ging je naartoe en wat vond je?',
    'Vertel over een wandeling of hike — route, weer, en een moment dat je herinnert.',
    'Vertel over een vakantieherinnering — kort verhaal met begin, midden en slot.',
    'Vertel over een restaurantbezoek tijdens een reis — sfeer, eten, en hoe het afliep.',
  ],
  personal: [
    'Vertel over een grappig moment dat je meemaakte — context en wat er gebeurde.',
    'Vertel over een lastige situatie die je achterliet — zonder te veel privé-details.',
    'Vertel over iets interessants dat je recent hebt meegemaakt op werk of studie.',
  ],
}

const VARIATION_FOCUS: Record<StorytellingVariation, string> = {
  what_you_did_yesterday:
    'Variatie A — what_you_did_yesterday: eenvoudige verleden tijd, volgorde (gisteren / daarna / ’s avonds), korte zinnen.',
  travel_story:
    'Variatie B — travel_story: details, sfeer, emotie (“het was …”), vlottere overgangen.',
}

function clampRoll(rng: () => number): number {
  const n = Number(rng())
  if (!Number.isFinite(n)) return Math.random()
  if (n <= 0) return 0
  if (n >= 1) return 0.999_999
  return n
}

export function normalizeStorytellingSubtype(raw: string | undefined): StorytellingSubtype | undefined {
  const v = (raw ?? '').trim().toLowerCase().replace(/-/g, '_')
  if (v === 'daily' || v === 'day' || v === 'daily_story') return 'daily_story'
  if (v === 'travel' || v === 'trip' || v === 'travel_story') return 'travel_story'
  if (v === 'personal' || v === 'experience' || v === 'personal_experience') return 'personal_experience'
  return (STORYTELLING_SUBTYPES as readonly string[]).includes(v) ? (v as StorytellingSubtype) : undefined
}

export function normalizeStorytellingVariation(raw: string | undefined): StorytellingVariation | undefined {
  const v = (raw ?? '').trim().toLowerCase().replace(/-/g, '_')
  if (v === 'a' || v === 'yesterday' || v === 'what_you_did_yesterday' || v === 'gisteren') return 'what_you_did_yesterday'
  if (v === 'b' || v === 'travel' || v === 'travel_story' || v === 'reis') return 'travel_story'
  return (STORYTELLING_VARIATIONS as readonly string[]).includes(v) ? (v as StorytellingVariation) : undefined
}

function levelBlock(level: StorytellingLevel): string {
  if (level === 'A1') return 'Niveau A1: 2–3 korte zinnen; simpele perfectum/imperfectum; weinig detail.'
  if (level === 'B1') return 'Niveau B1: 4–6 zinnen; rijkere beschrijving en emotie; natuurlijke overgangen.'
  return 'Niveau A2: 3–4 zinnen; duidelijke volgorde; simpele gevoelens (“leuk”, “moe”).'
}

function topicCategoryForSubtype(subType: StorytellingSubtype, rng: () => number): TopicCat {
  if (subType === 'travel_story') return 'travel'
  if (subType === 'personal_experience') return 'personal'
  return pickOne(['daily', 'personal'], rng)
}

function assistantBehavior(level: StorytellingLevel): ScenarioRuntimeConfig['assistantBehavior'] {
  return {
    pace: level === 'A1' ? 'Rustig — ruimte voor een langer verhaal.' : level === 'B1' ? 'Natuurlijk — volgt de verteller.' : 'Normaal — korte reacties tussen door.',
    register: 'Informeel, warm — je bent een vriend(in) die echt wil horen.',
    tone: 'Betrokken, nieuwsgierig; geen docent; max. één vervolgvraag per beurt na een verhaal.',
    responseStyle: [
      'Luisteraar: mini-reactie (“oh nice”, “spannend”)',
      'Max. één vervolgvraag (detail, gevoel, “en toen?”)',
      'Soms lichte onduidelijkheid om detail uit te lokken',
    ],
    frictionStyle: ['Vraag naar gevoel', 'Vraag naar ontbrekend detail', 'Parafraseer kort'],
    openingVariants: [],
    recommendationStyle: 'Geen les; alleen taal in rol.',
    frictionChance: level === 'B1' ? 'medium' : 'light',
    guardrails: ['Geen docent', 'Geen zeer gevoelige traumadetails afdwingen', 'Nederlands naar de oefenaar'],
  }
}

function difficulty(level: StorytellingLevel): ScenarioRuntimeConfig['difficultyAdjustments'] {
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

function starterHints(level: StorytellingLevel, variation: StorytellingVariation): string[] {
  const past = ['Gisteren …', 'Eerst …', 'Daarna …', 'Op het eind …', 'Het was …']
  const travel = ['We waren in …', 'Het weer was …', 'Het leukste moment was …', 'Daarna gingen we …']
  const base = variation === 'travel_story' ? [...travel, ...past.slice(0, 3)] : past
  if (level === 'A1') return base.slice(0, 5)
  if (level === 'B1') return [...base, 'Ik vond het … omdat …']
  return base
}

function buildContext(params: {
  subType: StorytellingSubtype
  variation: StorytellingVariation
  level: StorytellingLevel
  promptNl: string
  topicCategory: TopicCat
}): string {
  return [
    'SPEAK LIVE — VERHALEN VERTELLEN (narratief + luisteraar):',
    VARIATION_FOCUS[params.variation],
    `Subtype: ${params.subType.replace(/_/g, ' ')}.`,
    `Thema-categorie: ${params.topicCategory}.`,
    `Concrete prompt: ${params.promptNl}`,
    levelBlock(params.level),
    'Jij bent geen docent: geen grammaticauitleg. Nederlands naar de oefenaar.',
  ].join(' ')
}

export function buildStorytellingScenario(config: {
  level: StorytellingLevel
  subType?: StorytellingSubtype
  variation?: StorytellingVariation
  random?: () => number
}): ScenarioRuntimeConfig {
  const rng = config.random ?? Math.random
  const subType = config.subType ?? pickOne([...STORYTELLING_SUBTYPES], rng)
  const variation = config.variation ?? pickOne([...STORYTELLING_VARIATIONS], rng)
  const variationResolved = variation
  const topicCategory = topicCategoryForSubtype(subType, rng)
  const promptPool = PROMPT_BY_CATEGORY[topicCategory]
  const promptNl = promptPool[Math.floor(clampRoll(rng) * promptPool.length)]!
  const goals = buildStorytellingRuntimeGoals()
  const openingLine = promptNl

  return {
    id: STORYTELLING_SCENARIO_ID,
    scenarioFamily: STORYTELLING_SCENARIO_ID,
    title: STORYTELLING_TITLE,
    category: STORYTELLING_CATEGORY,
    level: config.level,
    subType,
    variation: variationResolved,
    context: buildContext({
      subType,
      variation: variationResolved,
      level: config.level,
      promptNl,
      topicCategory,
    }),
    learnerSituationSummary:
      'Je oefent een kort verhaal in het Nederlands — begin, midden, einde — met verleden tijd en een geïnteresseerde luisteraar.'
        .replace(/\s+/g, ' ')
        .trim(),
    goals,
    weights: Object.fromEntries(goals.map((g) => [g.id, g.weight])),
    assistantBehavior: assistantBehavior(config.level),
    difficultyAdjustments: difficulty(config.level),
    hints: starterHints(config.level, variationResolved),
    persona: {
      role: 'Luisteraar',
      displayName: 'Iemand die graag luistert',
      sceneLabel: 'storytelling',
      subType,
      variation: variationResolved,
      topicCategory,
      promptNl,
    },
    coreSkills: ['Verhaalstructuur', 'Volgorde', 'Detail', 'Natuurlijke flow', 'Verleden tijd'],
    openingLine,
    evaluationContract: buildStorytellingEvaluationContract({
      level: config.level,
      subType,
      variation: variationResolved,
    }),
  }
}

export function maybeBuildStorytellingSpeakLiveScenarioRuntime(params: {
  scenario: ScenarioConfig
  level: StorytellingLevel
  overrides?: ScenarioSelectionOverrides | null
}): ScenarioRuntimeConfig | null {
  if (params.scenario.slug !== STORYTELLING_SCENARIO_ID) return null
  const subType = normalizeStorytellingSubtype(params.overrides?.subType as string | undefined)
  const variation = normalizeStorytellingVariation(params.overrides?.variation as string | undefined)
  return buildStorytellingScenario({
    level: params.level,
    subType: subType ?? undefined,
    variation: variation ?? undefined,
  })
}

export function parseStorytellingScenarioRuntimeConfig(raw: unknown): ScenarioRuntimeConfig | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const candidate = raw as Partial<ScenarioRuntimeConfig>
  if (candidate.id !== STORYTELLING_SCENARIO_ID) return null
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

export function hydrateStorytellingLearnerSituationSummary(runtime: ScenarioRuntimeConfig): ScenarioRuntimeConfig {
  if (runtime.id?.trim().toLowerCase().replace(/-/g, '_') !== STORYTELLING_SCENARIO_ID) return runtime
  if (runtime.learnerSituationSummary?.trim()) return runtime
  return {
    ...runtime,
    learnerSituationSummary:
      'Je oefent een verhaal vertellen in het Nederlands — kader, gebeurtenissen, en een slot met gevoel.',
  }
}

export function dutchPersonaForStorytellingIfNeeded(
  scenarioSlug: string,
  runtime: ScenarioRuntimeConfig | null | undefined,
  persona: PersonaConfig,
): PersonaConfig {
  const slug = scenarioSlug.trim().toLowerCase().replace(/-/g, '_')
  if (slug !== STORYTELLING_SCENARIO_ID) return persona
  if (persona.slug !== 'storytelling_listener') return persona
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
