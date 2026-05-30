/**
 * Structured Dutch vocabulary pools for store / service issue scenarios.
 * Used for runtime “Kern van deze run” lines, prompt inserts, and learner starters.
 * (No imports from `storeServiceIssueScenario.ts` — avoids circular dependency.)
 */

import { pickOne } from './bookingReservationsVocabularyPools'

export type StoreServiceIssueStarterLevel = 'A1' | 'A2' | 'B1'
export type StoreServiceIssueVariationKey = 'returning_item' | 'complaint' | 'explaining_issue'
export type StoreServiceIssueSubtypeKey = 'store_return' | 'service_issue' | 'product_problem'

/** Part 1 — Return-desk / retour context (short NL phrases). */
export const STORE_SERVICE_RETURN_REASON_POOL_NL = [
  'te klein',
  'te groot',
  'verkeerde maat',
  'verkeerde kleur',
  'ik wil een andere',
  'niet wat ik verwachtte',
] as const

/** Part 2 — Service / complaint issue lines (short NL). */
export const STORE_SERVICE_COMPLAINT_ISSUE_POOL_NL = [
  'verkeerd product gekregen',
  'bestelling te laat',
  'bestelling onvolledig',
  'iets is misgegaan',
  'dit klopt niet',
] as const

/** Part 3 — Product defect vocabulary (single words or very short phrases). */
export const STORE_SERVICE_PRODUCT_PROBLEM_VOCAB_POOL_NL = [
  'werkt niet',
  'kapot',
  'kras',
  'ontbreekt',
  'beschadigd',
  'doet het niet',
  'stuk',
  'defect',
] as const

/**
 * Part 4 — Starter phrases by variation × level (Speak Live prep / hints).
 * A2 lines match product copy; A1 = minimal; B1 = slightly fuller.
 */
export const STORE_SERVICE_ISSUE_STARTER_PHRASES_BY_VARIATION_AND_LEVEL: Record<
  StoreServiceIssueVariationKey,
  Record<StoreServiceIssueStarterLevel, readonly string[]>
> = {
  returning_item: {
    A1: ['Ik wil retour.', 'Te klein.', 'Bon hier.', 'Kan ik ruilen?'],
    A2: [
      'Ik wil dit graag terugbrengen.',
      'Het is te klein.',
      'Ik heb de bon nog.',
      'Kan ik het ruilen?',
    ],
    B1: [
      'Ik wil dit graag retourneren — het valt helaas te klein uit.',
      'Ik heb de bon nog; wat zijn de opties voor ruilen of terugbetaling?',
      'Kunt u kort zeggen wat er mogelijk is: ruilen of geld terug?',
    ],
  },
  complaint: {
    A1: ['Misgegaan.', 'Fout product.', 'Te laat.', 'Kunt u helpen?'],
    A2: [
      'Er is iets misgegaan.',
      'Ik heb het verkeerde product gekregen.',
      'Mijn bestelling is te laat.',
      'Kunt u mij helpen?',
    ],
    B1: [
      'Er is iets misgegaan met mijn bestelling — ik heb iets anders ontvangen dan besteld.',
      'De levering is een paar dagen te laat; wat kunnen we nu doen?',
      'Kunt u dit uitzoeken en een oplossing voorstellen?',
    ],
  },
  explaining_issue: {
    A1: ['Werkt niet.', 'Kapot.', 'Kras.', 'Onderdeel weg.', 'Wat nu?'],
    A2: ['Het werkt niet.', 'Er zit een kras op.', 'Er ontbreekt een onderdeel.', 'Wat kan ik nu doen?'],
    B1: [
      'Het apparaat gaat niet meer aan sinds gisteren.',
      'Er zit een diepe kras op het scherm; het is zo gekocht.',
      'Kunt u bevestigen wat de volgende stap is — omruilen of reparatie?',
    ],
  },
}

/** Single canonical “Kern van deze run” fragment per randomized detail focus (aligned with pools). */
export function storeServiceIssueIssueLineNl(subType: StoreServiceIssueSubtypeKey, focus: string): string {
  if (subType === 'store_return') {
    switch (focus) {
      case 'too_small':
        return 'te klein'
      case 'too_big':
        return 'te groot'
      case 'wrong_color':
        return 'verkeerde kleur'
      case 'not_as_expected':
        return 'niet wat ik verwachtte'
      case 'prefer_exchange':
        return 'ik wil een andere / liever ruilen'
      default:
        return 'een retourreden'
    }
  }
  if (subType === 'service_issue') {
    switch (focus) {
      case 'wrong_item_received':
        return 'verkeerd product gekregen'
      case 'delayed_order':
        return 'bestelling te laat'
      case 'incomplete_order':
        return 'bestelling onvolledig'
      case 'pickup_problem':
        return 'probleem bij afhalen'
      case 'service_error':
        return 'fout in de service-afhandeling'
      default:
        return 'iets is misgegaan'
    }
  }
  switch (focus) {
    case 'broken':
      return 'kapot'
    case 'damaged':
      return 'beschadigd'
    case 'missing_part':
      return 'ontbreekt (onderdeel)'
    case 'wont_turn_on':
      return 'doet het niet / gaat niet aan'
    case 'stopped_working':
      return 'werkte kort en stopt nu'
    default:
      return 'defect'
  }
}

