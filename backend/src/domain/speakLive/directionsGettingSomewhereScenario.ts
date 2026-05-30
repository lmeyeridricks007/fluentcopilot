import type {
  PersonaConfig,
  ScenarioConfig,
  ScenarioRuntimeConfig,
  ScenarioSelectionOverrides,
} from '../../models/contracts'
import {
  getDirectionsStarterPhrases,
  pickDirectionsDestinationFromPools,
  pickDirectionsLandmarkNl,
  pickDirectionsRoutePhraseNl,
} from './directionsPools'

export const DIRECTIONS_GETTING_SOMEWHERE_SCENARIO_ID = 'directions_getting_somewhere' as const

/** Bump when thread opening / learner-first contract or situation copy must change for existing active threads. */
export const DIRECTIONS_SPEAK_LIVE_OPENING_CONTRACT_VERSION = 3 as const

const POST_LEARNER_ASSISTANT_EXAMPLES =
  '--- Voorbeelden: eerste assistent-antwoord ná de eerste zin van de oefenaar (er staat nog geen assistentbericht in de thread) ---'
export const DIRECTIONS_GETTING_SOMEWHERE_TITLE = 'Directions / getting somewhere' as const
export const DIRECTIONS_GETTING_SOMEWHERE_CATEGORY = 'Getting around' as const

export const DIRECTIONS_DESTINATION_TYPES = [
  'station',
  'bus_stop',
  'tram_stop',
  'supermarket',
  'city_centre',
  'pharmacy',
  'toilet',
  'museum',
  'office_address',
  'platform_exit_entrance',
  'town_hall',
  'restaurant',
  'cafe',
  'hotel',
] as const

export const DIRECTIONS_ENVIRONMENT_TYPES = [
  'street_city_centre',
  'station_area',
  'shopping_area',
  'office_district',
  'inside_public_building',
] as const

export const DIRECTIONS_VARIATIONS = [
  'asking_for_directions',
  'understanding_instructions',
  'confirming_route',
] as const

export type DirectionsLevel = 'A1' | 'A2' | 'B1'
export type DirectionsDestination = (typeof DIRECTIONS_DESTINATION_TYPES)[number]
export type DirectionsEnvironment = (typeof DIRECTIONS_ENVIRONMENT_TYPES)[number]
export type DirectionsVariation = (typeof DIRECTIONS_VARIATIONS)[number]

type BuildParams = {
  level: DirectionsLevel
  subType?: DirectionsDestination | string
  variation?: DirectionsVariation | string
  random?: () => number
}

const ASSISTANT_DUTCH_ONLY =
  'Alle zinnen aan de oefenaar zijn uitsluitend Nederlands; geen Engels (ook geen begroeting in het Engels).'

const TONE_VARIANTS = ['friendly', 'neutral', 'slightly rushed'] as const
type SceneTone = (typeof TONE_VARIANTS)[number]

const DESTINATION_LABEL_NL: Record<DirectionsDestination, string> = {
  station: 'het treinstation',
  bus_stop: 'de bushalte',
  tram_stop: 'de tramhalte',
  supermarket: 'de supermarkt',
  city_centre: 'het centrum',
  pharmacy: 'de apotheek',
  toilet: 'het toilet',
  museum: 'het museum',
  office_address: 'het kantoor / het adres',
  platform_exit_entrance: 'het perron / de uitgang / de ingang van het gebouw',
  town_hall: 'het gemeentehuis / de balie van de gemeente',
  restaurant: 'het restaurant',
  cafe: 'het café',
  hotel: 'het hotel',
}

const ENV_LABEL_NL: Record<DirectionsEnvironment, string> = {
  street_city_centre: 'op straat in het centrum',
  station_area: 'in de stationsbuurt',
  shopping_area: 'in een winkelgebied',
  office_district: 'in een kantorenwijk',
  inside_public_building: 'in een openbaar gebouw',
}

const PERSONA_BY_ENVIRONMENT: Record<
  DirectionsEnvironment,
  { role: string; displayName: string; registerHint: string }
