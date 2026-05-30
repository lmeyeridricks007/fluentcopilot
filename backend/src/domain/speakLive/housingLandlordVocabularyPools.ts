/**
 * Structured Dutch pools for housing / landlord: issues, contract topics, home vocabulary, starter anchors.
 * Used for runtime prompt grounding and learner hints (not for scoring).
 * Keys align with `HousingLandlordIssueFocus` / `HousingLandlordContractFocus` in `housingLandlordScenario.ts`.
 */

/** Flat pool — short issue descriptions (NL). */
export const HOUSING_ISSUE_SNIPPETS_NL = [
  'verwarming werkt niet',
  'lek in de keuken',
  'douche is kapot',
  'raam sluit niet goed',
  'deur gaat niet dicht',
  'licht werkt niet',
  'wasmachine werkt niet',
  'schimmel',
  'waterprobleem',
] as const

/** Per-focus issue lines (issue focus id → phrases). */
export const HOUSING_ISSUE_PHRASES_BY_FOCUS: Record<string, readonly string[]> = {
  heating: ['verwarming werkt niet', 'geen warm water', 'koud in huis'],
  leak: ['lek in de keuken', 'waterprobleem', 'er lekt water'],
  broken_shower: ['douche is kapot', 'douche loopt niet goed door'],
  electricity_light: ['licht werkt niet', 'stroom uit in de kamer', 'lamp doet het niet'],
  window_door: ['raam sluit niet goed', 'deur gaat niet dicht', 'slot zit vast'],
  washing_machine: ['wasmachine werkt niet', 'wasmachine start niet'],
  mold_moisture: ['schimmel', 'vochtplek op de muur', 'zwarte plekken in de badkamer'],
  noise_building_simple: ['veel lawaai in het gebouw', 'geluid van boven'],
  internet_simple: ['wifi valt weg', 'internet is traag'],
}

/** Flat rent/contract topic labels (NL). */
export const RENT_CONTRACT_TOPIC_SNIPPETS_NL = [
  'huur betalen',
  'borg',
  'contractduur',
  'opzegtermijn',
  'wat zit inbegrepen',
  'onderhoud',
  'servicekosten',
  'nutsvoorzieningen',
  'betaling per maand',
] as const

export const RENT_CONTRACT_TOPIC_BY_FOCUS: Record<string, readonly string[]> = {
  rent_due_date: ['huur betalen', 'betaling per maand', 'betaaldatum'],
  deposit_borg: ['borg', 'borg terug', 'borg inhouding'],
  notice_period: ['opzegtermijn', 'opzeggen', 'opzegbrief'],
  contract_duration: ['contractduur', 'looptijd contract', 'vaste periode'],
  utilities_included: ['wat zit inbegrepen', 'nutsvoorzieningen', 'servicekosten', 'gas en licht'],
  maintenance_responsibility: ['onderhoud', 'kleine reparaties', 'wie repareert'],
  payment_method: ['betaling per maand', 'overschrijven', 'incasso'],
  rent_change_simple: ['huurverhoging', 'huuraanpassing', 'aankondiging huur'],
}

/** Core home/housing vocabulary (single tokens or short compounds). */
export const HOME_HOUSING_VOCABULARY_NL = [
  'verwarming',
  'lek',
  'douche',
  'raam',
  'deur',
  'keuken',
  'huur',
  'borg',
  'contract',
  'opzegtermijn',
  'inbegrepen',
  'nutsvoorzieningen',
  'servicekosten',
  'wasmachine',
  'schimmel',
  'water',
  'slot',
  'badkamer',
  'monteur',
] as const

type Cefr3 = 'A1' | 'A2' | 'B1'

/** Canonical starter anchors by variation + level (merged into hints). */
export const REPORTING_STARTER_ANCHORS_BY_LEVEL: Record<Cefr3, readonly [string, string, string, string]> = {
  A1: [
    'De verwarming werkt niet.',
    'Er is een lek in de keuken.',
    'De douche is kapot.',
    'Kunt u iemand sturen?',
  ],
  A2: [
    'De verwarming doet het al een paar dagen niet — kunt u iemand sturen?',
    'Er is een lek in de keuken; het wordt erger.',
    'De douche is kapot en er komt bijna geen water.',
    'Wat kunt u doen — kunt u iemand sturen?',
  ],
  B1: [
    'Ik bel even omdat de verwarming het niet meer doet; wat is de volgende stap?',
    'Er is een lek bij de gootsteen; kunt u een monteur regelen?',
    'De douche loopt slecht door; kunt u dat laten nakijken?',
    'Kunt u bevestigen of u iemand kunt sturen en wanneer?',
  ],
}

