import type {
  PersonaConfig,
  ScenarioConfig,
  ScenarioRuntimeConfig,
  ScenarioSelectionOverrides,
} from '../../models/contracts'

import { getHousingLandlordStarterHintsForRuntime } from './housingLandlordLearnerStarters'
import {
  buildHousingLandlordEvaluationContract,
  buildHousingLandlordRuntimeGoals,
} from './housingLandlordEvaluationContract'
import {
  buildHousingLandlordAssistantBehavior,
  buildHousingLandlordRuntimeContext,
  housingLandlordDifficultyAdjustments,
} from './housingLandlordPrompts'
import { pickOne } from './bookingReservationsVocabularyPools'
import { buildHousingLandlordVocabularyContextBlock } from './housingLandlordVocabularyPools'

export const HOUSING_LANDLORD_SCENARIO_ID = 'housing_landlord' as const
export const HOUSING_LANDLORD_TITLE = 'Housing / landlord' as const
export const HOUSING_LANDLORD_CATEGORY = 'Housing' as const

export const HOUSING_LANDLORD_SUBTYPES = ['landlord', 'rental_agency', 'building_manager'] as const
export const HOUSING_LANDLORD_VARIATIONS = ['reporting_issue', 'asking_rent_contract'] as const

export type HousingLandlordLevel = 'A1' | 'A2' | 'B1'
export type HousingLandlordSubtype = (typeof HOUSING_LANDLORD_SUBTYPES)[number]
export type HousingLandlordVariation = (typeof HOUSING_LANDLORD_VARIATIONS)[number]

export type HousingLandlordIssueFocus =
  | 'heating'
  | 'leak'
  | 'broken_shower'
  | 'electricity_light'
  | 'window_door'
  | 'washing_machine'
  | 'mold_moisture'
  | 'noise_building_simple'
  | 'internet_simple'

export type HousingLandlordContractFocus =
  | 'rent_due_date'
  | 'deposit_borg'
  | 'notice_period'
  | 'contract_duration'
  | 'utilities_included'
  | 'maintenance_responsibility'
  | 'payment_method'
  | 'rent_change_simple'

export type HousingLandlordDetailFocus = HousingLandlordIssueFocus | HousingLandlordContractFocus

type BuildParams = {
  level: HousingLandlordLevel
  subType?: HousingLandlordSubtype
  variation?: HousingLandlordVariation | string
  detailFocus?: HousingLandlordDetailFocus | string
  random?: () => number
}

const SUBTYPE_LABEL_NL: Record<HousingLandlordSubtype, string> = {
  landlord: 'directe verhuurder — korte, praktische afstemming',
  rental_agency: 'verhuurmakelaar — iets formeler, contract en betaling',
  building_manager: 'gebouwbeheer — onderhoud en toegang',
}

const PERSONA_BY_SUBTYPE: Record<
  HousingLandlordSubtype,
  { role: string; displayName: string; openingLine: string }
> = {
  landlord: {
    role: 'Verhuurder',
    displayName: 'Verhuurder',
    openingLine: 'Dag — u belt over de woning. Waar kan ik u mee helpen?',
  },
  rental_agency: {
    role: 'Medewerker verhuur',
    displayName: 'Makelaar',
    openingLine: 'Goedemiddag — makelaardij, waarmee kan ik u helpen over uw huur?',
  },
  building_manager: {
    role: 'Gebouwbeheerder',
    displayName: 'Beheer',
    openingLine: 'Hallo — gebouwbeheer, goedemiddag. Waarmee kan ik u helpen?',
  },
}

const ISSUE_FOCUS_POOL: readonly HousingLandlordIssueFocus[] = [
  'heating',
  'leak',
  'broken_shower',
  'electricity_light',
  'window_door',
  'washing_machine',
  'mold_moisture',
  'noise_building_simple',
  'internet_simple',
]

const CONTRACT_FOCUS_POOL: readonly HousingLandlordContractFocus[] = [
  'rent_due_date',
  'deposit_borg',
  'notice_period',
  'contract_duration',
  'utilities_included',
  'maintenance_responsibility',
  'payment_method',
  'rent_change_simple',
]

