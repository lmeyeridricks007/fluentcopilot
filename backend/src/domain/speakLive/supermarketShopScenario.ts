import type {
  PersonaConfig,
  ScenarioConfig,
  ScenarioDifficultyAdjustments,
  ScenarioRuntimeConfig,
  ScenarioRuntimeGoal,
  ScenarioSelectionOverrides,
} from '../../models/contracts'

import { getSupermarketShopStarterHintsForRuntime } from './supermarketShopLearnerStarters'

export const SUPERMARKET_SHOP_SCENARIO_ID = 'supermarket_shop' as const
export const SUPERMARKET_SHOP_TITLE = 'Supermarkt / winkel' as const
export const SUPERMARKET_SHOP_CATEGORY = 'Winkel' as const

export const SUPERMARKET_SHOP_SETTING_TYPES = [
  'supermarket',
  'convenience_store',
  'pharmacy_style',
  'general_retail',
] as const

export const SUPERMARKET_SHOP_VARIATIONS = [
  'asking_where_something_is',
  'paying_checkout',
  'product_questions',
] as const

export type SupermarketShopLevel = 'A1' | 'A2' | 'B1'
export type SupermarketShopSetting = (typeof SUPERMARKET_SHOP_SETTING_TYPES)[number]
export type SupermarketShopVariation = (typeof SUPERMARKET_SHOP_VARIATIONS)[number]

type BuildParams = {
  level: SupermarketShopLevel
  subType?: SupermarketShopSetting
  variation?: SupermarketShopVariation | string
  random?: () => number
}

const ASSISTANT_DUTCH_ONLY =
  'Alle zinnen aan de oefenaar zijn uitsluitend Nederlands; geen Engels (ook geen begroeting in het Engels).'

const TONE_VARIANTS = ['friendly', 'neutral', 'slightly rushed'] as const
type ShopTone = (typeof TONE_VARIANTS)[number]

const SETTING_LABEL_NL: Record<SupermarketShopSetting, string> = {
  supermarket: 'supermarkt',
  convenience_store: 'buurtwinkel / avondwinkel',
  pharmacy_style: 'apotheek / drogist',
  general_retail: 'winkel',
}

const PERSONA_BY_SETTING: Record<
  SupermarketShopSetting,
  { role: string; displayName: string; openingLine: string }
> = {
  supermarket: {
    role: 'Medewerker supermarkt',
    displayName: 'Medewerker',
    openingLine: 'Goedemiddag, waarmee kan ik u helpen?',
  },
  convenience_store: {
    role: 'Medewerker buurtwinkel',
    displayName: 'Medewerker',
    openingLine: 'Hallo — goedemiddag. Waarmee kan ik u helpen?',
  },
  pharmacy_style: {
    role: 'Medewerker apotheek/drogist',
    displayName: 'Medewerker',
    openingLine: 'Goedendag — waarmee kan ik u helpen?',
  },
  general_retail: {
    role: 'Winkelmedewerker',
    displayName: 'Medewerker',
    openingLine: 'Hallo, kan ik u ergens mee helpen?',
  },
}

const PRODUCT_POOLS: Record<SupermarketShopVariation, readonly string[]> = {
  asking_where_something_is: [
    'melk',
    'volkoren brood',
    'rijst',
    'wc-papier',
    'pindakaas',
    'yoghurt',
    'olijfolie',
    'diepvriespizza',
    'wasmiddel',
  ],
  paying_checkout: ['boodschappen', 'een tasje', 'de bon', 'pinnen', 'contactloos betalen', 'statiegeld'],
  product_questions: [
    'deze vegetarische lasagne',
    'deze sap',
    'deze shampoo',
    'deze kaas',
    'deze koffie',
    'deze crackers',
    'deze tabletten',
    'deze plantaardige variant',
  ],
}

const AISLE_HINTS = [
  'Het staat bij gangpad drie, rechts.',
  'Achterin, naast de pasta.',
  'Bij de bakkerijhoek, onderaan.',
  'Naast de zuivel, tweede schap.',
  'Links om de hoek, bij de koeling.',
  'Gangpad vijf, halverwege aan uw linkerhand.',
]

