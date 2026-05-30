/**
 * Learner-facing Dutch starters for Supermarket / shop (Speak Live + text chat via runtime hints).
 * Keep in sync with optional UI re-export: `src/lib/speak-live/supermarketShopLearnerStarters.ts`.
 */

export type SupermarketShopLearnerLevel = 'A1' | 'A2' | 'B1'

export type SupermarketShopStarterVariation =
  | 'asking_where_something_is'
  | 'paying_checkout'
  | 'product_questions'

/** Full bank by task and CEFR band — for tooling, prompts, and future sentence drills. */
export const SUPERMARKET_SHOP_LEARNER_STARTERS: Record<
  SupermarketShopStarterVariation,
  Record<SupermarketShopLearnerLevel, readonly string[]>
> = {
  asking_where_something_is: {
    A1: [
      'Waar is de melk?',
      'Waar ligt het brood?',
      'Kunt u helpen?',
      'Dank u wel.',
    ],
    A2: [
      'Waar staat de melk?',
      'Waar kan ik de rijst vinden?',
      'Heeft u brood?',
      'Kunt u mij helpen?',
      'Waar vind ik …, alstublieft?',
      'Dus bij welk gangpad?',
    ],
    B1: [
      'Waar zou ik … ongeveer moeten zoeken?',
      'Is dat ver van hier in de winkel?',
      'Kunt u dat even wijzen, alstublieft?',
      'Ik zoek … — welke kant moet ik op?',
      'Bedoelt u bij de versafdeling of bij het schap?',
    ],
  },
  paying_checkout: {
    A1: ['Ik pin graag.', 'Een tas, graag.', 'Dank u wel.', 'Hoeveel?'],
    A2: [
      'Ik wil graag pinnen.',
      'Nee, geen bonnetje, dank u.',
      'Ja, ik heb een tas nodig.',
      'Hoeveel is het?',
      'Contactloos, graag.',
      'Dat is goed zo.',
    ],
    B1: [
      'Mag ik de bon in de tas, alstublieft?',
      'Ik betaal met pin.',
      'Geen statiegeld vandaag, dank u.',
      'Wat wordt het totaal ongeveer?',
      'Kunt u het totaal nog een keer zeggen?',
    ],
  },
  product_questions: {
    A1: ['Is dit zonder suiker?', 'Hoeveel kost dit?', 'Dank u wel.', 'Wat is dit?'],
    A2: [
      'Is deze vegetarisch?',
      'Welke is goedkoper?',
      'Heeft u deze zonder suiker?',
      'Is er een grotere maat?',
      'Wat zit erin?',
      'Is dit sterk?',
    ],
    B1: [
      'Wat is het verschil met die andere verpakking?',
      'Welke raadt u aan voor …?',
      'Heeft u een alternatief als deze variant op is?',
      'Is er een huismerk dat vergelijkbaar is?',
      'Bevat dit noten of lactose?',
      'Hoe lang is het ongeveer houdbaar na openen?',
    ],
  },
}

/** Compact pattern labels — useful for curriculum copy and engine metadata. */
export const SUPERMARKET_SHOP_PHRASE_PATTERNS: Record<SupermarketShopStarterVariation, readonly string[]> = {
  asking_where_something_is: [
    'Waar staat / ligt / vind ik …?',
    'Kunt u mij helpen?',
    'Dus bij gangpad …?',
    'Heeft u … (nog)?',
  ],
  paying_checkout: [
    'Ik wil (graag) pinnen / contant.',
    'Wel / geen bonnetje.',
    'Wel / geen tas.',
    'Hoeveel is het (totaal)?',
  ],
  product_questions: [
    'Is deze … (vegetarisch / zonder suiker)?',
    'Welke is goedkoper?',
    'Is er een grotere maat?',
    'Wat zit erin?',
  ],
}

function normalizeVariationForStarters(raw: string | undefined): SupermarketShopStarterVariation {
  switch ((raw ?? '').trim().toLowerCase()) {
    case 'asking_where':
    case 'asking_where_something_is':
    case 'location':
      return 'asking_where_something_is'
    case 'checkout':
    case 'paying':
    case 'paying_checkout':
      return 'paying_checkout'
    case 'product':
    case 'product_questions':
      return 'product_questions'
    default:
      return 'asking_where_something_is'
  }
}

function normalizeLevelForStarters(raw: string | undefined): SupermarketShopLearnerLevel {
  if (raw === 'A1' || raw === 'A2' || raw === 'B1') return raw
  return 'A2'
}

/** Starters injected into `ScenarioRuntimeConfig.hints` → chat `starterSuggestions` after `applyScenarioRuntimeConfig`. */
export function getSupermarketShopStarterHintsForRuntime(
  level: string | undefined,
  variation: string | undefined
): readonly string[] {
  const v = normalizeVariationForStarters(variation)
  const l = normalizeLevelForStarters(level)
  return SUPERMARKET_SHOP_LEARNER_STARTERS[v][l]
}