const HOUSING_SITUATION_KEYS = ['at_home', 'message_followup', 'first_contact', 'urgent_tone'] as const
type HousingSituationKey = (typeof HOUSING_SITUATION_KEYS)[number]

function issueFocusLineNl(focus: HousingLandlordIssueFocus): string {
  const m: Record<HousingLandlordIssueFocus, string> = {
    heating: 'Het gaat om verwarming of warm water in de woning.',
    leak: 'Het gaat om water of een lek in de woning.',
    broken_shower: 'Het gaat om de douche of het bad.',
    electricity_light: 'Het gaat om stroom, verlichting of een groepenkast.',
    window_door: 'Het gaat om een raam, deur of slot.',
    washing_machine: 'Het gaat om de wasmachine of aansluiting.',
    mold_moisture: 'Het gaat om schimmel, vocht of slechte ventilatie in de woning.',
    noise_building_simple: 'Het gaat om geluid of iets in het gebouw (licht, praktisch).',
    internet_simple: 'Het gaat om internet of wifi in de woning.',
  }
  return m[focus]
}

function contractFocusLineNl(focus: HousingLandlordContractFocus): string {
  const m: Record<HousingLandlordContractFocus, string> = {
    rent_due_date: 'Het gaat om wanneer en hoe de huur betaald moet worden.',
    deposit_borg: 'Het gaat om de borg en wanneer of hoe die terugkomt.',
    notice_period: 'Het gaat om opzeggen en de opzegtermijn.',
    contract_duration: 'Het gaat om de duur van het huurcontract.',
    utilities_included: 'Het gaat over wat wel of niet in de huurprijs zit (gas, licht, service).',
    maintenance_responsibility: 'Het gaat over wie welke reparaties doet of regelt.',
    payment_method: 'Het gaat over de betaalwijze of rekening voor de huur.',
    rent_change_simple: 'Het gaat kort over een mogelijke huuraanpassing of aankondiging (niet juridisch).',
  }
  return m[focus]
}

function situationLineNl(key: HousingSituationKey): string {
  const m: Record<HousingSituationKey, string> = {
    at_home: 'Je bent thuis en belt of appt kort met je contactpersoon.',
    message_followup: 'Je volgt een eerdere melding kort op.',
    first_contact: 'Dit is je eerste korte contact over dit onderwerp.',
    urgent_tone: 'Het voelt voor jou redelijk urgent; je blijft rustig en duidelijk.',
  }
  return m[key]
}

function clampRoll(rng: () => number): number {
  const n = Number(rng())
  if (!Number.isFinite(n)) return Math.random()
  if (n <= 0) return 0
  if (n >= 1) return 0.999_999
  return n
}

export function normalizeHousingLandlordSubtype(raw: string | undefined): HousingLandlordSubtype | undefined {
  const v = (raw ?? '').trim().toLowerCase().replace(/-/g, '_')
  if (v === 'landlord' || v === 'verhuurder' || v === 'owner') return 'landlord'
  if (v === 'rental_agency' || v === 'agency' || v === 'makelaar' || v === 'verhuurmakelaar') return 'rental_agency'
  if (v === 'building_manager' || v === 'beheer' || v === 'gebouw' || v === 'vve') return 'building_manager'
  return (HOUSING_LANDLORD_SUBTYPES as readonly string[]).includes(v) ? (v as HousingLandlordSubtype) : undefined
}

export function normalizeHousingLandlordVariation(raw: string | undefined): HousingLandlordVariation | undefined {
  const v = (raw ?? '').trim().toLowerCase().replace(/-/g, '_')
  if (v === 'report' || v === 'issue' || v === 'reporting' || v === 'reporting_issue' || v === 'repair') {
    return 'reporting_issue'
  }
  if (v === 'rent' || v === 'contract' || v === 'asking_rent_contract' || v === 'huur' || v === 'borg') {
    return 'asking_rent_contract'
  }
  return (HOUSING_LANDLORD_VARIATIONS as readonly string[]).includes(v) ? (v as HousingLandlordVariation) : undefined
}