const CHECKOUT_MICRO_LINES = [
  'Wilt u een bonnetje?',
  'Pinnen of contant?',
  'Heeft u een tas nodig?',
  'Betaalt u contactloos?',
  'Zegt u het maar als u een dubbele tas wilt.',
]

const PRODUCT_STAFF_LINES = [
  'Deze is zonder suiker.',
  'Deze is goedkoper.',
  'Die hebben we ook in een grotere maat.',
  'Er is ook een huismerk dat vaak wordt gekozen.',
]

/** Who speaks — checkout overrides store “floor” role. */
type ShopStaffArchetype = 'supermarket_floor' | 'checkout_cashier' | 'shop_assistant' | 'pharmacy_counter'

function resolveStaffArchetype(setting: SupermarketShopSetting, variation: SupermarketShopVariation): ShopStaffArchetype {
  if (variation === 'paying_checkout') return 'checkout_cashier'
  if (setting === 'pharmacy_style') return 'pharmacy_counter'
  if (setting === 'convenience_store' || setting === 'general_retail') return 'shop_assistant'
  return 'supermarket_floor'
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

function normalizeVariation(raw: string | undefined): SupermarketShopVariation | undefined {
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
      return undefined
  }
}

function normalizeSetting(raw: string | undefined): SupermarketShopSetting | undefined {
  const v = (raw ?? '').trim().toLowerCase()
  return (SUPERMARKET_SHOP_SETTING_TYPES as readonly string[]).includes(v) ? (v as SupermarketShopSetting) : undefined
}

function buildGoals(variation: SupermarketShopVariation): ScenarioRuntimeGoal[] {
  if (variation === 'asking_where_something_is') {
    return [
      {
        id: 'ask_where_clearly',
        label: 'Vraag duidelijk waar een product ligt.',
        weight: 40,
        required: true,
        skill: 'location_question',
      },
      {
        id: 'understand_location',
        label: 'Begrijp of bevestig de locatie (gangpad / schap).',
        weight: 25,
        required: true,
        skill: 'listening_confirm',
      },
      {
        id: 'polite_phrasing',
        label: 'Gebruik beleefde formulering (mag / alstublieft / dank u).',
        weight: 20,
        skill: 'politeness',
      },
      {
        id: 'follow_up_clarification',
        label: 'Stel één korte vervolgvraag of verduidelijking.',
        weight: 15,
        skill: 'clarification',
      },
    ]
  }
  if (variation === 'paying_checkout') {
    return [
      {
        id: 'respond_at_checkout',
        label: 'Reageer passend bij de kassa (totaal, vraag van de medewerker).',
        weight: 35,
        required: true,
        skill: 'transactional_response',
      },
      {
        id: 'confirm_bag_receipt_payment',
        label: 'Bevestig tas, bon, of betaalwijze (pin/contactloos) kort en duidelijk.',
        weight: 30,
        required: true,
        skill: 'confirmation',
      },
      {
        id: 'natural_transaction_language',
        label: 'Gebruik korte natuurlijke transactietaal.',
        weight: 20,
        skill: 'fluency',
      },
      {
        id: 'close_politely',
        label: 'Sluit beleefd af (bedankt / prettige dag).',
        weight: 15,
        skill: 'politeness',
      },
    ]
  }
  return [
    {
      id: 'ask_product_clearly',
      label: 'Stel een duidelijke vraag over een product (prijs, inhoud, variant).',
      weight: 35,
      required: true,
      skill: 'product_question',
    },
    {
      id: 'confirm_or_compare',
      label: 'Bevestig of vergelijk correct (goedkoper / groter / zonder suiker).',
      weight: 30,
      required: true,
      skill: 'comparison',
    },
    {
      id: 'relevant_vocabulary',
      label: 'Gebruik passende woorden voor het product.',
      weight: 20,
      skill: 'vocabulary',
    },
    {
      id: 'clarify_if_needed',
      label: 'Vraag verduidelijking als iets onduidelijk is.',
      weight: 15,
      skill: 'clarification',
    },
  ]
}

