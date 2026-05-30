import type {
  PersonaConfig,
  ScenarioDifficultyAdjustments,
  ScenarioRuntimeConfig,
  ScenarioSelectionOverrides,
} from '../../models/contracts'
import {
  buildPublicTransportEvaluationContract,
  buildPublicTransportGoals,
  type PublicTransportVariationId,
} from './publicTransportEvaluationContract'
import {
  buildPublicTransportStarterHints,
  buildPublicTransportVocabularySnippet,
  pickPublicTransportDestination,
} from './publicTransportPools'

/** Persisted on Speak Live threads — extends train-station with subtype / task / destination. */
export const PUBLIC_TRANSPORT_SCENARIO_RUNTIME_ID = 'public_transport' as const
export const PUBLIC_TRANSPORT_SCENARIO_FAMILY = 'public_transport' as const
export const PUBLIC_TRANSPORT_TITLE_NL = 'Openbaar vervoer' as const
export const PUBLIC_TRANSPORT_CATEGORY_NL = 'Vervoer' as const

/** Bump when thread opening / learner-first contract changes for existing active threads. */
export const PUBLIC_TRANSPORT_SPEAK_LIVE_OPENING_CONTRACT_VERSION = 2 as const

/**
 * True when an existing Speak Live thread should not be resumed: missing runtime, wrong id, contract
 * version too old, or missing learner-first flag (stale assistant-seeded threads).
 */
export function isPublicTransportSpeakLiveRuntimeOpeningStale(
  scenarioSlug: string,
  existingState: { scenarioRuntimeConfig?: ScenarioRuntimeConfig | null } | null | undefined
): boolean {
  const slug = scenarioSlug.trim().toLowerCase().replace(/-/g, '_')
  if (slug !== 'train_station') return false
  const rc = existingState?.scenarioRuntimeConfig
  if (!rc || rc.id !== PUBLIC_TRANSPORT_SCENARIO_RUNTIME_ID) return true
  const v = rc.publicTransportOpeningContractVersion
  if (typeof v !== 'number' || v < PUBLIC_TRANSPORT_SPEAK_LIVE_OPENING_CONTRACT_VERSION) return true
  return rc.publicTransportLearnerSpeaksFirst !== true
}

export const PUBLIC_TRANSPORT_SUBTYPES = ['train', 'bus', 'tram', 'metro'] as const
export const PUBLIC_TRANSPORT_VARIATIONS = [
  'route_and_platform',
  'buying_ticket',
  'delays_and_disruptions',
] as const

export type PublicTransportLevel = 'A1' | 'A2' | 'B1'
export type PublicTransportSubtype = (typeof PUBLIC_TRANSPORT_SUBTYPES)[number]
export type PublicTransportVariation = (typeof PUBLIC_TRANSPORT_VARIATIONS)[number]

