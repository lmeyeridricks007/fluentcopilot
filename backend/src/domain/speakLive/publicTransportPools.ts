/** Aligned with {@link import('./publicTransportScenario').PublicTransportVariation} — kept local to avoid circular imports. */
export type PublicTransportVariationKey = 'route_and_platform' | 'buying_ticket' | 'delays_and_disruptions'
export type PublicTransportSubtypeKey = 'train' | 'bus' | 'tram' | 'metro'
export type PublicTransportLevelKey = 'A1' | 'A2' | 'B1'

/** Named hubs and generic transport anchors (Dutch). */
export const PUBLIC_TRANSPORT_DESTINATION_HUBS = [
  'Amsterdam Centraal',
  'Utrecht Centraal',
  'station',
  'perron vijf',
  'metrostation',
] as const

/** Everyday destinations / places. */
export const PUBLIC_TRANSPORT_DESTINATION_CITY = [
  'centrum',
  'museum',
  'apotheek',
  'supermarkt',
  'kantoor',
  'hotel',
] as const

/** Stops and line-style targets. */
export const PUBLIC_TRANSPORT_DESTINATION_STOPS_LINES = [
  'halte 4',
  'halte vier',
  'lijn 12',
  'metro 52',
  'bus 21',
] as const

export type PublicTransportDestinationCategory = 'hub' | 'city' | 'stop_line'

export const PUBLIC_TRANSPORT_DESTINATION_POOLS: Record<
  PublicTransportDestinationCategory,
  readonly string[]
> = {
  hub: PUBLIC_TRANSPORT_DESTINATION_HUBS,
  city: PUBLIC_TRANSPORT_DESTINATION_CITY,
  stop_line: PUBLIC_TRANSPORT_DESTINATION_STOPS_LINES,
}

export const PUBLIC_TRANSPORT_VOCAB_TRAIN = [
  'perron',
  'spoor',
  'vertrekt',
  'overstappen',
  'vertraging',
] as const

export const PUBLIC_TRANSPORT_VOCAB_BUS = [
  'halte',
  'buslijn',
  'uitstappen',
  'chauffeur',
] as const

export const PUBLIC_TRANSPORT_VOCAB_TRAM = ['tramhalte', 'lijn', 'uitstappen'] as const

export const PUBLIC_TRANSPORT_VOCAB_METRO = ['metrostation', 'ingang', 'lijn', 'overstappen'] as const

export const PUBLIC_TRANSPORT_VOCABULARY_BY_SUBTYPE: Record<PublicTransportSubtypeKey, readonly string[]> = {
  train: PUBLIC_TRANSPORT_VOCAB_TRAIN,
  bus: PUBLIC_TRANSPORT_VOCAB_BUS,
  tram: PUBLIC_TRANSPORT_VOCAB_TRAM,
  metro: PUBLIC_TRANSPORT_VOCAB_METRO,
}

/** Ticket / counter language (Dutch). */
export const PUBLIC_TRANSPORT_TICKET_TERMS = [
  'kaartje',
  'enkele reis',
  'retour',
  'geldig',
  'pinnen',
  'contant',
  'prijs',
  'zone',
] as const

/** Disruption language — core (all levels). */
export const PUBLIC_TRANSPORT_DISRUPTION_TERMS_CORE = [
  'vertraging',
  'rijdt niet',
  'storing',
  'overstappen',
  'andere route',
  'alternatief',
  'later',
] as const

/** Stronger / formal disruption wording — B1 only in prompts. */
export const PUBLIC_TRANSPORT_DISRUPTION_TERMS_B1 = ['geannuleerd', 'uitval', 'omleiding'] as const

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