/** Two short Dutch sentences for the learner UI — no staff rubric or example dialogue. */
function buildLearnerSituationSummary(params: {
  setting: SupermarketShopSetting
  variation: SupermarketShopVariation
  tone: ShopTone
  product: string
}): string {
  const place = SETTING_LABEL_NL[params.setting]
  const toneLine =
    params.tone === 'friendly'
      ? 'De medewerker is vriendelijk en geduldig.'
      : params.tone === 'slightly rushed'
        ? 'Het is licht druk; houd uw zinnen kort.'
        : 'De medewerker is neutraal en zakelijk.'
  const line1 =
    params.variation === 'asking_where_something_is'
      ? `Je bent in een ${place} en zoekt één product (${params.product}).`
      : params.variation === 'paying_checkout'
        ? `Je staat aan de kassa in een ${place} en rekent kort af met de medewerker.`
        : `Je bent in een ${place} en stelt een korte vraag over een product (${params.product}).`
  return `${line1} ${toneLine}`.replace(/\s+/g, ' ').trim()
}

function inferToneFromSupermarketContext(context: string): ShopTone {
  const t = context.toLowerCase()
  if (t.includes('licht druk') || t.includes('gehaast')) return 'slightly rushed'
  if (t.includes('vriendelijk') && t.includes('geduldig')) return 'friendly'
  return 'neutral'
}

function inferProductFromSupermarketContext(context: string, variation: SupermarketShopVariation): string {
  if (variation === 'paying_checkout') return 'boodschappen'
  const patterns = [
    /één product \(([^)]+)\)/i,
    /zoekt snel één product \(([^)]+)\)/i,
    /product \(([^)]+)\) bij je past/i,
    /over een product \(([^)]+)\)/i,
    /controleren of een product \(([^)]+)\)/i,
  ]
  for (const re of patterns) {
    const m = re.exec(context)
    if (m?.[1]?.trim()) return m[1].trim()
  }
  return 'iets'
}

/**
 * Older persisted Speak Live JSON has `context` but no `learnerSituationSummary`.
 * Rebuild the short learner line from `subType`, `variation`, and `context` so API/UI stay readable.
 */
export function hydrateSupermarketShopLearnerSituationSummary(runtime: ScenarioRuntimeConfig): ScenarioRuntimeConfig {
  const normalizedId = runtime.id?.trim().toLowerCase().replace(/-/g, '_')
  if (normalizedId !== SUPERMARKET_SHOP_SCENARIO_ID) return runtime
  if (runtime.learnerSituationSummary?.trim()) return runtime
  const setting = normalizeSetting(runtime.subType) ?? 'supermarket'
  const variation = normalizeVariation(runtime.variation) ?? 'asking_where_something_is'
  const tone = inferToneFromSupermarketContext(runtime.context)
  const product = inferProductFromSupermarketContext(runtime.context, variation)
  return {
    ...runtime,
    learnerSituationSummary: buildLearnerSituationSummary({ setting, variation, tone, product }),
  }
}

