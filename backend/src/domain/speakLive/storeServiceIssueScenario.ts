import type {
  PersonaConfig,
  ScenarioConfig,
  ScenarioRuntimeConfig,
  ScenarioSelectionOverrides,
} from '../../models/contracts'

import { getStoreServiceIssueStarterHintsForRuntime } from './storeServiceIssueLearnerStarters'
import {
  buildStoreServiceIssueEvaluationContract,
  buildStoreServiceIssueRuntimeGoals,
} from './storeServiceIssueEvaluationContract'
import {
  buildStoreServiceIssueAssistantBehavior,
  buildStoreServiceIssueRuntimeContext,
  storeServiceIssueDifficultyAdjustments,
} from './storeServiceIssuePrompts'
import { pickOne } from './bookingReservationsVocabularyPools'
import { storeServiceIssueIssueLineNl } from './storeServiceIssueVocabularyPools'

export const STORE_SERVICE_ISSUE_SCENARIO_ID = 'store_service_issue' as const

/** Bump when seeded first assistant line / opening pool changes — stale threads must not be resumed. */
export const STORE_SERVICE_ISSUE_SPEAK_LIVE_OPENING_CONTRACT_VERSION = 2 as const

/**
 * True when an existing Speak Live thread should not be resumed: missing runtime, wrong id, or opening
 * contract version too old (stale seeded assistant greeting).
 */
export function isStoreServiceIssueSpeakLiveRuntimeOpeningStale(
  scenarioSlug: string,
  existingState: { scenarioRuntimeConfig?: ScenarioRuntimeConfig | null } | null | undefined
): boolean {
  const slug = scenarioSlug.trim().toLowerCase().replace(/-/g, '_')
  if (slug !== STORE_SERVICE_ISSUE_SCENARIO_ID) return false
  const rc = existingState?.scenarioRuntimeConfig
  if (!rc || rc.id !== STORE_SERVICE_ISSUE_SCENARIO_ID) return true
  const v = rc.storeServiceIssueOpeningContractVersion
  if (typeof v !== 'number' || v < STORE_SERVICE_ISSUE_SPEAK_LIVE_OPENING_CONTRACT_VERSION) return true
  return false
}
export const STORE_SERVICE_ISSUE_TITLE = 'Probleem in de winkel / service' as const
export const STORE_SERVICE_ISSUE_CATEGORY = 'Winkel & service' as const

export const STORE_SERVICE_ISSUE_SUBTYPES = ['store_return', 'service_issue', 'product_problem'] as const

export const STORE_SERVICE_ISSUE_VARIATIONS = ['returning_item', 'complaint', 'explaining_issue'] as const

export type StoreServiceIssueLevel = 'A1' | 'A2' | 'B1'
export type StoreServiceIssueSubtype = (typeof STORE_SERVICE_ISSUE_SUBTYPES)[number]
export type StoreServiceIssueVariation = (typeof STORE_SERVICE_ISSUE_VARIATIONS)[number]

/** Optional launcher/API bias for the randomized “issue context” line. */
export type StoreServiceIssueDetailFocus =
  | 'too_small'
  | 'too_big'
  | 'wrong_color'
  | 'not_as_expected'
  | 'prefer_exchange'
  | 'wrong_item_received'
  | 'delayed_order'
  | 'incomplete_order'
  | 'pickup_problem'
  | 'service_error'
  | 'broken'
  | 'damaged'
  | 'missing_part'
  | 'wont_turn_on'
  | 'stopped_working'

type BuildParams = {
  level: StoreServiceIssueLevel
  subType?: StoreServiceIssueSubtype
  variation?: StoreServiceIssueVariation | string
  detailFocus?: StoreServiceIssueDetailFocus | string
  random?: () => number
}

const SUBTYPE_LABEL_NL: Record<StoreServiceIssueSubtype, string> = {
  store_return: 'retourbalie / winkel',
  service_issue: 'servicebalie / klantenservice',
  product_problem: 'balie (defect product)',
}