/** Weighted pick across destination categories (hubs common, stop/line for route tasks). */
export function pickPublicTransportDestination(rng: () => number, variation?: PublicTransportVariationKey): string {
  const r = clampRoll(rng)
  let cat: PublicTransportDestinationCategory
  if (variation === 'route_and_platform') {
    if (r < 0.38) cat = 'hub'
    else if (r < 0.72) cat = 'city'
    else cat = 'stop_line'
  } else if (variation === 'buying_ticket') {
    if (r < 0.55) cat = 'hub'
    else if (r < 0.88) cat = 'city'
    else cat = 'stop_line'
  } else {
    if (r < 0.45) cat = 'hub'
    else if (r < 0.8) cat = 'city'
    else cat = 'stop_line'
  }
  return pickOne(PUBLIC_TRANSPORT_DESTINATION_POOLS[cat], rng)
}

/** Starter / hint lines by variation and CEFR band (Dutch). */
export const PUBLIC_TRANSPORT_STARTERS_BY_VARIATION_AND_LEVEL: Record<
  PublicTransportVariationKey,
  Record<PublicTransportLevelKey, readonly string[]>
> = {
  route_and_platform: {
    A1: ['Waar is het perron?', 'Welke lijn?', 'Naar centrum?', 'Hier uitstappen?'],
    A2: [
      'Van welk perron vertrekt de trein?',
      'Welke tram moet ik nemen, en welke richting?',
      'Welke bus gaat naar het hotel, en waar stap ik in?',
      'Moet ik hier uitstappen?',
    ],
    B1: [
      'Kunt u zeggen van welk perron de intercity vertrekt?',
      'Welke tramlijn gaat richting het centrum, en waar stap ik in?',
      'Is dit halte vier, of moet ik nog een halte verder?',
      'Moet ik hier uitstappen of pas bij het volgende station?',
    ],
  },
  buying_ticket: {
    A1: ['Kaartje, alstublieft.', 'Naar Utrecht.', 'Hoeveel euro?', 'Ik pin.'],
    A2: [
      'Ik wil een kaartje naar Utrecht.',
      'Een retour naar Amsterdam, alstublieft.',
      'Hoeveel kost het?',
      'Kan ik hier pinnen?',
    ],
    B1: [
      'Ik wil graag een enkele reis naar Utrecht Centraal — wat adviseert u?',
      'Mag ik een retour naar Amsterdam, en is er korting met mijn OV?',
      'Wat is de prijs als ik contactloos betaal?',
      'Is dit kaartje ook geldig voor de metro in Amsterdam?',
    ],
  },
  delays_and_disruptions: {
    A1: ['Vertraging?', 'Rijdt de bus?', 'Andere lijn?', 'Overstappen?'],
    A2: [
      'Heeft de trein vertraging?',
      'Rijdt deze bus vandaag?',
      'Welke route moet ik nu nemen?',
      'Moet ik overstappen?',
    ],
    B1: [
      'Ik hoorde dat er een storing is — heeft mijn trein ook vertraging?',
      'Rijdt deze buslijn vandaag wel, of is de dienst uitgevallen?',
      'Welke alternatieve route raadt u aan nu de metro niet rijdt?',
      'Moet ik overstappen bij Zuid, of is er een directere optie?',
    ],
  },
}

function shuffleInPlace<T>(arr: T[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(clampRoll(rng) * (i + 1))
    ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
  }
}

/**
 * Ordered starter suggestions for the runtime `hints` → scenario `starterSuggestions`.
 * A1: fewest items; A2: standard set; B1: full set (slightly longer lines).
 */