/** Full scene + assistant rubric + examples for prompts and tooling. */
function buildContext(params: {
  setting: SupermarketShopSetting
  variation: SupermarketShopVariation
  tone: ShopTone
  product: string
  rng: () => number
}): string {
  const place = SETTING_LABEL_NL[params.setting]
  const archetype = resolveStaffArchetype(params.setting, params.variation)
  const toneLine =
    params.tone === 'friendly'
      ? 'De medewerker is vriendelijk en geduldig.'
      : params.tone === 'slightly rushed'
        ? 'Het is licht druk; antwoorden blijven kort.'
        : 'De medewerker is neutraal en zakelijk.'
  const friction = pickOne(
    [
      'Soms is de vraag van de oefenaar vaag — dan vraagt de medewerker kort: “Welke bedoelt u?” of “De biologische?”.',
      'Soms geeft de medewerker een richting; de oefenaar bevestigt kort (bijv. “Dus gangpad drie?”).',
      'Soms volgt één extra kassavraag (bon, tas, pin) — gebruikelijk in Nederland, maximaal één per beurt.',
      '',
    ],
    params.rng
  ).trim()

  const line1 =
    params.variation === 'asking_where_something_is'
      ? `Je bent in een ${place} en zoekt snel één product (${params.product}).`
      : params.variation === 'paying_checkout'
        ? `Je staat aan de kassa in een ${place} en moet kort afrekenen en reageren op de medewerker.`
        : `Je bent in een ${place} en wilt controleren of een product (${params.product}) bij je past voordat je koopt.`

  const archetypeHint =
    archetype === 'checkout_cashier'
      ? 'Kassapersoon: kort, transactioneel, realistische vragen (bon, tas, pin).'
      : archetype === 'pharmacy_counter'
        ? 'Drogist/apotheek: voorzichtig, product- en instructiegericht, iets formeler.'
        : archetype === 'shop_assistant'
          ? 'Kleinere winkel: iets meer uitleg, mag kort alternatief of vergelijking noemen.'
          : 'Supermarkt vloer: wijs naar gangpad/schap; weinig omhaal, niet babbelig.'

  const line2 = `${toneLine} ${archetypeHint} ${friction}`.trim()
  const shelf = pickOne(AISLE_HINTS, params.rng)
  const checkoutCue = pickOne(CHECKOUT_MICRO_LINES, params.rng)
  const productCue = pickOne(PRODUCT_STAFF_LINES, params.rng)
  const tail =
    params.variation === 'asking_where_something_is'
      ? `Je mag vragen waar ${params.product} ligt. Voorbeelden van antwoordstijl: “${shelf}” of “Bedoelt u de biologische?”.`
      : params.variation === 'paying_checkout'
        ? `Typische kassaregels: noem een totaal, stel maximaal één vervolgvraag zoals: “${checkoutCue}”.`
        : `Je mag vragen over inhoud, prijs of variant. Voorbeeldantwoordstijl: “${productCue}”.`

  return `${line1} ${line2} ${tail}`.replace(/\s+/g, ' ').trim()
}

function buildHints(level: SupermarketShopLevel, variation: SupermarketShopVariation): string[] {
  return [...getSupermarketShopStarterHintsForRuntime(level, variation)]
}

function buildFrictionChance(level: SupermarketShopLevel): string {
  if (level === 'A1') return 'Maximaal 12% van de runs: één korte verduidelijkingsvraag.'
  if (level === 'B1') return 'Ongeveer 20% van de runs; lichte dubbelzinnigheid mag, blijf kort.'
  return 'Ongeveer 16% van de runs met lichte wrijving (bijv. “Welke?”).'
}