const PERSONA_BY_SUBTYPE: Record<
  StoreServiceIssueSubtype,
  { role: string; displayName: string; openingLine: string }
> = {
  store_return: {
    role: 'Medewerker retourbalie',
    displayName: 'Medewerker',
    openingLine: 'Goedemiddag — waarmee kan ik u helpen?',
  },
  service_issue: {
    role: 'Medewerker servicebalie',
    displayName: 'Medewerker',
    openingLine: 'Dag — wat kan ik voor u doen?',
  },
  product_problem: {
    role: 'Medewerker (product / support)',
    displayName: 'Medewerker',
    openingLine: 'Hallo — waar gaat het om?',
  },
}

const RETURN_CONTEXT_POOL: StoreServiceIssueDetailFocus[] = [
  'too_small',
  'too_big',
  'wrong_color',
  'not_as_expected',
  'prefer_exchange',
]

const SERVICE_CONTEXT_POOL: StoreServiceIssueDetailFocus[] = [
  'wrong_item_received',
  'delayed_order',
  'incomplete_order',
  'pickup_problem',
  'service_error',
]

const PRODUCT_CONTEXT_POOL: StoreServiceIssueDetailFocus[] = [
  'broken',
  'damaged',
  'missing_part',
  'wont_turn_on',
  'stopped_working',
]

function clampRoll(rng: () => number): number {
  const n = Number(rng())
  if (!Number.isFinite(n)) return Math.random()
  if (n <= 0) return 0
  if (n >= 1) return 0.999_999
  return n
}

export function normalizeStoreServiceSubtype(raw: string | undefined): StoreServiceIssueSubtype | undefined {
  const v = (raw ?? '').trim().toLowerCase().replace(/-/g, '_')
  if (v === 'return' || v === 'returns' || v === 'store_return' || v === 'retour') return 'store_return'
  if (v === 'service' || v === 'service_issue' || v === 'service_desk' || v === 'klantenservice') return 'service_issue'
  if (v === 'product' || v === 'product_problem' || v === 'defect') return 'product_problem'
  return (STORE_SERVICE_ISSUE_SUBTYPES as readonly string[]).includes(v) ? (v as StoreServiceIssueSubtype) : undefined
}

export function normalizeStoreServiceVariation(raw: string | undefined): StoreServiceIssueVariation | undefined {
  const v = (raw ?? '').trim().toLowerCase().replace(/-/g, '_')
  if (v === 'return' || v === 'returning' || v === 'returning_item' || v === 'retour') return 'returning_item'
  if (v === 'complaint' || v === 'klacht') return 'complaint'
  if (v === 'explain' || v === 'explaining' || v === 'explaining_issue' || v === 'defect' || v === 'problem') {
    return 'explaining_issue'
  }
  return (STORE_SERVICE_ISSUE_VARIATIONS as readonly string[]).includes(v) ? (v as StoreServiceIssueVariation) : undefined
}

export function normalizeStoreServiceIssueDetailFocus(raw: string | undefined): StoreServiceIssueDetailFocus | undefined {
  const v = (raw ?? '').trim().toLowerCase().replace(/-/g, '_')
  const aliases: Record<string, StoreServiceIssueDetailFocus> = {
    wrong_size: 'too_small',
    te_klein: 'too_small',
    too_small: 'too_small',
    te_groot: 'too_big',
    too_big: 'too_big',
    verkeerde_kleur: 'wrong_color',
    wrong_color: 'wrong_color',
    not_expected: 'not_as_expected',
    not_what_expected: 'not_as_expected',
    not_as_expected: 'not_as_expected',
    exchange: 'prefer_exchange',
    refund: 'prefer_exchange',
    refund_exchange: 'prefer_exchange',
    prefer_exchange: 'prefer_exchange',
    wrong_item: 'wrong_item_received',
    wrong_item_received: 'wrong_item_received',
    late_order: 'delayed_order',
    delayed_order: 'delayed_order',
    incomplete: 'incomplete_order',
    incomplete_order: 'incomplete_order',
    pickup: 'pickup_problem',
    pickup_problem: 'pickup_problem',
    service_error: 'service_error',
    broken: 'broken',
    broken_item: 'broken',
    damaged: 'damaged',
    damaged_product: 'damaged',
    missing_part: 'missing_part',
    doesnt_turn_on: 'wont_turn_on',
    wont_turn_on: 'wont_turn_on',
    stopped_working: 'stopped_working',
    stopped_working_quickly: 'stopped_working',
  }
  const mapped = aliases[v]
  if (mapped) return mapped
  const allowed: readonly StoreServiceIssueDetailFocus[] = [
    ...RETURN_CONTEXT_POOL,
    ...SERVICE_CONTEXT_POOL,
    ...PRODUCT_CONTEXT_POOL,
  ]
  return allowed.includes(v as StoreServiceIssueDetailFocus) ? (v as StoreServiceIssueDetailFocus) : undefined
}