export function normalizeHousingLandlordDetailFocus(
  raw: string | undefined,
  variation: HousingLandlordVariation
): HousingLandlordDetailFocus | undefined {
  const x = (raw ?? '').trim().toLowerCase().replace(/-/g, '_')
  if (!x) return undefined
  if (variation === 'reporting_issue') {
    const map: Record<string, HousingLandlordIssueFocus> = {
      heating: 'heating',
      verwarming: 'heating',
      warm_water: 'heating',
      warmwater: 'heating',
      leak: 'leak',
      lek: 'leak',
      waterlek: 'leak',
      waterprobleem: 'leak',
      water_problem: 'leak',
      broken_shower: 'broken_shower',
      douche: 'broken_shower',
      shower: 'broken_shower',
      electricity_light: 'electricity_light',
      licht: 'electricity_light',
      stroom: 'electricity_light',
      elektriciteit: 'electricity_light',
      window_door: 'window_door',
      raam: 'window_door',
      deur: 'window_door',
      slot: 'window_door',
      washing_machine: 'washing_machine',
      wasmachine: 'washing_machine',
      mold_moisture: 'mold_moisture',
      schimmel: 'mold_moisture',
      vocht: 'mold_moisture',
      meeldouw: 'mold_moisture',
      noise_building_simple: 'noise_building_simple',
      lawaai: 'noise_building_simple',
      geluid: 'noise_building_simple',
      gebouw: 'noise_building_simple',
      internet_simple: 'internet_simple',
      wifi: 'internet_simple',
      internet: 'internet_simple',
    }
    const hit = map[x]
    return hit ?? ((ISSUE_FOCUS_POOL as readonly string[]).includes(x) ? (x as HousingLandlordIssueFocus) : undefined)
  }
  const map: Record<string, HousingLandlordContractFocus> = {
    rent_due_date: 'rent_due_date',
    huur: 'rent_due_date',
    huurbetaling: 'rent_due_date',
    deposit_borg: 'deposit_borg',
    borg: 'deposit_borg',
    notice_period: 'notice_period',
    opzeg: 'notice_period',
    opzegtermijn: 'notice_period',
    contract_duration: 'contract_duration',
    duur: 'contract_duration',
    utilities_included: 'utilities_included',
    inclusief: 'utilities_included',
    servicekosten: 'utilities_included',
    maintenance_responsibility: 'maintenance_responsibility',
    onderhoud: 'maintenance_responsibility',
    maintenance: 'maintenance_responsibility',
    payment_method: 'payment_method',
    betaling: 'payment_method',
    rent_change_simple: 'rent_change_simple',
    verhoging: 'rent_change_simple',
    huurverhoging: 'rent_change_simple',
  }
  const hit = map[x]
  return hit ?? ((CONTRACT_FOCUS_POOL as readonly string[]).includes(x) ? (x as HousingLandlordContractFocus) : undefined)
}

function rollIssueFocus(
  subType: HousingLandlordSubtype,
  requested: HousingLandlordIssueFocus | undefined,
  rng: () => number
): HousingLandlordIssueFocus {
  const poolBase =
    subType === 'building_manager'
      ? ISSUE_FOCUS_POOL.filter((f) => f !== 'internet_simple')
      : [...ISSUE_FOCUS_POOL]
  if (requested && (ISSUE_FOCUS_POOL as readonly string[]).includes(requested)) {
    if (subType === 'building_manager' && requested === 'internet_simple') {
      return pickOne(poolBase.length ? poolBase : [...ISSUE_FOCUS_POOL], rng)
    }
    return requested
  }
  return pickOne(poolBase.length ? poolBase : [...ISSUE_FOCUS_POOL], rng)
}

function rollContractFocus(
  requested: HousingLandlordContractFocus | undefined,
  rng: () => number
): HousingLandlordContractFocus {
  if (requested && (CONTRACT_FOCUS_POOL as readonly string[]).includes(requested)) return requested
  return pickOne([...CONTRACT_FOCUS_POOL], rng)
}

function rollSituation(rng: () => number): HousingSituationKey {
  return pickOne([...HOUSING_SITUATION_KEYS], rng)
}