/** Dutch opening lines — varied by staff archetype + task; prompts may sample from this list. */
function collectOpeningVariants(setting: SupermarketShopSetting, variation: SupermarketShopVariation): string[] {
  const arch = resolveStaffArchetype(setting, variation)

  if (arch === 'checkout_cashier') {
    // Kassa: begroeting + korte servicezin (betaling / scannen); details in vervolg.
    return [
      'Goedemiddag — dag. Hoe wilt u betalen: pinnen of contant?',
      'Hallo — welkom bij de kassa. Mag ik even alles voor u scannen?',
      'Dag — goedemiddag. Waarmee kan ik u helpen — alleen afrekenen?',
      'Goedemiddag — hallo. Heeft u alles gevonden? Dan help ik u verder.',
      'Hallo — dag. Kan ik u helpen met afrekenen?',
      'Goedemiddag — welkom. Mag ik uw boodschappen scannen?',
      'Dag — goedemiddag. Betaalt u contactloos of met pin?',
      'Hallo — even aan de kassa. Waarmee kan ik u helpen?',
    ]
  }

  if (arch === 'pharmacy_counter') {
    if (variation === 'product_questions') {
      return [
        'Goedemiddag — welkom. Waarmee kan ik u helpen?',
        'Hallo — goedendag. Hoe kan ik u van dienst zijn?',
        'Goedemiddag — dag. Kan ik u iets uitleggen over dit schap?',
        'Hallo — welkom. Waar kan ik u mee helpen?',
        'Dag — goedemiddag. Waarmee kan ik u vandaag helpen?',
        'Goedendag — hallo. Hoe kan ik u helpen bij dit product?',
      ]
    }
    return [
      'Goedemiddag — waarmee kan ik u helpen?',
      'Hallo — welkom. Hoe kan ik u van dienst zijn?',
      'Goedendag — kan ik u naar het juiste schap helpen?',
    ]
  }

  if (arch === 'shop_assistant') {
    if (variation === 'product_questions') {
      return [
        'Hallo — goedemiddag. Waarmee kan ik u helpen?',
        'Goedemiddag — welkom. Kan ik u iets uitleggen of tonen?',
        'Dag — hoe kan ik u van dienst zijn?',
        'Hallo — waar kan ik u mee helpen vandaag?',
        'Goedemiddag — welkom in het schap. Waarmee kan ik u helpen?',
        'Hallo — dag. Hoe kan ik u helpen bij dit product?',
      ]
    }
    return [
      'Hallo — waar kan ik u mee helpen?',
      'Goedemiddag — welkom. Waarmee kan ik u helpen?',
      'Dag — hoe kan ik u van dienst zijn?',
    ]
  }

  // supermarket_floor
  if (variation === 'asking_where_something_is') {
    return [
      'Hallo — goedemiddag. Waarmee kan ik u helpen?',
      'Goedemiddag — dag. Waar kan ik u mee helpen?',
      'Hallo — welkom. Zoekt u iets — dan help ik u graag verder.',
      'Dag — hoe kan ik u van dienst zijn?',
    ]
  }
  if (variation === 'product_questions') {
    return [
      'Goedemiddag — hallo. Kan ik u helpen bij dit schap?',
      'Hallo — waarmee kan ik u helpen?',
      'Dag — welkom. Waar kan ik u mee helpen?',
    ]
  }
  return [PERSONA_BY_SETTING[setting].openingLine]
}