function poolForSubtype(sub: StoreServiceIssueSubtype): readonly StoreServiceIssueDetailFocus[] {
  if (sub === 'store_return') return RETURN_CONTEXT_POOL
  if (sub === 'service_issue') return SERVICE_CONTEXT_POOL
  return PRODUCT_CONTEXT_POOL
}

function rollIssueContext(
  sub: StoreServiceIssueSubtype,
  focus: StoreServiceIssueDetailFocus | undefined,
  rng: () => number
): StoreServiceIssueDetailFocus {
  const pool = poolForSubtype(sub)
  if (focus && pool.includes(focus)) return focus
  return pickOne([...pool], rng)
}

function buildLearnerSituationSummary(params: {
  subType: StoreServiceIssueSubtype
  variation: StoreServiceIssueVariation
  issueLine: string
}): string {
  const place = SUBTYPE_LABEL_NL[params.subType]
  const task =
    params.variation === 'returning_item'
      ? 'Je wilt iets retourneren of ruilen, legt kort uit waarom, en vraagt wat er mogelijk is.'
      : params.variation === 'complaint'
        ? 'Er is iets misgegaan met een bestelling of service; je legt het kort uit en vraagt rustig om een oplossing.'
        : 'Je beschrijft een defect of probleem met het product en vraagt wat je nu kunt doen.'
  return `${task} Setting: ${place}. Kern van deze run: ${params.issueLine}.`.replace(/\s+/g, ' ').trim()
}

function pickFrictionLine(level: StoreServiceIssueLevel, subType: StoreServiceIssueSubtype, rng: () => number): string {
  const pool =
    subType === 'store_return'
      ? [
          'vraag kort of de oefenaar de bon nog heeft (één vraag)',
          'bied ruilen in plaats van geld terug — één korte zin, geen lange discussie',
          'vraag kort: “Wilt u ruilen of geld terug?”',
        ]
      : subType === 'service_issue'
        ? [
            'vraag kort naar het bestelnummer of de naam (één detail)',
            'vraag kort: “Wat klopt er precies niet?”',
            'noem per ongeluk een verkeerde levertijd — laat de oefenaar in één zin corrigeren',
          ]
        : [
            'vraag kort: “Sinds wanneer werkt het niet?”',
            'vraag kort welk onderdeel kapot is (één detail)',
            'stel één veilig vervolgstap voor (bijv. omruilen op balie) — geen technische diagnose',
          ]
  if (level === 'A1') return pickOne([pool[0]!, 'één korte verduidelijking: alleen bon óf alleen reden.'], rng)
  return pickOne(pool, rng)
}