function pickFrictionLine(
  level: HousingLandlordLevel,
  subType: HousingLandlordSubtype,
  variation: HousingLandlordVariation,
  rng: () => number
): string {
  const issuePool = [
    'vraag kort sinds wanneer het probleem speelt (één vraag)',
    'vraag kort of het dringend is',
    'vraag of de oefenaar al iets eenvoudigs heeft geprobeerd (één suggestie)',
    'vraag wanneer iemand langs mag komen',
  ]
  const contractPool = [
    'vraag kort of de oefenaar de huur of de borg bedoelt',
    'vraag om één ontbrekend contractdetail (datum of bedrag)',
    'vraag of het om servicekosten of kale huur gaat',
  ]
  const pool = variation === 'reporting_issue' ? issuePool : contractPool
  if (subType === 'rental_agency' && variation === 'asking_rent_contract') {
    return pickOne(
      [
        'vraag kort of het om schriftelijke opzegging of alleen een vraag gaat',
        ...contractPool.slice(0, 2),
      ],
      rng
    )
  }
  if (level === 'A1') return pickOne([pool[0]!, pool[1]!], rng)
  return pickOne(pool, rng)
}

function collectOpeningVariants(subType: HousingLandlordSubtype): string[] {
  // Eerste beurt: begroeting + hulp aanbod; inhoudelijke vragen via wrijving of later.
  if (subType === 'landlord') {
    return [
      'Dag — u spreekt met de verhuurder. Waarmee kan ik u helpen?',
      'Hallo — goedemiddag. Waar kan ik u mee helpen over de woning?',
      'Dag — welkom. Hoe kan ik u van dienst zijn?',
      'Hallo — even kort gebeld. Waarmee kan ik u helpen?',
    ]
  }
  if (subType === 'rental_agency') {
    return [
      'Goedemiddag — makelaardij, waarmee kan ik u helpen?',
      'Dag — welkom. Hoe kan ik u van dienst zijn over uw huur?',
      'Hallo — goedemiddag. Waar kan ik u mee helpen?',
      'Goedemiddag — goed u te spreken. Waarmee kan ik u helpen?',
    ]
  }
  return [
    'Hallo — gebouwbeheer, goedemiddag. Waarmee kan ik u helpen?',
    'Dag — gebouwbeheer. Hoe kan ik u van dienst zijn?',
    'Hallo — welkom. Waar kan ik u mee helpen in het pand?',
    'Dag — goedemiddag. Waarmee kan ik u vandaag helpen?',
  ]
}

function buildOpeningLine(subType: HousingLandlordSubtype, level: HousingLandlordLevel, rng: () => number): string {
  const variants = collectOpeningVariants(subType)
  if (level === 'A1') return pickOne(variants.slice(0, 3), rng)
  return pickOne(variants, rng)
}

function coreSkillsFor(variation: HousingLandlordVariation): string[] {
  if (variation === 'reporting_issue') {
    return ['describe_issue', 'home_repair_vocabulary', 'request_action', 'confirm_next_step']
  }
  return ['rent_contract_question', 'payment_context', 'clarification', 'practical_tone']
}

function parseFocusAndSituationFromContext(context: string): { focus: string | null; situation: string | null } {
  const m = /Kern van deze run:\s*(.+?)\s*Situatie:\s*(.+?)(?:\.|$)/i.exec(context.replace(/\s+/g, ' ').trim())
  if (!m) return { focus: null, situation: null }
  return { focus: m[1]?.trim() ?? null, situation: m[2]?.trim() ?? null }
}

function inferIssueFocusFromFocusLine(text: string, rng: () => number): HousingLandlordIssueFocus {
  const t = text.toLowerCase()
  if (/verwarm|warm water|koud in huis/i.test(t)) return 'heating'
  if (/schimmel|vocht|meeldouw|zwarte plekken/i.test(t)) return 'mold_moisture'
  if (/lek|water|druppel|gootsteen|plafond|waterprobleem/i.test(t)) return 'leak'
  if (/douche|bad/i.test(t)) return 'broken_shower'
  if (/stroom|lamp|groep|elektriciteit/i.test(t)) return 'electricity_light'
  if (/raam|deur|slot/i.test(t)) return 'window_door'
  if (/wasmachine|was\b/i.test(t)) return 'washing_machine'
  if (/lawaai|geluid|buren/i.test(t)) return 'noise_building_simple'
  if (/wifi|internet/i.test(t)) return 'internet_simple'
  return pickOne([...ISSUE_FOCUS_POOL], rng)
}