function buildAssistantBehavior(params: {
  setting: SupermarketShopSetting
  variation: SupermarketShopVariation
  level: SupermarketShopLevel
  tone: ShopTone
  frictionEnabled: boolean
  openingVariants: string[]
}): ScenarioRuntimeConfig['assistantBehavior'] {
  const { setting, variation, level, tone, frictionEnabled, openingVariants } = params
  const arch = resolveStaffArchetype(setting, variation)

  const baseStyle = [
    ASSISTANT_DUTCH_ONLY,
    'Geen grammaticales of woordenlijsten midden in het gesprek — alleen natuurlijk Nederlands in rol.',
    'Houd beurten kort: bij voorkeur één of twee zinnen, tenzij de oefenaar expliciet om uitleg vraagt.',
    'Varieer licht in formulering zodat herhaling minder scriptmatig aanvoelt.',
  ]

  const paceRegister: { pace: string; register: string } =
    arch === 'checkout_cashier'
      ? { pace: 'brisk-transactional', register: 'kassatoon: efficiënt, vriendelijk maar niet langdradig' }
      : arch === 'pharmacy_counter'
        ? { pace: 'steady-careful', register: 'iets formeler; product- en instructiegericht; geen diagnoses' }
        : arch === 'shop_assistant'
          ? { pace: 'steady-warm', register: 'iets meer uitleg dan een grote supermarkt; mag alternatieven kort noemen' }
          : { pace: 'steady-practical', register: 'vloerpersoneel: wijs naar gangpad/schap; niet babbelig' }

  const taskStyle: string[] = []
  if (variation === 'asking_where_something_is') {
    taskStyle.push(
      'Locatie-antwoorden: concreet (gangpad, richting, landmerk). Gebruik voorbeelden als: “Het staat bij gangpad drie.” / “Achterin, naast de pasta.” / “Bedoelt u de biologische?”',
      'Laat de oefenaar soms kort bevestigen na jouw aanwijzing.',
    )
  } else if (variation === 'paying_checkout') {
    taskStyle.push(
      'Kassa: noem eerst totaal waar passend; stel maximaal één realistische vervolgvraag per beurt (bon, tas, pin, statiegeld, spaarkaart).',
      'Voorbeelden: “Wilt u een bonnetje?” — “Pinnen of contant?” — “Heeft u een tas nodig?”',
    )
  } else {
    taskStyle.push(
      'Productvragen: kort antwoord op prijs, inhoud, variant of vergelijking.',
      'Voorbeelden: “Deze is zonder suiker.” — “Deze is goedkoper.” — “Die hebben we ook in een grotere maat.”',
      arch === 'shop_assistant'
        ? 'Mag één kort alternatief noemen als dat natuurlijk is.'
        : arch === 'pharmacy_counter'
          ? 'Blijf voorzichtig bij gezondheidsclaims; verwijs naar lees etiket of apotheker waar nodig.'
          : 'Houd vergelijkingen simpel.',
    )
  }

  const levelHint =
    level === 'A1'
      ? 'A1: heel korte zinnen, hoogstens één vervolgvraag, gangbare woorden.'
      : level === 'B1'
        ? 'B1: natuurlijke winkelzinnetjes; lichte dubbelzinnigheid mag, maar los het in één korte vraag op.'
        : 'A2: normale korte dialoog; één verduidelijking per keer is genoeg.'

  const frictionStyle = frictionEnabled
    ? [
        'Lichte wrijving: bij een vage vraag één korte verduidelijking (“Welke bedoelt u?” / “De halfvolle of de volle?”).',
        'Na locatie-instructie: nodig niet uit tot de oefenaar kort bevestigt — alleen als het natuurlijk past.',
        'Kassa: soms een onverwachte maar normale vervolgvraag (max. één) — geen keten van vier vragen achter elkaar.',
      ]
    : [
        'Antwoord direct en behulpzaam.',
        'Stel alleen een verduidelijkingsvraag als de bedoeling echt onduidelijk is.',
      ]

  const recommendationStyle =
    'Wissel openings- en slotformulering binnen deze run; herhaal niet exact dezelfde openingszin als in de vorige beurt tenzij het kassa-routine is.'

  return {
    pace: paceRegister.pace,
    register: paceRegister.register,
    tone,
    responseStyle: [...baseStyle, ...taskStyle, levelHint],
    frictionStyle,
    openingVariants,
    recommendationStyle,
    frictionChance: buildFrictionChance(level),
    guardrails: [
      'Blijf in-scène (winkel, kassa of schap).',
      'Geen chaotische plotwendingen of overweldigende informatie.',
      'Geen lesgeven over grammatica — alleen realistische winkelreactie.',
      'Doelen blijven haalbaar: forceer geen onmogelijke productkennis.',
    ],
  }
}

function buildDifficultyAdjustments(level: SupermarketShopLevel): ScenarioDifficultyAdjustments {
  if (level === 'A1') {
    return {
      learnerLevel: 'A1',
      responsePacing: 'Langzaam en vergevingsgezind.',
      vocabularyRange: 'Alleen heel gangbare winkelwoorden.',
      followUpStyle: 'Hoogstens één eenvoudige vervolgvraag.',
      misunderstandingLevel: 'Vermijd misverstanden tenzij de oefenaar erg onduidelijk is.',
    }
  }
  if (level === 'B1') {
    return {
      learnerLevel: 'B1',
      responsePacing: 'Natuurlijk winkeltempo.',
      vocabularyRange: 'Natuurlijk winkel- en productwoordenschat.',
      followUpStyle: 'Korte natuurlijke vervolgvragen; lichte ambiguïteit is oké.',
      misunderstandingLevel: 'Subtiele dubbelzinnigheid toestaan, kort houden.',
    }
  }
  return {
    learnerLevel: 'A2',
    responsePacing: 'Normaal kort winkelritme.',
    vocabularyRange: 'Gangbare woorden voor winkel en kassa.',
    followUpStyle: 'Korte verduidelijkingen wanneer nodig.',
    misunderstandingLevel: 'Lichte wrijving toestaan.',
  }
}

