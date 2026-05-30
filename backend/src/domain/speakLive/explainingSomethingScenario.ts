import type {
  PersonaConfig,
  ScenarioConfig,
  ScenarioRuntimeConfig,
  ScenarioSelectionOverrides,
} from '../../models/contracts'
import { pickOne } from './bookingReservationsVocabularyPools'
import {
  EXPLAINING_SOMETHING_SCENARIO_ID,
  buildExplainingSomethingEvaluationContract,
  buildExplainingSomethingRuntimeGoals,
  type ExplainingSomethingLevel,
  type ExplainingSomethingSubtype,
  type ExplainingSomethingVariation,
} from './explainingSomethingEvaluationContract'

export type { ExplainingSomethingLevel, ExplainingSomethingSubtype, ExplainingSomethingVariation } from './explainingSomethingEvaluationContract'
export { EXPLAINING_SOMETHING_SCENARIO_ID } from './explainingSomethingEvaluationContract'

export const EXPLAINING_SOMETHING_TITLE = 'Explaining something' as const
export const EXPLAINING_SOMETHING_CATEGORY = 'Advanced' as const

export const EXPLAINING_SOMETHING_SUBTYPES = [
  'giving_instructions',
  'explaining_process',
  'explaining_how_to',
] as const
export const EXPLAINING_SOMETHING_VARIATIONS = ['giving_instructions', 'describing_process'] as const

const TOPIC_CATEGORY_KEYS = ['daily', 'work', 'general'] as const
type TopicCat = (typeof TOPIC_CATEGORY_KEYS)[number]

const TASK_BY_CATEGORY: Record<TopicCat, string[]> = {
  daily: [
    'Leg uit hoe je thuis koffie zet — van bonen of filter tot kop.',
    'Leg uit hoe je een eenvoudige pasta maakt — wat doe je eerst?',
    'Leg uit hoe je met de OV-app een reis plant.',
    'Leg uit hoe je boodschappen doet bij de supermarkt — korte stappen.',
  ],
  work: [
    'Leg uit hoe je een korte professionele e-mail opstelt en verstuurt.',
    'Leg uit hoe je een document deelt met een collega (stappen).',
    'Leg uit hoe je een kleine taak in je workflow afhandelt — wat eerst, wat later?',
  ],
  general: [
    'Leg uit hoe iets in elkaar zit — gebruik een vaste routine als voorbeeld.',
    'Beschrijf hoe een typische ochtend van jou verloopt — chronologisch.',
    'Leg uit hoe je een simpel apparaat gebruikt (bijv. wasmachine of koffiezetapparaat) — stappen.',
  ],
}

const VARIATION_FOCUS: Record<ExplainingSomethingVariation, string> = {
  giving_instructions:
    'Variatie A — giving_instructions: imperatief, duidelijke stappen (“Zet eerst …”, “Klik dan …”), korte zinnen.',
  describing_process:
    'Variatie B — describing_process: chronologie (“Eerst gebeurt …”, “Daarna …”, “Uiteindelijk …”), verbindingswoorden.',
}

function clampRoll(rng: () => number): number {
  const n = Number(rng())
  if (!Number.isFinite(n)) return Math.random()
  if (n <= 0) return 0
  if (n >= 1) return 0.999_999
  return n
}

export function normalizeExplainingSomethingSubtype(raw: string | undefined): ExplainingSomethingSubtype | undefined {
  const v = (raw ?? '').trim().toLowerCase().replace(/-/g, '_')
  if (v === 'instructions' || v === 'instruct' || v === 'giving_instructions') return 'giving_instructions'
  if (v === 'process' || v === 'explaining_process') return 'explaining_process'
  if (v === 'howto' || v === 'how_to' || v === 'explaining_how_to') return 'explaining_how_to'
  return (EXPLAINING_SOMETHING_SUBTYPES as readonly string[]).includes(v) ? (v as ExplainingSomethingSubtype) : undefined
}