function inferContractFocusFromFocusLine(text: string, rng: () => number): HousingLandlordContractFocus {
  const t = text.toLowerCase()
  if (/betaal|datum|einde van de maand|per de/i.test(t)) return 'rent_due_date'
  if (/borg|deposit/i.test(t)) return 'deposit_borg'
  if (/opzeg|opzegtermijn/i.test(t)) return 'notice_period'
  if (/duur van het|contractduur|looptijd/i.test(t)) return 'contract_duration'
  if (/inclusief|service|gas en licht|nutsvoorzieningen/i.test(t)) return 'utilities_included'
  if (/reparatie|onderhoud|wie doet/i.test(t)) return 'maintenance_responsibility'
  if (/rekening|betaalwijze|incasso/i.test(t)) return 'payment_method'
  if (/huurverhoging|aanpassing|hoger/i.test(t)) return 'rent_change_simple'
  return pickOne([...CONTRACT_FOCUS_POOL], rng)
}

function buildLearnerSituationSummary(params: {
  subType: HousingLandlordSubtype
  variation: HousingLandlordVariation
  focusLine: string
  situationLine: string
}): string {
  const role =
    params.variation === 'reporting_issue'
      ? 'Je meldt een praktisch probleem in je woning en vraagt om hulp of een volgende stap.'
      : 'Je stelt een duidelijke vraag over huur, contract, borg of betaling.'
  return `${role} Setting: ${SUBTYPE_LABEL_NL[params.subType]}. ${params.focusLine} ${params.situationLine}`.replace(
    /\s+/g,
    ' '
  ).trim()
}

export function hydrateHousingLandlordLearnerSituationSummary(runtime: ScenarioRuntimeConfig): ScenarioRuntimeConfig {
  const normalizedId = runtime.id?.trim().toLowerCase().replace(/-/g, '_')
  if (normalizedId !== HOUSING_LANDLORD_SCENARIO_ID) return runtime
  if (runtime.learnerSituationSummary?.trim()) return runtime
  const subType = normalizeHousingLandlordSubtype(runtime.subType) ?? 'landlord'
  const variation = normalizeHousingLandlordVariation(runtime.variation) ?? 'reporting_issue'
  const parsed = parseFocusAndSituationFromContext(runtime.context ?? '')
  const focusLine =
    parsed.focus ??
    (variation === 'reporting_issue'
      ? issueFocusLineNl(inferIssueFocusFromFocusLine(runtime.context ?? '', Math.random))
      : contractFocusLineNl(inferContractFocusFromFocusLine(runtime.context ?? '', Math.random)))
  const situationLine = parsed.situation ?? situationLineNl('at_home')
  return {
    ...runtime,
    learnerSituationSummary: buildLearnerSituationSummary({ subType, variation, focusLine, situationLine }),
  }
}