function joinPool<T extends readonly string[]>(items: T): string {
  return [...items].join(', ')
}

function samplePool<T extends readonly string[]>(items: T, max: number, rng: () => number): string {
  const n = Math.min(max, items.length)
  if (n <= 0) return ''
  const copy = [...items]
  const out: string[] = []
  for (let i = 0; i < n && copy.length; i++) {
    const idx = Math.floor(clampRoll(rng) * copy.length)
    out.push(copy.splice(idx, 1)[0]!)
  }
  return out.join(', ')
}

function clampRoll(rng: () => number): number {
  const x = Number(rng())
  if (!Number.isFinite(x)) return 0.5
  if (x <= 0) return 0.001
  if (x >= 1) return 0.999
  return x
}

/**
 * Compact vocabulary insert for runtime / LLM context (full pools + level starters).
 */
export function buildStoreServiceIssueVocabularyPromptSection(params: {
  subType: StoreServiceIssueSubtypeKey
  variation: StoreServiceIssueVariationKey
  level: StoreServiceIssueStarterLevel
  /** Optional: sample a few items for slightly shorter context; if omitted, full pools are listed. */
  rng?: () => number
}): string[] {
  const { subType, variation, level, rng } = params
  const starters =
    STORE_SERVICE_ISSUE_STARTER_PHRASES_BY_VARIATION_AND_LEVEL[variation]?.[level] ??
    STORE_SERVICE_ISSUE_STARTER_PHRASES_BY_VARIATION_AND_LEVEL[variation]?.A2 ??
    []

  const retour = rng
    ? `Voorbeeld uit retourredenen (NL): ${samplePool(STORE_SERVICE_RETURN_REASON_POOL_NL, 4, rng)}`
    : `Retourredenen (NL): ${joinPool(STORE_SERVICE_RETURN_REASON_POOL_NL)}`
  const klacht = rng
    ? `Voorbeeld uit klacht / service (NL): ${samplePool(STORE_SERVICE_COMPLAINT_ISSUE_POOL_NL, 3, rng)}`
    : `Klacht / service (NL): ${joinPool(STORE_SERVICE_COMPLAINT_ISSUE_POOL_NL)}`
  const product = rng
    ? `Voorbeeld uit product- en defectwoordenschat (NL): ${samplePool(STORE_SERVICE_PRODUCT_PROBLEM_VOCAB_POOL_NL, 4, rng)}`
    : `Product / defect (NL): ${joinPool(STORE_SERVICE_PRODUCT_PROBLEM_VOCAB_POOL_NL)}`

  const lines: string[] = [
    '[V] Woordenschat & voorbeeldredenen (referentie — varieer; niet alles in één beurt)',
    retour,
    klacht,
    product,
    `Starters passend bij variatie “${variation}” en niveau ${level} (NL): ${starters.join(' | ')}`,
  ]

  if (subType === 'store_return') {
    lines.push('Focus subtype: leg nadruk op bon, reden, ruilen vs terug — gebruik retourredenen-pool waar passend.')
  } else if (subType === 'service_issue') {
    lines.push('Focus subtype: laat de klant het probleem kort zeggen — gebruik klacht-pool voor realistische formuleringen.')
  } else {
    lines.push('Focus subtype: laat defect concreet benoemen — gebruik product-/defect-pool.')
  }

  return lines
}

/** Random line from the pool matching subtype (demos / tests). */
export function pickRandomStoreServiceIssueLineFromPools(subType: StoreServiceIssueSubtypeKey, rng: () => number): string {
  if (subType === 'store_return') return pickOne([...STORE_SERVICE_RETURN_REASON_POOL_NL], rng)
  if (subType === 'service_issue') return pickOne([...STORE_SERVICE_COMPLAINT_ISSUE_POOL_NL], rng)
  return pickOne([...STORE_SERVICE_PRODUCT_PROBLEM_VOCAB_POOL_NL], rng)
}