export function normalizeExplainingSomethingVariation(raw: string | undefined): ExplainingSomethingVariation | undefined {
  const v = (raw ?? '').trim().toLowerCase().replace(/-/g, '_')
  if (v === 'a' || v === 'instructions' || v === 'giving_instructions' || v === 'steps') return 'giving_instructions'
  if (v === 'b' || v === 'process' || v === 'describing_process' || v === 'chronology') return 'describing_process'
  return (EXPLAINING_SOMETHING_VARIATIONS as readonly string[]).includes(v) ? (v as ExplainingSomethingVariation) : undefined
}

function levelBlock(level: ExplainingSomethingLevel): string {
  if (level === 'A1') return 'Niveau A1: 2–3 korte stappen; simpele werkwoorden; basis-woorden eerst/dan.'
  if (level === 'B1') return 'Niveau B1: 4–6 stappen; natuurlijkere overgangen; mag iets langer monoloog-praten.'
  return 'Niveau A2: 3–4 stappen; duidelijke structuur; simpele verbindingswoorden.'
}

function topicCategoryForSubtype(subType: ExplainingSomethingSubtype, rng: () => number): TopicCat {
  if (subType === 'explaining_how_to') return 'general'
  if (subType === 'explaining_process') return pickOne(['daily', 'general'], rng)
  return pickOne([...TOPIC_CATEGORY_KEYS], rng)
}

function assistantBehavior(level: ExplainingSomethingLevel): ScenarioRuntimeConfig['assistantBehavior'] {
  return {
    pace: level === 'A1' ? 'Rustig — ruimte voor langere uitleg.' : level === 'B1' ? 'Natuurlijk — volgt de oefenaar.' : 'Normaal — korte tussenreacties.',
    register: 'Informeel maar helder — je bent de “luisteraar” die soms wrijving toevoegt.',
    tone: 'Nieuwsgierig, geduldig; geen docent; max. één vraag per beurt na een uitleg.',
    responseStyle: [
      'Trouw parafraseren: hun formulering en volgorde eerst — niet meteen een “perfecte” versie van het proces als vervanging',
      'Daarna korte informatieve laag: wat mist nog (1–2 schakels) of één tip over woordkeuze/verbindingswoorden; max. één vervolgvraag',
      'Geen weglaten van hun stappen; geen extra stappen verzinnen; geen lange docent-monoloog',
    ],
    frictionStyle: [
      'Vraag alleen om een ontbrekende stap als de volgorde nog niet duidelijk is',
      'Parafraseer kort om te checken (“Dus …”) — herhaal niet dezelfde vraag als ze die net beantwoordden',
    ],
    openingVariants: [],
    recommendationStyle: 'Geen les; alleen taal in rol.',
    frictionChance: level === 'B1' ? 'medium' : 'light',
    guardrails: ['Geen docent', 'Geen gevoelige privé-details', 'Nederlands naar de oefenaar'],
  }
}