type BuildPublicTransportScenarioConfig = {
  level: PublicTransportLevel
  subType?: PublicTransportSubtype
  variation?: PublicTransportVariation | string
  /** Learner-facing destination (Dutch place name or short phrase). */
  destination?: string | null
  random?: () => number
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

export function normalizePublicTransportSubtype(raw: string | undefined | null): PublicTransportSubtype | undefined {
  const v = (raw ?? '').trim().toLowerCase().replace(/-/g, '_')
  if (v === 'train' || v === 'trein') return 'train'
  if (v === 'bus') return 'bus'
  if (v === 'tram') return 'tram'
  if (v === 'metro' || v === 'underground' || v === 'subway') return 'metro'
  return undefined
}

export function normalizePublicTransportVariation(raw: string | undefined | null): PublicTransportVariation | undefined {
  const v = (raw ?? '').trim().toLowerCase().replace(/-/g, '_')
  if (v === 'route' || v === 'route_and_platform' || v === 'platform' || v === 'perron') return 'route_and_platform'
  if (v === 'ticket' || v === 'buying_ticket' || v === 'kaartje' || v === 'tickets') return 'buying_ticket'
  if (v === 'delay' || v === 'delays' || v === 'delays_and_disruptions' || v === 'disruption' || v === 'vertraging')
    return 'delays_and_disruptions'
  return undefined
}

function normalizeDestinationInput(raw: string | undefined | null): string | undefined {
  const t = (raw ?? '').trim()
  if (!t) return undefined
  return t.slice(0, 120)
}

const SUBTYPE_LABELS_NL: Record<PublicTransportSubtype, string> = {
  train: 'trein',
  bus: 'bus',
  tram: 'tram',
  metro: 'metro',
}

const PERSONA_BY_SUBTYPE: Record<
  PublicTransportSubtype,
  { role: string; displayName: string; sceneStaff: string }
> = {
  train: {
    role: 'Stationsmedewerker / NS-balie',
    displayName: 'Medewerker',
    sceneStaff: 'achter de servicebalie op een Nederlands station',
  },
  bus: {
    role: 'Buschauffeur / medewerker aan de halte',
    displayName: 'Chauffeur',
    sceneStaff: 'bij een bushalte of in de bus',
  },
  tram: {
    role: 'Trammedewerker / conducteur',
    displayName: 'Medewerker',
    sceneStaff: 'bij een tramhalte of in de tram',
  },
  metro: {
    role: 'Metrobediende / loket',
    displayName: 'Medewerker',
    sceneStaff: 'in een metrostation bij de kaartjes of op het perron',
  },
}

function buildDifficultyAdjustments(level: PublicTransportLevel): ScenarioDifficultyAdjustments {
  if (level === 'A1') {
    return {
      learnerLevel: 'A1',
      responsePacing: 'Very short, direct Dutch; one fact per turn where possible.',
      vocabularyRange: 'Minimal route complexity; core OV words only (halte, lijn, kaartje, perron, vertraging).',
      followUpStyle: 'At most one simple follow-up question for the whole exchange when needed.',
      misunderstandingLevel: 'No stacked confusion — answer clearly and briefly.',
    }
  }
  if (level === 'B1') {
    return {
      learnerLevel: 'B1',
      responsePacing: 'Slightly more natural tempo; still compact.',
      vocabularyRange: 'Realistic OV vocabulary; light nuance allowed.',
      followUpStyle: 'Short follow-ups; one mild complication (delay, transfer, or clarify line) may appear once per run.',
      misunderstandingLevel: 'Light friction: one clarifying question (e.g. which line or station) if vague.',
    }
  }
  return {
    learnerLevel: 'A2',
    responsePacing: 'Realistic but short Dutch; brief pauses between ideas.',
    vocabularyRange: 'Everyday OV words (perron, halte, overstappen, vertraging, kaartje).',
    followUpStyle: 'At most one follow-up question when it fits the scene.',
    misunderstandingLevel: 'Light realistic friction (e.g. “Welke lijn bedoelt u?”).',
  }
}

function buildLearnerSituationSummary(params: {
  subType: PublicTransportSubtype
  variation: PublicTransportVariation
  destination: string
}): string {
  const dest = params.destination.trim()
  const youOpen = ' Begin zelf in het Nederlands: u spreekt als eerste met de medewerker.'
  switch (params.variation) {
    case 'route_and_platform':
      if (params.subType === 'train')
        return `Je bent op een station en zoekt de juiste trein naar ${dest} (lijn, perron, richting).${youOpen}`
      if (params.subType === 'bus')
        return `Je bent bij een bushalte en wilt weten welke bus of halte naar ${dest} (en welke richting).${youOpen}`
      if (params.subType === 'tram')
        return `Je staat bij een tramhalte en moet de juiste tram richting ${dest} (lijn en richting).${youOpen}`
      return `Je bent in een metrostation en zoekt de juiste lijn richting ${dest} (richting en overstap).${youOpen}`
    case 'buying_ticket':
      if (params.subType === 'train') return `Je wilt een kaartje voor de trein naar ${dest}.${youOpen}`
      if (params.subType === 'bus') return `Je wilt een buskaartje of kaartje naar ${dest}.${youOpen}`
      if (params.subType === 'tram') return `Je wilt een kaartje voor de tram richting ${dest}.${youOpen}`
      return `Je wilt een metrokaartje of vervoerbewijs voor ${dest}.${youOpen}`
    default:
      if (params.subType === 'train') return `Je bent op het station en vraagt of de trein naar ${dest} op tijd is.${youOpen}`
      if (params.subType === 'bus') return `Je bent bij de halte en vraagt of de bus naar ${dest} rijdt of vertraging heeft.${youOpen}`
      if (params.subType === 'tram')
        return `Je wacht op de tram richting ${dest} en vraagt naar vertraging of omleiding.${youOpen}`
      return `Je bent in de metro en vraagt naar vertraging of een alternatieve route naar ${dest}.${youOpen}`
  }
}

function buildContext(params: {
  subType: PublicTransportSubtype
  variation: PublicTransportVariation
  destination: string
  level: PublicTransportLevel
  rng: () => number
}): string {
  const p = PERSONA_BY_SUBTYPE[params.subType]
  const mode = SUBTYPE_LABELS_NL[params.subType]
  const dest = params.destination.trim()
  const vocabSnippet = buildPublicTransportVocabularySnippet({
    subType: params.subType,
    variation: params.variation,
    level: params.level,
    rng: params.rng,
  })
  const levelHint =
    params.level === 'A1'
      ? 'A1: zeer korte antwoorden; minimaal route-detail; max. één verduidelijkingsvraag voor de hele wissel indien nodig.'
      : params.level === 'B1'
        ? 'B1: iets natuurlijker; één lichte complicatie (vertraging/overstap/verduidelijking) per run is genoeg.'
        : 'A2: realistische korte OV-wissel; hoogstens één vervolgvraag wanneer het past.'
  const variationHint =
    params.variation === 'route_and_platform'
      ? `Taak: route, lijn, perron/halte, instappen/uitstappen — praktisch Nederlands (${mode}). Mag één verduidelijkingsvraag als de bestemming vaag is; daarna één concreet antwoord + eventueel één vervolgstap.`
      : params.variation === 'buying_ticket'
        ? `Taak: kaartje, enkele reis/retour, prijs, pinnen/contant, zones, geldigheid — transactioneel en kort op ${mode}; één kaartje-detail per beurt.`
        : `Taak: vertraging, uitval, omleiding, alternatief, wat nu te doen — rustig en praktisch op ${mode}; niet langdradig.`

  const openingContract =
    'Modus: de thread start zonder assistenttekst. De oefenaar (reiziger) spreekt als eerste in het Nederlands — bijvoorbeeld welke lijn of tram/bus/metro naar de bestemming, welke richting, welk perron/halte, een kaartje, of een vraag over vertraging. Jij antwoordt pas daarna; geen eigen begroeting of “waar moet u heen?” vóór de eerste zin van de oefenaar.'

  return [
    `Scene: openbaar vervoer in Nederland. De oefenaar is reiziger; jij bent ${p.role} ${p.sceneStaff}.`,
    openingContract,
    `Bestemming of focus: ${dest}.`,
    `Woordenbank (indicatief, ${mode}): ${vocabSnippet}.`,
    variationHint,
    levelHint,
    'Antwoord alleen in het Nederlands, in karakter, kort (meestal 1–2 zinnen; B1 max. 3 bij één compact alternatief). Geen grammatica-les; geen vertalingen tenzij de oefenaar daarom vraagt.',
  ].join('\n')
}

const POST_LEARNER_ASSISTANT_OV =
  '--- Voorbeelden: eerste assistent-antwoord ná de eerste zin van de oefenaar (er staat nog geen assistentbericht in de thread) ---'

function buildPostLearnerAssistantOpeningVariantExamples(params: {
  subType: PublicTransportSubtype
  variation: PublicTransportVariation
}): string[] {
  const mode = SUBTYPE_LABELS_NL[params.subType]
  if (params.variation === 'route_and_platform') {
    return [
      POST_LEARNER_ASSISTANT_OV,
      'Goedemiddag — u neemt lijn 12 richting Centraal; hier instappen.',
      `Voor ${mode}: overstappen bij Zuid, daarna verder met lijn 52.`,
      'Het perron staat op het bord bij ingang B — twee minuten lopen.',
      'Welke lijn bedoelt u precies — richting centrum of richting station?',
    ]
  }
  if (params.variation === 'buying_ticket') {
    return [
      POST_LEARNER_ASSISTANT_OV,
      'Goedemiddag — enkele reis of retour?',
      'Dat kost vier euro twintig; u kunt hier pinnen.',
      'Dit kaartje is vandaag geldig tot middernacht.',
    ]
  }
  return [
    POST_LEARNER_ASSISTANT_OV,
    'Er is vijf minuten vertraging; de trein komt eraan.',
    'Deze tram rijdt vandaag niet; neem lijn 7 als alternatief.',
    'Ja, de bus rijdt wel — vertrek over ongeveer tien minuten.',
  ]
}

function buildAssistantBehavior(params: {
  subType: PublicTransportSubtype
  variation: PublicTransportVariation
  level: PublicTransportLevel
  rng: () => number
}): ScenarioRuntimeConfig['assistantBehavior'] {
  const frictionPool =
    params.variation === 'buying_ticket'
      ? [
          'Maximaal één frictiemoment per run: bijv. “Enkele reis of retour?” of “Naar welk station precies?” of “U kunt hier pinnen.”',
        ]
      : params.variation === 'delays_and_disruptions'
        ? [
            'Maximaal één frictiemoment per run: bijv. korte vertraging, “Deze bus rijdt vandaag niet.”, of één alternatieve lijn — niet meerdere tegenslagen tegelijk.',
          ]
        : [
            'Maximaal één frictiemoment per run: bijv. “Welke lijn bedoelt u?” / “Bedoelt u de metro of de tram?” / “U moet eerst uitstappen bij Zuid.”',
          ]

  return {
    pace: 'Kort en servicegericht (1–2 zinnen; B1 max. 3 bij één compact alternatief).',
    register:
      params.subType === 'train'
        ? 'Iets formeler (station); u-vorm natuurlijk; nog steeds kort.'
        : 'U-vorm waar passend; bij bus/tram korter en directer.',
    tone:
      params.variation === 'delays_and_disruptions'
        ? 'Rustig, informatief, praktisch — geen paniekverhaal.'
        : params.variation === 'buying_ticket'
          ? 'Transactioneel, helder, vriendelijk kort.'
          : 'Praktisch, routegericht, OV-realistisch.',
    responseStyle: [
      'Geef één kernantwoord (tijd, lijn, halte, perron, prijs, of storing) zonder lange uitleg; hoogstens één verduidelijkingsvraag als het echt vaag is.',
      `Gebruik woorden die bij ${SUBTYPE_LABELS_NL[params.subType]} horen (subtype-realistisch).`,
      'Niet over-helpen: geen volledige dienstregeling of drie routes tegelijk.',
    ],
    frictionStyle: frictionPool,
    openingVariants: buildPostLearnerAssistantOpeningVariantExamples({
      subType: params.subType,
      variation: params.variation,
    }),
    frictionChance: params.level === 'B1' ? 'medium' : 'low',
    guardrails: [
      'Geen mid-scene vocabulaire-les',
      'Geen Engels tenzij de oefenaar expliciet Engels vraagt',
      'Hoogstens één betekenisvol frictiemoment in de hele run',
    ],
  }
}

export function buildPublicTransportScenario(config: BuildPublicTransportScenarioConfig): ScenarioRuntimeConfig {
  const rng = config.random ?? Math.random
  const subType =
    normalizePublicTransportSubtype(config.subType) ??
    ((): PublicTransportSubtype => {
      const r = clampRoll(rng)
      if (r < 0.42) return 'train'
      if (r < 0.64) return 'bus'
      if (r < 0.82) return 'tram'
      return 'metro'
    })()
  const variation =
    normalizePublicTransportVariation(config.variation) ??
    pickOne(PUBLIC_TRANSPORT_VARIATIONS, rng)
  const destination =
    normalizeDestinationInput(config.destination)?.trim() || pickPublicTransportDestination(rng, variation)
  const v = variation as PublicTransportVariationId
  const goals = buildPublicTransportGoals(v)
  const weights = Object.fromEntries(goals.map((g) => [g.id, g.weight]))
  const personaBase = PERSONA_BY_SUBTYPE[subType]
  const learnerSituationSummary = buildLearnerSituationSummary({ subType, variation, destination })
  const hints = buildPublicTransportStarterHints({
    variation,
    level: config.level,
    subType,
    rng,
  })

  return {
    id: PUBLIC_TRANSPORT_SCENARIO_RUNTIME_ID,
    title: PUBLIC_TRANSPORT_TITLE_NL,
    category: PUBLIC_TRANSPORT_CATEGORY_NL,
    level: config.level,
    subType,
    variation,
    context: buildContext({ subType, variation, destination, level: config.level, rng }),
    learnerSituationSummary,
    goals,
    weights,
    evaluationContract: buildPublicTransportEvaluationContract(v),
    assistantBehavior: buildAssistantBehavior({ subType, variation, level: config.level, rng }),
    difficultyAdjustments: buildDifficultyAdjustments(config.level),
    hints,
    persona: {
      scenarioFamily: PUBLIC_TRANSPORT_SCENARIO_FAMILY,
      transportSubtype: subType,
      transportVariation: variation,
      destinationDisplay: destination,
      role: personaBase.role,
      displayName: personaBase.displayName,
      sceneLabel: `${SUBTYPE_LABELS_NL[subType]} · ${variation}`,
    },
    coreSkills: ['listening', 'speaking', 'clarification', 'transport'],
    publicTransportLearnerSpeaksFirst: true,
    publicTransportOpeningContractVersion: PUBLIC_TRANSPORT_SPEAK_LIVE_OPENING_CONTRACT_VERSION,
    scenarioFamily: PUBLIC_TRANSPORT_SCENARIO_FAMILY,
    destinationDisplay: destination,
  }
}

export function maybeBuildPublicTransportSpeakLiveScenarioRuntime(params: {
  scenario: { slug: string }
  level: PublicTransportLevel
  overrides?: ScenarioSelectionOverrides | null
}): ScenarioRuntimeConfig | null {
  const slug = params.scenario.slug.trim().toLowerCase().replace(/-/g, '_')
  if (slug !== 'train_station') return null
  return buildPublicTransportScenario({
    level: params.level,
    subType: normalizePublicTransportSubtype(params.overrides?.subType ?? undefined),
    variation: normalizePublicTransportVariation(params.overrides?.variation ?? undefined),
    destination: normalizeDestinationInput(params.overrides?.destination ?? undefined),
  })
}

export function hydratePublicTransportLearnerSituationSummary(runtime: ScenarioRuntimeConfig): ScenarioRuntimeConfig {
  if (runtime.id !== PUBLIC_TRANSPORT_SCENARIO_RUNTIME_ID) return runtime
  const summary =
    runtime.learnerSituationSummary?.trim() ||
    buildLearnerSituationSummary({
      subType: normalizePublicTransportSubtype(runtime.subType) ?? 'train',
      variation: normalizePublicTransportVariation(runtime.variation) ?? 'route_and_platform',
      destination:
        runtime.destinationDisplay?.trim() ||
        pickPublicTransportDestination(
          Math.random,
          normalizePublicTransportVariation(runtime.variation) ?? 'route_and_platform',
        ),
    })
  const v = (normalizePublicTransportVariation(runtime.variation) ?? 'route_and_platform') as PublicTransportVariationId
  return {
    ...runtime,
    learnerSituationSummary: summary,
    evaluationContract: runtime.evaluationContract ?? buildPublicTransportEvaluationContract(v),
  }
}

export function parsePublicTransportScenarioRuntimeConfig(raw: unknown): ScenarioRuntimeConfig | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const c = raw as Partial<ScenarioRuntimeConfig>
  if (c.id !== PUBLIC_TRANSPORT_SCENARIO_RUNTIME_ID) return null
  if (
    typeof c.title !== 'string' ||
    typeof c.category !== 'string' ||
    typeof c.level !== 'string' ||
    typeof c.subType !== 'string' ||
    typeof c.variation !== 'string' ||
    typeof c.context !== 'string'
  ) {
    return null
  }
  if (!Array.isArray(c.goals)) return null
  return hydratePublicTransportLearnerSituationSummary(c as ScenarioRuntimeConfig)
}

export function dutchPersonaForPublicTransportIfNeeded(
  scenarioSlug: string,
  runtime: ScenarioRuntimeConfig | null | undefined,
  persona: PersonaConfig
): PersonaConfig {
  const slug = scenarioSlug.trim().toLowerCase().replace(/-/g, '_')
  if (slug !== 'train_station') return persona
  if (!runtime || runtime.id !== PUBLIC_TRANSPORT_SCENARIO_RUNTIME_ID) return persona
  const display =
    typeof runtime.persona?.displayName === 'string' && runtime.persona.displayName.trim()
      ? runtime.persona.displayName.trim()
      : persona.displayName
  const role =
    typeof runtime.persona?.role === 'string' && runtime.persona.role.trim()
      ? runtime.persona.role.trim()
      : persona.role
  return { ...persona, displayName: display, role }
}