export const ASKING_RENT_CONTRACT_STARTER_ANCHORS_BY_LEVEL: Record<Cefr3, readonly [string, string, string, string]> = {
  A1: [
    'Wanneer moet ik de huur betalen?',
    'Hoe lang is het contract?',
    'Hoe werkt de opzegtermijn?',
    'Krijg ik de borg terug?',
  ],
  A2: [
    'Wanneer moet ik de huur overmaken — per de eerste?',
    'Hoe lang loopt mijn contract nog, en kan ik verlengen?',
    'Hoe werkt de opzegtermijn bij dit contract — schriftelijk?',
    'Krijg ik de volledige borg terug na oplevering?',
  ],
  B1: [
    'Kunt u bevestigen tot welke datum de huur uiterlijk binnen moet zijn?',
    'Wat is de afspraak over contractduur en tussentijdse opzegging?',
    'Hoe zit de opzegtermijn precies — voor mij en voor de verhuurder?',
    'Wat is de procedure voor terugbetaling van de borg na vertrek?',
  ],
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0.5
  if (n <= 0) return 0
  if (n >= 1) return 0.999_999
  return n
}

function pickFrom<T>(arr: readonly T[], rng: () => number, salt: number): T {
  const idx = Math.floor(clamp01(rng() + salt * 0.13) * arr.length) % arr.length
  return arr[idx]!
}

export function buildHousingLandlordVocabularyContextBlock(params: {
  variation: string
  detailFocus: string
  level: string
  rng: () => number
}): string {
  const { variation, detailFocus, level, rng } = params
  const vocabPick = [
    pickFrom(HOME_HOUSING_VOCABULARY_NL, rng, 0),
    pickFrom(HOME_HOUSING_VOCABULARY_NL, rng, 1),
    pickFrom(HOME_HOUSING_VOCABULARY_NL, rng, 2),
    pickFrom(HOME_HOUSING_VOCABULARY_NL, rng, 3),
    pickFrom(HOME_HOUSING_VOCABULARY_NL, rng, 4),
  ]
  const uniq = [...new Set(vocabPick)].slice(0, 5)

  if (variation === 'reporting_issue') {
    const issueLines = HOUSING_ISSUE_PHRASES_BY_FOCUS[detailFocus] ?? HOUSING_ISSUE_PHRASES_BY_FOCUS.heating
    const ex1 = pickFrom(issueLines, rng, 2)
    const ex2 = pickFrom(issueLines, rng, 3)
    return [
      '[5] Woord- en thema-ankers (varieer; niet als lijst voorlezen)',
      `Niveauanker: ${level} — houd zinnen passend bij dit niveau.`,
      `Thema (issue-key ${detailFocus}): bijv. “${ex1}”, “${ex2}”.`,
      `Kernwoorden: ${uniq.join(', ')}.`,
      `Brede voorbeelden (pool): ${HOUSING_ISSUE_SNIPPETS_NL.join('; ')}.`,
    ].join('\n')
  }

  const topicLines = RENT_CONTRACT_TOPIC_BY_FOCUS[detailFocus] ?? RENT_CONTRACT_TOPIC_BY_FOCUS.rent_due_date
  const t1 = pickFrom(topicLines, rng, 1)
  const t2 = pickFrom(topicLines, rng, 2)
  return [
    '[5] Woord- en thema-ankers (varieer; niet als lijst voorlezen)',
    `Niveauanker: ${level} — houd zinnen passend bij dit niveau.`,
    `Thema (contract-key ${detailFocus}): bijv. “${t1}”, “${t2}”.`,
    `Kernwoorden: ${uniq.join(', ')}.`,
    `Brede voorbeelden (pool): ${RENT_CONTRACT_TOPIC_SNIPPETS_NL.join('; ')}.`,
  ].join('\n')
}