> = {
  street_city_centre: {
    role: 'Voorbijganger / lokale bewoner',
    displayName: 'Voorbijganger',
    registerHint: 'Informeel en kort; praktische straattaal.',
  },
  station_area: {
    role: 'Stationsmedewerker / infobalie',
    displayName: 'Medewerker',
    registerHint: 'Iets formeler en heel duidelijk; korte route.',
  },
  shopping_area: {
    role: 'Winkelend publiek / medewerker in de buurt',
    displayName: 'Iemand ter plaatse',
    registerHint: 'Vriendelijk, niet uitgebreid tutorren.',
  },
  office_district: {
    role: 'Passant of receptionist in de buurt',
    displayName: 'Iemand ter plaatse',
    registerHint: 'Rustig en zakelijk kort.',
  },
  inside_public_building: {
    role: 'Receptionist / baliemedewerker',
    displayName: 'Receptionist',
    registerHint: 'Rustig, duidelijk, servicegericht zonder les te geven.',
  },
}

function clampRoll(rng: () => number): number {
  const n = Number(rng())
  if (!Number.isFinite(n)) return Math.random()
  if (n <= 0) return 0
  if (n >= 1) return 0.999_999
  return n
}

function pickOne<T>(items: readonly T[], rng: () => number): T {
  return items[Math.floor(clampRoll(rng) * items.length)] ?? items[0]
}

function normalizeDestination(raw: string | undefined): DirectionsDestination | undefined {
  const v = (raw ?? '').trim().toLowerCase().replace(/-/g, '_')
  const map: Record<string, DirectionsDestination> = {
    station: 'station',
    bus_stop: 'bus_stop',
    busstop: 'bus_stop',
    tram_stop: 'tram_stop',
    tramstop: 'tram_stop',
    supermarket: 'supermarket',
    city_centre: 'city_centre',
    citycenter: 'city_centre',
    centrum: 'city_centre',
    pharmacy: 'pharmacy',
    apotheek: 'pharmacy',
    toilet: 'toilet',
    wc: 'toilet',
    museum: 'museum',
    office_address: 'office_address',
    office: 'office_address',
    platform_exit_entrance: 'platform_exit_entrance',
    platform: 'platform_exit_entrance',
    uitgang: 'platform_exit_entrance',
    exit: 'platform_exit_entrance',
    town_hall: 'town_hall',
    gemeente: 'town_hall',
    gemeentehuis: 'town_hall',
    stadhuis: 'town_hall',
    restaurant: 'restaurant',
    cafe: 'cafe',
    café: 'cafe',
    hotel: 'hotel',
  }
  return (
    map[v] ??
    ((DIRECTIONS_DESTINATION_TYPES as readonly string[]).includes(v) ? (v as DirectionsDestination) : undefined)
  )
}

function normalizeVariation(raw: string | undefined): DirectionsVariation | undefined {
  const v = (raw ?? '').trim().toLowerCase().replace(/-/g, '_')
  if (v === 'ask' || v === 'asking' || v === 'asking_for_directions') return 'asking_for_directions'
  if (v === 'understand' || v === 'understanding' || v === 'understanding_instructions') return 'understanding_instructions'
  if (v === 'confirm' || v === 'confirming' || v === 'confirming_route') return 'confirming_route'
  return undefined
}

function buildGoals(variation: DirectionsVariation): import('../../models/contracts').ScenarioRuntimeGoal[] {
  if (variation === 'asking_for_directions') {
    return [
      {
        id: 'ask_direction_directly',
        label: 'Vraag duidelijk waar het is of hoe u er komt.',
        weight: 40,
        required: true,
        skill: 'direct_direction_question',
      },
      {
        id: 'name_destination_clearly',
        label: 'Noem de bestemming concreet genoeg om te antwoorden.',
        weight: 25,
        required: true,
        skill: 'destination_wording',
      },
      {
        id: 'use_polite_or_natural_opening',
        label: 'Gebruik een natuurlijke opening of beleefd naderen.',
        weight: 15,
        required: false,
        skill: 'polite_opening',
      },
      {
        id: 'follow_up_or_confirm',
        label: 'Stel een nuttige vervolgvraag of bevestig kort na het antwoord.',
        weight: 20,
        required: false,
        skill: 'follow_up_check',
      },
    ]
  }
  if (variation === 'understanding_instructions') {
    return [
      {
        id: 'handle_directional_language',
        label: 'Laat merken dat u route-instructies begrijpt (richting/taal).',
        weight: 35,
        required: true,
        skill: 'direction_vocab',
      },
      {
        id: 'acknowledge_or_process_route_step',
        label: 'Verwerk minstens één route-stap (echo of check).',
        weight: 30,
        required: false,
        skill: 'route_step_processing',
      },
      {
        id: 'ask_for_clarification_if_needed',
        label: 'Vraag om herhaling of verduidelijking wanneer nodig.',
        weight: 20,
        required: false,
        skill: 'clarification_request',
      },
      {
        id: 'keep_destination_context_clear',
        label: 'Blijf naar dezelfde bestemming verwijzen (in beeld houden).',
        weight: 15,
        required: false,
        skill: 'destination_context',
      },
    ]
  }
  return [
    {
      id: 'confirm_route_correctly',
      label: 'Herhaal of bevestig de route helder (bijv. klopt dat?).',
      weight: 40,
      required: true,
      skill: 'route_confirmation',
    },
    {
      id: 'use_sequence_language',
      label: 'Gebruik volgorde in uw zin (eerst, dan, daarna).',
      weight: 25,
      required: true,
      skill: 'sequencing_words',
    },
    {
      id: 'clarify_uncertainty_directly',
      label: 'Maakt u twijfel meteen concreet (bij welk punt?).',
      weight: 20,
      required: false,
      skill: 'uncertainty_clarification',
    },
    {
      id: 'close_or_acknowledge_naturally',
      label: 'Sluit natuurlijk af met een korte bedanking of bevestiging.',
      weight: 15,
      required: false,
      skill: 'natural_close',
    },
  ]
}