function buildOpeningLine(
  setting: SupermarketShopSetting,
  variation: SupermarketShopVariation,
  level: SupermarketShopLevel,
  rng: () => number
): string {
  const variants = collectOpeningVariants(setting, variation)
  if (level === 'A1') {
    const a1Pool = variants.slice(0, Math.min(3, variants.length))
    return pickOne(a1Pool.length ? a1Pool : [PERSONA_BY_SETTING[setting].openingLine], rng)
  }
  return pickOne(variants, rng)
}

export function buildSupermarketShopScenario(config: BuildParams): ScenarioRuntimeConfig {
  const rng = config.random ?? Math.random
  const subType = normalizeSetting(config.subType) ?? pickOne(SUPERMARKET_SHOP_SETTING_TYPES, rng)
  const variation = normalizeVariation(config.variation as string | undefined) ?? pickOne(SUPERMARKET_SHOP_VARIATIONS, rng)
  const tone = pickOne(TONE_VARIANTS, rng)
  const frictionEnabled = clampRoll(rng) < (config.level === 'A1' ? 0.12 : config.level === 'B1' ? 0.2 : 0.16)
  const product = pickOne(PRODUCT_POOLS[variation], rng)
  const goals = buildGoals(variation)
  const weights = Object.fromEntries(goals.map((g) => [g.id, g.weight]))
  const persona = PERSONA_BY_SETTING[subType]
  const staffArchetype = resolveStaffArchetype(subType, variation)
  const openingVariants = collectOpeningVariants(subType, variation)

  return {
    id: SUPERMARKET_SHOP_SCENARIO_ID,
    title: SUPERMARKET_SHOP_TITLE,
    category: SUPERMARKET_SHOP_CATEGORY,
    level: config.level,
    subType,
    variation,
    context: buildContext({ setting: subType, variation, tone, product, rng }),
    learnerSituationSummary: buildLearnerSituationSummary({ setting: subType, variation, tone, product }),
    goals,
    weights,
    assistantBehavior: buildAssistantBehavior({
      setting: subType,
      variation,
      level: config.level,
      tone,
      frictionEnabled,
      openingVariants,
    }),
    difficultyAdjustments: buildDifficultyAdjustments(config.level),
    hints: buildHints(config.level, variation),
    persona: {
      role: persona.role,
      displayName: persona.displayName,
      sceneLabel: SETTING_LABEL_NL[subType],
      tone,
      staffArchetype,
      frictionEnabled: frictionEnabled ? 'light friction enabled for this run' : 'direct helpful run',
    },
    coreSkills:
      variation === 'asking_where_something_is'
        ? ['location_question', 'listening_confirm', 'politeness']
        : variation === 'paying_checkout'
          ? ['transactional_response', 'confirmation', 'politeness']
          : ['product_question', 'comparison', 'vocabulary'],
    openingLine: buildOpeningLine(subType, variation, config.level, rng),
  }
}

export function maybeBuildSupermarketShopSpeakLiveScenarioRuntime(params: {
  scenario: ScenarioConfig
  level: SupermarketShopLevel
  overrides?: ScenarioSelectionOverrides | null
}): ScenarioRuntimeConfig | null {
  if (params.scenario.slug !== SUPERMARKET_SHOP_SCENARIO_ID) return null
  const variation = normalizeVariation(params.overrides?.variation as string | undefined)
  const subType = normalizeSetting(params.overrides?.subType)
  return buildSupermarketShopScenario({
    level: params.level,
    subType: subType ?? undefined,
    variation: variation ?? undefined,
  })
}

export function parseSupermarketShopScenarioRuntimeConfig(raw: unknown): ScenarioRuntimeConfig | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const candidate = raw as Partial<ScenarioRuntimeConfig>
  if (candidate.id !== SUPERMARKET_SHOP_SCENARIO_ID) return null
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
  return hydrateSupermarketShopLearnerSituationSummary(candidate as ScenarioRuntimeConfig)
}

export function dutchPersonaForSupermarketShopIfNeeded(scenarioSlug: string, persona: PersonaConfig): PersonaConfig {
  if (scenarioSlug !== SUPERMARKET_SHOP_SCENARIO_ID) return persona
  if (persona.slug !== 'shop_retail_staff') return persona
  return { ...persona, displayName: 'Medewerker' }
}