export function buildPublicTransportStarterHints(params: {
  variation: PublicTransportVariationKey
  level: PublicTransportLevelKey
  subType: PublicTransportSubtypeKey
  rng: () => number
}): string[] {
  const base = [...PUBLIC_TRANSPORT_STARTERS_BY_VARIATION_AND_LEVEL[params.variation][params.level]]
  const modeWord =
    params.subType === 'train' ? 'trein' : params.subType === 'bus' ? 'bus' : params.subType === 'tram' ? 'tram' : 'metro'
  if (params.variation === 'route_and_platform' && (params.subType === 'bus' || params.subType === 'metro')) {
    base.push(`Welke ${modeWord} moet ik nemen?`)
  }
  if (params.variation === 'route_and_platform' && (params.subType === 'tram' || params.subType === 'train')) {
    base.push(`Welke ${modeWord} moet ik nemen, en welke richting?`)
  }
  if (params.variation === 'delays_and_disruptions' && params.subType === 'metro') {
    base.push('Is er een storing op de metro?')
  }
  if (params.variation === 'delays_and_disruptions' && params.subType === 'tram') {
    base.push('Rijdt de tram op tijd?')
  }

  const deduped = [...new Set(base.map((s) => s.trim()))].filter(Boolean)
  shuffleInPlace(deduped, params.rng)

  if (params.level === 'A1') return deduped.slice(0, 3)
  if (params.level === 'B1') return deduped
  return deduped.slice(0, 4)
}

/**
 * Short vocabulary line for runtime `context` (Dutch) — samples subtype + task-relevant terms.
 */
export function buildPublicTransportVocabularySnippet(params: {
  subType: PublicTransportSubtypeKey
  variation: PublicTransportVariationKey
  level: PublicTransportLevelKey
  rng: () => number
}): string {
  const subtypeWords = [...PUBLIC_TRANSPORT_VOCABULARY_BY_SUBTYPE[params.subType]]
  shuffleInPlace(subtypeWords, params.rng)
  const takeSubtype = subtypeWords.slice(0, 3)

  const extra: string[] = []
  if (params.variation === 'buying_ticket') {
    const t = [...PUBLIC_TRANSPORT_TICKET_TERMS]
    shuffleInPlace(t, params.rng)
    extra.push(...t.slice(0, 3))
  }
  if (params.variation === 'delays_and_disruptions') {
    const d: string[] = [...PUBLIC_TRANSPORT_DISRUPTION_TERMS_CORE]
    if (params.level === 'B1') d.push(...PUBLIC_TRANSPORT_DISRUPTION_TERMS_B1)
    shuffleInPlace(d, params.rng)
    extra.push(...d.slice(0, 3))
  }

  const parts = [...takeSubtype, ...extra].filter(Boolean)
  return parts.join(', ')
}

/** Deterministic “random run” preview for QA / docs (five tuples). */
export function examplePublicTransportRandomizedRuns(): Array<{
  seedRoll: number
  subType: PublicTransportSubtypeKey
  variation: PublicTransportVariationKey
  level: PublicTransportLevelKey
  destination: string
  vocabularySnippet: string
  starters: string[]
}> {
  const variations = ['route_and_platform', 'buying_ticket', 'delays_and_disruptions'] as const
  const subtypes = ['train', 'bus', 'tram', 'metro', 'train'] as const
  const levels = ['A1', 'A2', 'B1', 'A2', 'B1'] as const
  const out: Array<{
    seedRoll: number
    subType: PublicTransportSubtypeKey
    variation: PublicTransportVariationKey
    level: PublicTransportLevelKey
    destination: string
    vocabularySnippet: string
    starters: string[]
  }> = []
  for (let i = 0; i < 5; i++) {
    const seedRoll = 0.17 + i * 0.14
    let state = Math.floor(seedRoll * 1_000_000) % 233_280
    const rng = () => {
      state = (state * 9301 + 49297) % 233280
      return state / 233280
    }
    const variation = variations[i % variations.length]!
    const subType = subtypes[i % subtypes.length]!
    const level = levels[i % levels.length]!
    const destination = pickPublicTransportDestination(rng, variation)
    const vocabularySnippet = buildPublicTransportVocabularySnippet({ subType, variation, level, rng })
    const starters = buildPublicTransportStarterHints({ variation, level, subType, rng })
    out.push({ seedRoll, subType, variation, level, destination, vocabularySnippet, starters })
  }
  return out
}