function buildLearnerSituationSummary(params: {
  destination: DirectionsDestination
  environment: DirectionsEnvironment
  variation: DirectionsVariation
  tone: SceneTone
}): string {
  const dest = DESTINATION_LABEL_NL[params.destination]
  const env = ENV_LABEL_NL[params.environment]
  const toneLine =
    params.tone === 'friendly'
      ? 'De ander is vriendelijk en wil kort helpen.'
      : params.tone === 'slightly rushed'
        ? 'Het is even druk — antwoorden blijven kort.'
        : 'De ander is neutraal en praktisch.'
  const varLine =
    params.variation === 'asking_for_directions'
      ? `U begint: vraag in het Nederlands hoe u bij ${dest} komt (${env}). De ander antwoordt pas nadat u gesproken heeft.`
      : params.variation === 'understanding_instructions'
        ? `U begint: zeg kort waar u heen wilt of vraag de weg naar ${dest} (${env}); daarna geeft de ander route-instructies die u volgt.`
        : `U begint: vat in het Nederlands kort samen welke route u denkt te lopen naar ${dest} (${env}); daarna reageert de ander met bevestigen of kleine correctie.`
  return `${varLine} ${toneLine}`.replace(/\s+/g, ' ').trim()
}

function buildContext(params: {
  destination: DirectionsDestination
  environment: DirectionsEnvironment
  variation: DirectionsVariation
  level: DirectionsLevel
  tone: SceneTone
  landmark: string
  rng: () => number
}): string {
  const dest = DESTINATION_LABEL_NL[params.destination]
  const env = ENV_LABEL_NL[params.environment]
  const persona = PERSONA_BY_ENVIRONMENT[params.environment]
  const frictionPool =
    params.level === 'A1'
      ? ['', 'De ander vraagt één keer: “Bedoelt u het centrum?”']
      : [
          '',
          'De ander vraagt kort: “Bedoelt u het grote station?”',
          'De ander geeft twee stappen; de oefenaar moet kort bevestigen.',
          'De ander noemt een herkenningspunt; mag om herhaling vragen.',
        ]
  const friction = pickOne(frictionPool, params.rng).trim()
  const routeExample =
    params.level === 'A1'
      ? `Eenvoudige route: bijvoorbeeld “Ga ${pickDirectionsRoutePhraseNl(params.level, params.rng)}.”`
      : params.level === 'B1'
        ? `Route met 2–3 stappen via ${params.landmark}; mag lichte dubbelzinnigheid (“tweede straat” / “na het stoplicht”).`
        : `Typische 2-stappen route via ${params.landmark} (bijv. rechtdoor, dan links bij het stoplicht).`

  const varBlock =
    params.variation === 'asking_for_directions'
      ? `Modus A (asking): de thread start zonder assistenttekst. Eerste zin = oefenaar vraagt de weg naar ${dest}. Daarna antwoordt de assistent kort (route of verduidelijking).`
      : params.variation === 'understanding_instructions'
        ? `Modus B: thread start zonder assistenttekst. Eerste zin = oefenaar noemt bestemming of vraagt de weg; daarna korte route-instructies naar ${dest}.`
        : `Modus C: thread start zonder assistenttekst. Eerste zin = oefenaar speelt de route kort na; daarna bevestigt of corrigeert de assistent.`

  return [
    `Nederlands wayfinding-scenario: ${DIRECTIONS_GETTING_SOMEWHERE_TITLE} (${DIRECTIONS_GETTING_SOMEWHERE_SCENARIO_ID}).`,
    `Situatie: ${env}. Bestemming: ${dest}.`,
    `Rol assistent: ${persona.role} — ${persona.registerHint}`,
    `Toon: ${params.tone}.`,
    varBlock,
    routeExample,
    friction ? `Lichte wrijving (niveau ${params.level}): ${friction}` : '',
    'Gedrag en variatie staan uitgewerkt in het Engelse instructieblok “Directions scenario · system contract” in deze systeemprompt — volg dat naast deze feiten.',
    'Geen grammaticales of woordenlijsten tijdens het gesprek — alleen natuurlijke dialoog.',
    ASSISTANT_DUTCH_ONLY,
  ]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildAssistantBehavior(params: {
  environment: DirectionsEnvironment
  level: DirectionsLevel
  tone: SceneTone
  frictionEnabled: boolean
  openingVariants: string[]
}): ScenarioRuntimeConfig['assistantBehavior'] {
  const persona = PERSONA_BY_ENVIRONMENT[params.environment]
  const baseStyle = [
    ASSISTANT_DUTCH_ONLY,
    'Geen les geven — alleen in rol antwoorden.',
    'Antwoorden kort (meestal 1 zin, maximaal 2 korte zinnen).',
    'Blijf in de scene; lichte verduidelijking is oké.',
  ]
  const frictionStyle = params.frictionEnabled
    ? ['Soms één korte verduidelijkingsvraag (“Bedoelt u …?”).', 'Mag snel antwoorden zodat de oefenaar “Nog een keer?” kan zeggen.']
    : ['Geen extra wrijving deze run — duidelijk en rechtstreeks.']

  return {
    pace: params.level === 'A1' ? 'extra langzaam en kort' : params.level === 'B1' ? 'natuurlijk tempo' : 'rustig, kort',
    register: persona.registerHint,
    tone: params.tone === 'friendly' ? 'warm en kort' : params.tone === 'slightly rushed' ? 'efficiënt' : 'neutraal',
    responseStyle: baseStyle,
    frictionStyle,
    openingVariants: params.openingVariants,
    recommendationStyle: 'Korte herhaalbare zinnen voor “Opslaan en oefenen”.',
    frictionChance:
      params.level === 'A1' ? '10–12%' : params.level === 'B1' ? '18–22%' : '14–18%',
    guardrails: [
      'Geen Engels naar de oefenaar.',
      'Geen lange monologen.',
      'Geen meta-uitleg over het leersysteem.',
    ],
  }
}

function buildDifficultyAdjustments(level: DirectionsLevel): ScenarioRuntimeConfig['difficultyAdjustments'] {
  if (level === 'A1') {
    return {
      learnerLevel: 'A1',
      responsePacing: 'Zeer korte zinnen, één stap tegelijk.',
      vocabularyRange: 'Alleen kernwoorden voor richting en plek.',
      followUpStyle: 'Maximaal één simpele vervolgvraag.',
      misunderstandingLevel: 'Vermijd misverstand tenzij de oefenaar vaag is.',
    }
  }
  if (level === 'B1') {
    return {
      learnerLevel: 'B1',
      responsePacing: 'Natuurlijke straat- of stationspace.',
      vocabularyRange: 'Meer synoniemen en lichte ambiguïteit toegestaan.',
      followUpStyle: 'Bevestiging en repair verwacht.',
      misunderstandingLevel: 'Lichte dubbelzinnigheid in route mag.',
    }
  }
  return {
    learnerLevel: 'A2',
    responsePacing: 'Normaal kort straattempo.',
    vocabularyRange: 'Gangbare route- en plekwoorden.',
    followUpStyle: 'Korte verduidelijking wanneer nodig.',
    misunderstandingLevel: 'Lichte wrijving toegestaan.',
  }
}

/** After the learner speaks — example route lines. */
function collectRouteInstructionExamples(_environment: DirectionsEnvironment, level: DirectionsLevel, rng: () => number): string[] {
  const lm1 = pickDirectionsLandmarkNl(level, rng)
  const lm2 = pickDirectionsLandmarkNl(level, rng)
  const r1 = pickDirectionsRoutePhraseNl(level, rng)
  const r2 = pickDirectionsRoutePhraseNl(level, rng)
  if (level === 'A1') {
    return [
      `Ga ${r1} tot ${lm1}.`,
      `Bij ${lm1} ${r2}.`,
      'Het is dichtbij — even rechtdoor.',
    ]
  }
  if (level === 'B1') {
    return [
      `Loop ${r1} tot ${lm1}, dan ${r2} en bij ${lm2} nog een keer ${pickDirectionsRoutePhraseNl(level, rng)}.`,
      `Bij ${lm1} slaat u af; daarna ${r2} richting ${lm2} — ongeveer vijf minuten lopen.`,
      `Eerst ${r1}, dan bij het stoplicht ${pickDirectionsRoutePhraseNl(level, rng)}; u ziet ${lm2}.`,
    ]
  }
  return [
    `Ga ${r1} tot ${lm1}, dan links.`,
    `Bij ${lm2} slaat u rechtsaf; het is even lopen.`,
    'Het is vlakbij — eerst deze straat uit, dan ziet u het bord.',
  ]
}

/** Short replies after learner confirms (for openingVariants examples only). */
function collectConfirmReplyExamples(): string[] {
  return [
    'Precies — eerst rechtdoor.',
    'Klopt, bij het stoplicht naar rechts.',
    'Ja, naast het station.',
    'Bijna — eerst rechtdoor, dan links.',
  ]
}

/** Prompt examples: assistant only speaks after the learner’s first line (no seeded assistant turn). */
function buildAssistantOpeningVariantList(
  environment: DirectionsEnvironment,
  variation: DirectionsVariation,
  level: DirectionsLevel,
  rng: () => number
): string[] {
  const routes = collectRouteInstructionExamples(environment, level, rng)
  if (variation === 'asking_for_directions') {
    return [
      POST_LEARNER_ASSISTANT_EXAMPLES,
      'Bedoelt u het grote station of de bushalte?',
      ...routes,
    ]
  }
  if (variation === 'understanding_instructions') {
    return [POST_LEARNER_ASSISTANT_EXAMPLES, ...routes]
  }
  return [POST_LEARNER_ASSISTANT_EXAMPLES, ...collectConfirmReplyExamples()]
}

function buildHints(level: DirectionsLevel, variation: DirectionsVariation): string[] {
  const common = ['Pardon, …', 'Kunt u dat herhalen?', 'Dank u wel.']
  const starters = getDirectionsStarterPhrases(level, variation)
  const merged = [...starters, ...common]
  const seen = new Set<string>()
  const out: string[] = []
  for (const line of merged) {
    const k = line.trim().toLowerCase()
    if (!k || seen.has(k)) continue
    seen.add(k)
    out.push(line.trim())
  }
  return out.slice(0, 10)
}

export function buildDirectionsGettingSomewhereScenario(config: BuildParams): ScenarioRuntimeConfig {
  const rng = config.random ?? Math.random
  const destination =
    normalizeDestination(config.subType as string | undefined) ??
    (normalizeDestination(pickDirectionsDestinationFromPools(rng)) ?? pickOne(DIRECTIONS_DESTINATION_TYPES, rng))
  /** Environment is derived from destination for coherent scenes (URL `subType` is always destination). */
  const environment = ((): DirectionsEnvironment => {
    if (destination === 'station' || destination === 'platform_exit_entrance' || destination === 'bus_stop' || destination === 'tram_stop') {
      return pickOne(['station_area', 'street_city_centre'] as const, rng)
    }
    if (destination === 'supermarket' || destination === 'pharmacy') {
      return pickOne(['shopping_area', 'street_city_centre'] as const, rng)
    }
    if (destination === 'restaurant' || destination === 'cafe' || destination === 'hotel') {
      return pickOne(['shopping_area', 'street_city_centre', 'inside_public_building'] as const, rng)
    }
    if (destination === 'town_hall') {
      return pickOne(['office_district', 'street_city_centre', 'inside_public_building'] as const, rng)
    }
    if (destination === 'office_address' || destination === 'museum' || destination === 'toilet') {
      return pickOne(['inside_public_building', 'office_district', 'street_city_centre'] as const, rng)
    }
    return pickOne(DIRECTIONS_ENVIRONMENT_TYPES, rng)
  })()

  const variation = normalizeVariation(config.variation as string | undefined) ?? pickOne(DIRECTIONS_VARIATIONS, rng)
  const tone = pickOne(TONE_VARIANTS, rng)
  const frictionEnabled = clampRoll(rng) < (config.level === 'A1' ? 0.11 : config.level === 'B1' ? 0.2 : 0.16)
  const landmark = pickDirectionsLandmarkNl(config.level, rng)
  const goals = buildGoals(variation)
  const weights = Object.fromEntries(goals.map((g) => [g.id, g.weight]))
  const persona = PERSONA_BY_ENVIRONMENT[environment]
  const openingVariants = buildAssistantOpeningVariantList(environment, variation, config.level, rng)

  return {
    id: DIRECTIONS_GETTING_SOMEWHERE_SCENARIO_ID,
    title: DIRECTIONS_GETTING_SOMEWHERE_TITLE,
    category: DIRECTIONS_GETTING_SOMEWHERE_CATEGORY,
    level: config.level,
    subType: destination,
    variation,
    context: buildContext({ destination, environment, variation, level: config.level, tone, landmark, rng }),
    learnerSituationSummary: buildLearnerSituationSummary({ destination, environment, variation, tone }),
    goals,
    weights,
    assistantBehavior: buildAssistantBehavior({ environment, level: config.level, tone, frictionEnabled, openingVariants }),
    difficultyAdjustments: buildDifficultyAdjustments(config.level),
    hints: buildHints(config.level, variation),
    persona: {
      role: persona.role,
      displayName: persona.displayName,
      sceneLabel: ENV_LABEL_NL[environment],
      tone,
      frictionEnabled: frictionEnabled ? 'light friction enabled for this run' : 'direct helpful run',
    },
    coreSkills:
      variation === 'asking_for_directions'
        ? ['direct_direction_question', 'destination_wording', 'polite_opening']
        : variation === 'understanding_instructions'
          ? ['direction_vocab', 'route_step_processing', 'clarification_request']
          : ['route_confirmation', 'sequencing_words', 'uncertainty_clarification'],
    directionsLearnerSpeaksFirst: true,
    directionsOpeningContractVersion: DIRECTIONS_SPEAK_LIVE_OPENING_CONTRACT_VERSION,
  }
}

/**
 * True when an existing Speak Live thread should not be resumed: missing runtime, wrong id, contract
 * version too old, or missing learner-first flag (stale assistant-seeded threads).
 */
export function isDirectionsSpeakLiveRuntimeOpeningStale(
  scenarioSlug: string,
  existingState: { scenarioRuntimeConfig?: ScenarioRuntimeConfig | null } | null | undefined
): boolean {
  const slug = scenarioSlug.trim().toLowerCase().replace(/-/g, '_')
  if (slug !== DIRECTIONS_GETTING_SOMEWHERE_SCENARIO_ID) return false
  const rc = existingState?.scenarioRuntimeConfig
  if (!rc || rc.id !== DIRECTIONS_GETTING_SOMEWHERE_SCENARIO_ID) return true
  const v = rc.directionsOpeningContractVersion
  if (typeof v !== 'number' || v < DIRECTIONS_SPEAK_LIVE_OPENING_CONTRACT_VERSION) return true
  return rc.directionsLearnerSpeaksFirst !== true
}

export function maybeBuildDirectionsGettingSomewhereSpeakLiveScenarioRuntime(params: {
  scenario: ScenarioConfig
  level: DirectionsLevel
  overrides?: ScenarioSelectionOverrides | null
}): ScenarioRuntimeConfig | null {
  if (params.scenario.slug.trim().toLowerCase().replace(/-/g, '_') !== DIRECTIONS_GETTING_SOMEWHERE_SCENARIO_ID) {
    return null
  }
  const dest = normalizeDestination(params.overrides?.subType)
  const varNorm = normalizeVariation(params.overrides?.variation)
  return buildDirectionsGettingSomewhereScenario({
    level: params.level,
    subType: dest,
    variation: varNorm,
  })
}

export function parseDirectionsGettingSomewhereScenarioRuntimeConfig(raw: unknown): ScenarioRuntimeConfig | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const candidate = raw as Partial<ScenarioRuntimeConfig>
  if (candidate.id !== DIRECTIONS_GETTING_SOMEWHERE_SCENARIO_ID) return null
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

export function dutchPersonaForDirectionsIfNeeded(scenarioSlug: string, persona: PersonaConfig): PersonaConfig {
  const slug = scenarioSlug.trim().toLowerCase().replace(/-/g, '_')
  if (slug !== DIRECTIONS_GETTING_SOMEWHERE_SCENARIO_ID) return persona
  if (persona.slug !== 'directions_helper') return persona
  return { ...persona, displayName: 'Iemand ter plaatse' }
}
