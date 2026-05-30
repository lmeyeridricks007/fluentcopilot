/**
 * Structured randomization pools for Speak Live "Directions / getting somewhere".
 * Kept separate from scenario builder for clarity and reuse (starters, hints, route text).
 */

export const DIRECTIONS_POOL_TRANSPORT = [
  'station',
  'bus_stop',
  'tram_stop',
  'platform_exit_entrance',
] as const

/** Daily-life destinations (includes gemeente → town_hall). */
export const DIRECTIONS_POOL_DAILY_LIFE = [
  'supermarket',
  'pharmacy',
  'toilet',
  'town_hall',
  'office_address',
] as const

export const DIRECTIONS_POOL_CITY_SOCIAL = [
  'city_centre',
  'museum',
  'restaurant',
  'cafe',
  'hotel',
] as const

export type DirectionsPoolCategory = 'transport' | 'daily_life' | 'city_social'

const POOL_CATEGORIES: readonly DirectionsPoolCategory[] = ['transport', 'daily_life', 'city_social']

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

/** Pick a destination id when the learner did not override `subType`. */
export function pickDirectionsDestinationFromPools(rng: () => number): string {
  const cat = pickOne(POOL_CATEGORIES, rng)
  const pool =
    cat === 'transport'
      ? DIRECTIONS_POOL_TRANSPORT
      : cat === 'daily_life'
        ? DIRECTIONS_POOL_DAILY_LIFE
        : DIRECTIONS_POOL_CITY_SOCIAL
  return pickOne(pool, rng)
}

/** Dutch landmark noun phrases (assistant route colour). */
export const DIRECTIONS_LANDMARK_POOL_NL = [
  'het stoplicht',
  'de brug',
  'het plein',
  'de kerk',
  'het station',
  'de supermarkt',
  'de apotheek',
  'het museum',
  'de tramhalte',
  'het stadhuis',
] as const

/**
 * Common route language (words / short phrases). A1 runs use a short subset in templates.
 */
export const DIRECTIONS_ROUTE_PHRASE_POOL_NL = [
  'rechtdoor',
  'links',
  'rechts',
  'naast',
  'tegenover',
  'bij het stoplicht',
  'de eerste straat',
  'de tweede straat',
  'om de hoek',
  'vijf minuten lopen',
] as const

const ROUTE_SUBSET_A1 = ['rechtdoor', 'links', 'rechts', 'naast', 'bij het stoplicht', 'om de hoek'] as const

const LANDMARK_SUBSET_A1 = ['het stoplicht', 'de supermarkt', 'het station', 'de tramhalte'] as const

export function pickDirectionsLandmarkNl(level: string, rng: () => number): string {
  const L = level.trim().toUpperCase()
  const pool = L === 'A1' ? LANDMARK_SUBSET_A1 : DIRECTIONS_LANDMARK_POOL_NL
  return pickOne(pool, rng)
}

export function pickDirectionsRoutePhraseNl(level: string, rng: () => number): string {
  const L = level.trim().toUpperCase()
  const pool = L === 'A1' ? ROUTE_SUBSET_A1 : DIRECTIONS_ROUTE_PHRASE_POOL_NL
  return pickOne(pool, rng)
}

type LevelBand = 'A1' | 'A2' | 'B1'

function band(level: string): LevelBand {
  const L = level.trim().toUpperCase()
  if (L === 'A1') return 'A1'
  if (L === 'B1') return 'B1'
  return 'A2'
}

/** Learner-facing starter lines for UI hints / `starterSuggestions` (Dutch). */
export function getDirectionsStarterPhrases(level: string, variation: string): string[] {
  const b = band(level)
  const v = variation.trim().toLowerCase().replace(/-/g, '_')

  if (v === 'asking_for_directions') {
    if (b === 'A1') {
      return [
        'Waar is het station?',
        'Hoe kom ik hier bij het toilet?',
        'Kunt u helpen?',
        'Waar is de supermarkt?',
        'Pardon…',
      ]
    }
    if (b === 'B1') {
      return [
        'Hoe kom ik het snelst bij het centrum?',
        'Kunt u mij zeggen waar het dichtstbijzijnde museum is?',
        'Waar is de apotheek, weet u dat?',
        'Mag ik u iets vragen over de route?',
        'Pardon, ik zoek het hotel in de buurt.',
      ]
    }
    return [
      'Waar is het station?',
      'Hoe kom ik bij het centrum?',
      'Kunt u mij helpen?',
      'Waar is de apotheek?',
      'Pardon, waar is het museum?',
    ]
  }

  if (v === 'understanding_instructions') {
    if (b === 'A1') {
      return ['Rechtdoor?', 'Links?', 'Rechts?', 'Nog een keer.', 'Oké.']
    }
    if (b === 'B1') {
      return [
        'Dus bij het stoplicht naar rechts?',
        'Bedoelt u de eerste of de tweede straat?',
        'Kunt u dat iets langzamer herhalen?',
        'Is het naast de supermarkt of ernaast?',
        'Links of rechts na de brug?',
      ]
    }
    return [
      'Rechtdoor?',
      'Bij het stoplicht?',
      'Links of rechts?',
      'Nog een keer, alstublieft.',
      'Dus eerst links?',
    ]
  }

  /* confirming_route */
  if (b === 'A1') {
    return ['Dus links?', 'Klopt dat?', 'Oké, dank u.', 'Naast de winkel?', 'Hier?']
  }
  if (b === 'B1') {
    return [
      'Dus eerst rechtdoor, dan bij het stoplicht links — klopt dat zo?',
      'Bij het station neem ik rechts en dan de tweede straat, goed?',
      'Oké, dank u, ik snap het.',
      'Dus het is naast de supermarkt en niet ertegenover?',
      'Even checken: om de hoek en dan rechtdoor?',
    ]
  }
  return [
    'Dus eerst rechtdoor en dan links?',
    'Bij het station rechts, klopt dat?',
    'Oké, dank u.',
    'Dus het is naast de supermarkt?',
    'Bij de apotheek links, begrijp ik dat goed?',
  ]
}