export function buildHousingLandlordScenario(config: BuildParams): ScenarioRuntimeConfig {
  const rng = config.random ?? Math.random
  const subType = normalizeHousingLandlordSubtype(config.subType) ?? pickOne(HOUSING_LANDLORD_SUBTYPES, rng)
  const variation =
    normalizeHousingLandlordVariation(config.variation as string | undefined) ??
    pickOne(HOUSING_LANDLORD_VARIATIONS, rng)

  const normalizedRequested = normalizeHousingLandlordDetailFocus(config.detailFocus as string | undefined, variation)
  const requestedIssue =
    normalizedRequested && (ISSUE_FOCUS_POOL as readonly string[]).includes(normalizedRequested)
      ? (normalizedRequested as HousingLandlordIssueFocus)
      : undefined
  const requestedContract =
    normalizedRequested && (CONTRACT_FOCUS_POOL as readonly string[]).includes(normalizedRequested)
      ? (normalizedRequested as HousingLandlordContractFocus)
      : undefined

  const detailFocus: HousingLandlordDetailFocus =
    variation === 'reporting_issue'
      ? rollIssueFocus(subType, requestedIssue, rng)
      : rollContractFocus(requestedContract, rng)

  const focusLine =
    variation === 'reporting_issue'
      ? issueFocusLineNl(detailFocus as HousingLandlordIssueFocus)
      : contractFocusLineNl(detailFocus as HousingLandlordContractFocus)
  const situationKey = rollSituation(rng)
  const situationLine = situationLineNl(situationKey)
  const frictionEnabled = clampRoll(rng) < (config.level === 'A1' ? 0.14 : config.level === 'B1' ? 0.24 : 0.18)
  const frictionLine = frictionEnabled ? pickFrictionLine(config.level, subType, variation, rng) : 'geen extra wrijving in deze run'

  const goals = buildHousingLandlordRuntimeGoals(variation)
  const weights = Object.fromEntries(goals.map((g) => [g.id, g.weight]))
  const persona = PERSONA_BY_SUBTYPE[subType]
  const openingVariants = collectOpeningVariants(subType)

  return {
    id: HOUSING_LANDLORD_SCENARIO_ID,
    scenarioFamily: HOUSING_LANDLORD_SCENARIO_ID,
    title: HOUSING_LANDLORD_TITLE,
    category: HOUSING_LANDLORD_CATEGORY,
    level: config.level,
    subType,
    variation,
    context: buildHousingLandlordRuntimeContext({
      subType,
      variation,
      level: config.level,
      focusLine,
      situationLine,
      frictionLine,
      frictionEnabled,
      vocabularyAnchorsBlock: buildHousingLandlordVocabularyContextBlock({
        variation,
        detailFocus,
        level: config.level,
        rng,
      }),
    }),
    learnerSituationSummary: buildLearnerSituationSummary({ subType, variation, focusLine, situationLine }),
    goals,
    weights,
    assistantBehavior: buildHousingLandlordAssistantBehavior({
      subType,
      variation,
      level: config.level,
      frictionEnabled,
      openingVariants,
    }),
    difficultyAdjustments: housingLandlordDifficultyAdjustments(config.level),
    hints: [...getHousingLandlordStarterHintsForRuntime(config.level, variation, subType, detailFocus)],
    persona: {
      role: persona.role,
      displayName: persona.displayName,
      sceneLabel: SUBTYPE_LABEL_NL[subType],
      subType,
      variation,
      detailFocus,
      housingSituation: situationKey,
      frictionEnabled: frictionEnabled ? 'light friction enabled for this run' : 'direct helpful run',
    },
    coreSkills: coreSkillsFor(variation),
    openingLine: buildOpeningLine(subType, config.level, rng),
    evaluationContract: buildHousingLandlordEvaluationContract(variation),
  }
}

export function maybeBuildHousingLandlordSpeakLiveScenarioRuntime(params: {
  scenario: ScenarioConfig
  level: HousingLandlordLevel
  overrides?: ScenarioSelectionOverrides | null
}): ScenarioRuntimeConfig | null {
  if (params.scenario.slug !== HOUSING_LANDLORD_SCENARIO_ID) return null
  const variation = normalizeHousingLandlordVariation(params.overrides?.variation as string | undefined)
  const subType = normalizeHousingLandlordSubtype(params.overrides?.subType)
  const vResolved = variation ?? 'reporting_issue'
  const detailFocus = normalizeHousingLandlordDetailFocus(params.overrides?.detailFocus as string | undefined, vResolved)
  return buildHousingLandlordScenario({
    level: params.level,
    subType: subType ?? undefined,
    variation: variation ?? undefined,
    detailFocus: detailFocus ?? undefined,
  })
}

export function parseHousingLandlordScenarioRuntimeConfig(raw: unknown): ScenarioRuntimeConfig | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const candidate = raw as Partial<ScenarioRuntimeConfig>
  if (candidate.id !== HOUSING_LANDLORD_SCENARIO_ID) return null
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
  return hydrateHousingLandlordLearnerSituationSummary(candidate as ScenarioRuntimeConfig)
}

export function dutchPersonaForHousingLandlordIfNeeded(
  scenarioSlug: string,
  runtime: ScenarioRuntimeConfig | null | undefined,
  persona: PersonaConfig
): PersonaConfig {
  const slug = scenarioSlug.trim().toLowerCase().replace(/-/g, '_')
  if (slug !== HOUSING_LANDLORD_SCENARIO_ID) return persona
  if (persona.slug !== 'housing_contact_staff') return persona
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