function difficulty(level: ExplainingSomethingLevel): ScenarioRuntimeConfig['difficultyAdjustments'] {
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

function starterHints(level: ExplainingSomethingLevel, variation: ExplainingSomethingVariation): string[] {
  const seq = ['Eerst …', 'Daarna …', 'Dan …', 'Tot slot …', 'Uiteindelijk …']
  const imp = ['Zet eerst …', 'Klik dan op …', 'Wacht tot …', 'Controleer of …']
  const base = variation === 'giving_instructions' ? [...imp, ...seq.slice(0, 2)] : [...seq, ...imp.slice(0, 1)]
  if (level === 'A1') return base.slice(0, 5)
  if (level === 'B1') return [...base, 'Kort samengevat: het gaat om drie hoofdstappen …']
  return base
}

function buildContext(params: {
  subType: ExplainingSomethingSubtype
  variation: ExplainingSomethingVariation
  level: ExplainingSomethingLevel
  taskNl: string
  topicCategory: TopicCat
}): string {
  return [
    'SPEAK LIVE — IETS UITLEGGEN (gestructureerde monoloog + luisteraar):',
    VARIATION_FOCUS[params.variation],
    `Subtype: ${params.subType.replace(/_/g, ' ')}.`,
    `Topic-categorie: ${params.topicCategory}.`,
    `Concrete opdracht: ${params.taskNl}`,
    levelBlock(params.level),
    'Jij bent geen docent: geen grammaticauitleg. Nederlands naar de oefenaar.',
  ].join(' ')
}

export function buildExplainingSomethingScenario(config: {
  level: ExplainingSomethingLevel
  subType?: ExplainingSomethingSubtype
  variation?: ExplainingSomethingVariation
  random?: () => number
}): ScenarioRuntimeConfig {
  const rng = config.random ?? Math.random
  const subType = config.subType ?? pickOne([...EXPLAINING_SOMETHING_SUBTYPES], rng)
  const variation = config.variation ?? pickOne([...EXPLAINING_SOMETHING_VARIATIONS], rng)
  const topicCategory = topicCategoryForSubtype(subType, rng)
  const taskPool = TASK_BY_CATEGORY[topicCategory]
  const taskNl = taskPool[Math.floor(clampRoll(rng) * taskPool.length)]!
  const goals = buildExplainingSomethingRuntimeGoals()
  const openingLine = taskNl

  return {
    id: EXPLAINING_SOMETHING_SCENARIO_ID,
    scenarioFamily: EXPLAINING_SOMETHING_SCENARIO_ID,
    title: EXPLAINING_SOMETHING_TITLE,
    category: EXPLAINING_SOMETHING_CATEGORY,
    level: config.level,
    subType,
    variation,
    context: buildContext({ subType, variation, level: config.level, taskNl, topicCategory }),
    learnerSituationSummary:
      'Je oefent om iets duidelijk uit te leggen in het Nederlands — stappen, volgorde, en korte antwoorden op verduidelijkingsvragen.'.replace(/\s+/g, ' ').trim(),
    goals,
    weights: Object.fromEntries(goals.map((g) => [g.id, g.weight])),
    assistantBehavior: assistantBehavior(config.level),
    difficultyAdjustments: difficulty(config.level),
    hints: starterHints(config.level, variation),
    persona: {
      role: 'Luisteraar',
      displayName: 'Iemand die meeluistert',
      sceneLabel: 'explaining_something',
      subType,
      variation,
      topicCategory,
      taskNl,
    },
    coreSkills: ['Structuur', 'Volledigheid', 'Helderheid', 'Verbindingswoorden', 'Sequentie'],
    openingLine,
    evaluationContract: buildExplainingSomethingEvaluationContract({
      level: config.level,
      subType,
      variation,
    }),
  }
}

export function maybeBuildExplainingSomethingSpeakLiveScenarioRuntime(params: {
  scenario: ScenarioConfig
  level: ExplainingSomethingLevel
  overrides?: ScenarioSelectionOverrides | null
}): ScenarioRuntimeConfig | null {
  if (params.scenario.slug !== EXPLAINING_SOMETHING_SCENARIO_ID) return null
  const subType = normalizeExplainingSomethingSubtype(params.overrides?.subType as string | undefined)
  const variation = normalizeExplainingSomethingVariation(params.overrides?.variation as string | undefined)
  return buildExplainingSomethingScenario({
    level: params.level,
    subType: subType ?? undefined,
    variation: variation ?? undefined,
  })
}

export function parseExplainingSomethingScenarioRuntimeConfig(raw: unknown): ScenarioRuntimeConfig | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const candidate = raw as Partial<ScenarioRuntimeConfig>
  if (candidate.id !== EXPLAINING_SOMETHING_SCENARIO_ID) return null
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

export function hydrateExplainingSomethingLearnerSituationSummary(runtime: ScenarioRuntimeConfig): ScenarioRuntimeConfig {
  if (runtime.id?.trim().toLowerCase().replace(/-/g, '_') !== EXPLAINING_SOMETHING_SCENARIO_ID) return runtime
  if (runtime.learnerSituationSummary?.trim()) return runtime
  return {
    ...runtime,
    learnerSituationSummary:
      'Je oefent helder uitleggen in het Nederlands — stappen, volgorde, en korte verduidelijkingen.',
  }
}

export function dutchPersonaForExplainingSomethingIfNeeded(
  scenarioSlug: string,
  runtime: ScenarioRuntimeConfig | null | undefined,
  persona: PersonaConfig,
): PersonaConfig {
  const slug = scenarioSlug.trim().toLowerCase().replace(/-/g, '_')
  if (slug !== EXPLAINING_SOMETHING_SCENARIO_ID) return persona
  if (persona.slug !== 'explaining_something_listener') return persona
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