function collectOpeningVariants(subType: StoreServiceIssueSubtype): string[] {
  // First turn only: short greeting + offer to help. Receipts, returns detail, etc. come in friction / later turns.
  if (subType === 'store_return') {
    return [
      'Goedemiddag — welkom. Waarmee kan ik u helpen?',
      'Dag — goedendag. Hoe kan ik u van dienst zijn?',
      'Hallo — u bent aan de juiste balie. Waarmee kan ik u helpen?',
      'Goedemiddag — ik help u graag. Waar kunnen we mee beginnen?',
    ]
  }
  if (subType === 'service_issue') {
    return [
      'Dag — goedendag. Waarmee kan ik u helpen?',
      'Goedemiddag — welkom. Hoe kan ik u van dienst zijn?',
      'Hallo — goed u te zien. Waarmee kan ik u helpen?',
      'Goedemiddag — hoe kan ik u helpen?',
    ]
  }
  return [
    'Hallo — welkom bij de servicebalie. Waarmee kan ik u helpen?',
    'Goedemiddag — hoe kan ik u van dienst zijn?',
    'Dag — ik help u graag. Waarmee kan ik u helpen?',
    'Goedemiddag — welkom. Waar kan ik u mee helpen?',
  ]
}

function buildOpeningLine(subType: StoreServiceIssueSubtype, level: StoreServiceIssueLevel, rng: () => number): string {
  const variants = collectOpeningVariants(subType)
  if (level === 'A1') {
    const a1 = variants.slice(0, 3)
    return pickOne(a1.length ? a1 : variants, rng)
  }
  return pickOne(variants, rng)
}

function coreSkillsFor(variation: StoreServiceIssueVariation): string[] {
  if (variation === 'returning_item') {
    return ['return_request', 'return_reason', 'refund_exchange_language', 'natural_reply']
  }
  if (variation === 'complaint') {
    return ['complaint_opening', 'issue_specificity', 'solution_request', 'calm_tone']
  }
  return ['issue_description', 'defect_vocab', 'next_step_question', 'acknowledgment']
}

export function hydrateStoreServiceIssueLearnerSituationSummary(runtime: ScenarioRuntimeConfig): ScenarioRuntimeConfig {
  const normalizedId = runtime.id?.trim().toLowerCase().replace(/-/g, '_')
  if (normalizedId !== STORE_SERVICE_ISSUE_SCENARIO_ID) return runtime
  if (runtime.learnerSituationSummary?.trim()) return runtime
  const subType = normalizeStoreServiceSubtype(runtime.subType) ?? 'store_return'
  const variation = normalizeStoreServiceVariation(runtime.variation) ?? 'returning_item'
  const issueLine = inferIssueLineFromStoreContext(runtime.context, subType)
  return {
    ...runtime,
    learnerSituationSummary: buildLearnerSituationSummary({ subType, variation, issueLine }),
  }
}

function inferIssueLineFromStoreContext(context: string, subType: StoreServiceIssueSubtype): string {
  const firstLine = (context.split('\n')[0] ?? '').trim()
  const lineM = /^Kern van deze run:\s*(.+?)\.?$/i.exec(firstLine)
  if (lineM?.[1]?.trim()) return lineM[1].trim().replace(/\.$/, '')
  const m = /Kern van deze run:\s*([^.]+\.)/i.exec(context)
  if (m?.[1]?.trim()) return m[1].trim().replace(/\.$/, '')
  const pool = poolForSubtype(subType)
  const focus = pickOne([...pool], Math.random)
  return storeServiceIssueIssueLineNl(subType, focus)
}

export function buildStoreServiceIssueScenario(config: BuildParams): ScenarioRuntimeConfig {
  const rng = config.random ?? Math.random
  const subType = normalizeStoreServiceSubtype(config.subType) ?? pickOne(STORE_SERVICE_ISSUE_SUBTYPES, rng)
  const variation =
    normalizeStoreServiceVariation(config.variation as string | undefined) ?? pickOne(STORE_SERVICE_ISSUE_VARIATIONS, rng)
  const detailFocus = normalizeStoreServiceIssueDetailFocus(config.detailFocus as string | undefined)
  const frictionEnabled = clampRoll(rng) < (config.level === 'A1' ? 0.12 : config.level === 'B1' ? 0.22 : 0.18)
  const issueFocus = rollIssueContext(subType, detailFocus, rng)
  const issueLine = storeServiceIssueIssueLineNl(subType, issueFocus)
  const frictionLine = frictionEnabled ? pickFrictionLine(config.level, subType, rng) : 'geen extra wrijving in deze run'
  const goals = buildStoreServiceIssueRuntimeGoals(variation)
  const weights = Object.fromEntries(goals.map((g) => [g.id, g.weight]))
  const persona = PERSONA_BY_SUBTYPE[subType]
  const openingVariants = collectOpeningVariants(subType)

  return {
    id: STORE_SERVICE_ISSUE_SCENARIO_ID,
    scenarioFamily: STORE_SERVICE_ISSUE_SCENARIO_ID,
    title: STORE_SERVICE_ISSUE_TITLE,
    category: STORE_SERVICE_ISSUE_CATEGORY,
    level: config.level,
    subType,
    variation,
    context: buildStoreServiceIssueRuntimeContext({
      subType,
      variation,
      level: config.level,
      issueLine,
      frictionLine,
      frictionEnabled,
      vocabRng: rng,
    }),
    learnerSituationSummary: buildLearnerSituationSummary({ subType, variation, issueLine }),
    goals,
    weights,
    assistantBehavior: buildStoreServiceIssueAssistantBehavior({
      subType,
      variation,
      level: config.level,
      frictionEnabled,
      openingVariants,
    }),
    difficultyAdjustments: storeServiceIssueDifficultyAdjustments(config.level),
    hints: [...getStoreServiceIssueStarterHintsForRuntime(config.level, variation, subType)],
    persona: {
      role: persona.role,
      displayName: persona.displayName,
      sceneLabel: SUBTYPE_LABEL_NL[subType],
      subType,
      variation,
      issueFocus,
      ...(detailFocus ? { detailFocus } : {}),
      frictionEnabled: frictionEnabled ? 'light friction enabled for this run' : 'direct helpful run',
    },
    coreSkills: coreSkillsFor(variation),
    openingLine: buildOpeningLine(subType, config.level, rng),
    storeServiceIssueOpeningContractVersion: STORE_SERVICE_ISSUE_SPEAK_LIVE_OPENING_CONTRACT_VERSION,
    evaluationContract: buildStoreServiceIssueEvaluationContract(variation),
  }
}

export function maybeBuildStoreServiceIssueSpeakLiveScenarioRuntime(params: {
  scenario: ScenarioConfig
  level: StoreServiceIssueLevel
  overrides?: ScenarioSelectionOverrides | null
}): ScenarioRuntimeConfig | null {
  if (params.scenario.slug !== STORE_SERVICE_ISSUE_SCENARIO_ID) return null
  const variation = normalizeStoreServiceVariation(params.overrides?.variation as string | undefined)
  const subType = normalizeStoreServiceSubtype(params.overrides?.subType)
  const detailFocus = normalizeStoreServiceIssueDetailFocus(params.overrides?.detailFocus as string | undefined)
  return buildStoreServiceIssueScenario({
    level: params.level,
    subType: subType ?? undefined,
    variation: variation ?? undefined,
    detailFocus: detailFocus ?? undefined,
  })
}

export function parseStoreServiceIssueScenarioRuntimeConfig(raw: unknown): ScenarioRuntimeConfig | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const candidate = raw as Partial<ScenarioRuntimeConfig>
  if (candidate.id !== STORE_SERVICE_ISSUE_SCENARIO_ID) return null
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
  return hydrateStoreServiceIssueLearnerSituationSummary(candidate as ScenarioRuntimeConfig)
}

export function dutchPersonaForStoreServiceIssueIfNeeded(scenarioSlug: string, persona: PersonaConfig): PersonaConfig {
  if (scenarioSlug !== STORE_SERVICE_ISSUE_SCENARIO_ID) return persona
  if (persona.slug !== 'retail_service_staff') return persona
  return { ...persona, displayName: 'Medewerker' }
}
