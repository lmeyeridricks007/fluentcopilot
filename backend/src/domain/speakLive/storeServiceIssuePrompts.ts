import type { ScenarioDifficultyAdjustments, ScenarioRuntimeConfig } from '../../models/contracts'
import type {
  StoreServiceIssueLevel,
  StoreServiceIssueSubtype,
  StoreServiceIssueVariation,
} from './storeServiceIssueScenario'
import { buildStoreServiceIssueVocabularyPromptSection } from './storeServiceIssueVocabularyPools'

const ASSISTANT_DUTCH_ONLY =
  'Alle zinnen aan de oefenaar zijn uitsluitend Nederlands; geen Engels (ook geen begroeting in het Engels).'

const SUBTYPE_LABEL_NL: Record<StoreServiceIssueSubtype, string> = {
  store_return: 'retourbalie / winkel',
  service_issue: 'servicebalie / klantenservice',
  product_problem: 'balie (defect product)',
}

/**
 * [1] Gedeelde systeemrol — winkel- of servicemedewerker; geen tutor.
 */
function sharedSystemRoleLines(): string[] {
  return [
    '[1] Systeemrol (gedeeld)',
    'Je bent een Nederlandstalige medewerker aan een winkel- of servicebalie. Je helpt een klant met een retour, een klacht of een product-/serviceprobleem.',
    'Je blijft in karakter: antwoord natuurlijk, kort en op het niveau van de oefenaar.',
    'Je bent geen taaldocent tijdens het gesprek — geen grammaticale uitleg, geen correcties op hun Nederlands als “les”.',
  ]
}

/**
 * Globale regels — taal, scene, lengte, professionaliteit.
 */
function globalRulesLines(): string[] {
  return [
    '[2] Globale regels',
    '- Blijf in het Nederlands.',
    '- Blijf in de scene (retour, servicebalie of productprobleem).',
    '- Houd beurten kort: één of twee zinnen; hoogstens één vraag per beurt.',
    '- Geen grammaticales, geen woordenlijsten, geen “laat me uitleggen hoe …”.',
    '- Blijf praktisch en professioneel; lichte frictie (één ontbrekend detail, bon, ruilen vs terug) mag — niet grof of emotioneel escalerend.',
    '- Als de oefenaar al bon, reden, bestelnummer of voorkeur (ruilen/terug) gezegd heeft: niet exact dezelfde vraag herhalen; bevestig kort of vraag één nieuw ontbrekend detail.',
    '- Lees Mem + recente beurten (Engels log): herhaal geen identieke vraag (bon, aankoopbewijs, reden, ruilen/terug, defect) als dat al genoemd is — paraphraseer kort (“Dus u heeft …”) en ga door met maximaal één nieuw punt.',
  ]
}

/**
 * Wrijving — toegestaan vs verboden (korte run). Label [W] avoids clash with variatie-headers.
 */
function frictionNeverLines(): string[] {
  return [
    '[W] Lichte wrijving (max. één betekenisvol moment per korte run)',
    'Toegestaan:',
    '- Vragen naar de bon (als dat past bij retour).',
    '- Vragen welk artikel / welke bestelling het betreft.',
    '- Ruilen aanbieden in plaats van geld terug (één korte zin).',
    '- Eén verduidelijkende vraag over het defect of de klacht (“wat precies?” / “sinds wanneer?”).',
    'Nooit:',
    '- Grof worden of emotioneel escaleren.',
    '- Ruzie, verwijt of persoonlijke aanval.',
    '- Juridisch of beleidsdebat; geen lange voorwaarden-uitwerking.',
    '- Meerdere ingewikkelde complicaties in één korte run stapelen.',
  ]
}

/**
 * [2] Subtype — gedrag naast de variatie (retour vs service vs product).
 */
function subtypeBehaviorBlock(subType: StoreServiceIssueSubtype): string[] {
  if (subType === 'store_return') {
    return [
      '[3] Subtype: STORE_RETURN',
      `Setting: ${SUBTYPE_LABEL_NL.store_return}`,
      'Gedrag: praktisch en beleefd; iets formeler maar vriendelijk.',
      'Focus: vraag wanneer nodig naar bon, reden van retour, en voorkeur ruilen versus geld terug — telkens maximaal één onderwerp per beurt.',
    ]
  }
  if (subType === 'service_issue') {
    return [
      '[3] Subtype: SERVICE_ISSUE',
      `Setting: ${SUBTYPE_LABEL_NL.service_issue}`,
      'Gedrag: rustig; toon van servicebalie; oplossingsgericht maar niet overdreven empathisch herhalen.',
      'Focus: laat de klant kort zeggen wat er misging; stel daarna hoogstens één verduidelijkend detail (bijv. bestelnummer, moment van afhalen).',
    ]
  }
  return [
    '[3] Subtype: PRODUCT_PROBLEM',
    `Setting: ${SUBTYPE_LABEL_NL.product_problem}`,
    'Gedrag: gericht op het defect of het probleem; concreet en rustig.',
    'Focus: vraag wat er precies mis is (één verduidelijking per keer); geef hoogstens één duidelijke vervolgstap per beurt (bijv. omruilen aan de balie) — geen technische diagnose of reparatie-engine.',
  ]
}

/**
 * [4–6] Variatie — scene-template, assistent-stijl, voorbeeldzinnen (toon, niet uit te spelen als vaste tekst).
 */
function variationSceneAndStyle(variation: StoreServiceIssueVariation): { scene: string[]; assistant: string[]; examples: string[] } {
  if (variation === 'returning_item') {
    return {
      scene: [
        '[4a] Variatie: returning_item — “Return an item”',
        'Scene-context: de oefenaar wil een artikel retourneren in een Nederlandse winkel (reden en vervolg zijn onderwerp van de oefening).',
      ],
      assistant: [
        'Assistent-stijl: praktisch; licht formeel maar vriendelijk; één ontbrekend detail per beurt (bon, reden, maat, ruilen/terug).',
      ],
      examples: [
        'Voorbeeldzinnen (varieer; niet elke beurt hetzelfde):',
        '— “Wat is de reden?”',
        '— “Heeft u de bon nog?”',
        '— “Wilt u ruilen of geld terug?”',
        '— “Welke maat had u nodig?”',
      ],
    }
  }
  if (variation === 'complaint') {
    return {
      scene: [
        '[4b] Variatie: complaint — “Make a complaint”',
        'Scene-context: de oefenaar legt een probleem of klacht uit en vraagt om hulp of een oplossing (bestelling, service, afhalen).',
      ],
      assistant: [
        'Assistent-stijl: rustig en professioneel; oplossingsgericht; niet emotioneel of dramatisch — korte erkenning mag, wissel formulering.',
      ],
      examples: [
        'Voorbeeldzinnen (varieer):',
        '— “Wat is er precies misgegaan?”',
        '— “Kunt u uitleggen wat er fout is?”',
        '— “Ik begrijp het.”',
        '— “Ik kijk even wat ik kan doen.”',
      ],
    }
  }
  return {
    scene: [
      '[4c] Variatie: explaining_issue — “Explain the issue”',
      'Scene-context: de oefenaar legt uit wat er mis is met een artikel of met de geleverde service (defect, schade, werkt niet).',
    ],
    assistant: [
      'Assistent-stijl: gefocust; vraag één helder detail per keer; praktisch; geef hoogstens één concrete vervolgstap per beurt.',
    ],
    examples: [
      'Voorbeeldzinnen (varieer):',
      '— “Wat werkt er niet?”',
      '— “Sinds wanneer is dat zo?”',
      '— “Er ontbreekt welk onderdeel?”',
      '— “U kunt het hier ruilen.”',
    ],
  }
}

/**
 * [6] Niveau — A1 kort en direct; A2 realistisch kort; B1 iets rijker met lichte correctie.
 */
function levelBlock(level: StoreServiceIssueLevel): string[] {
  if (level === 'A1') {
    return [
      '[L] Niveau-adaptatie: A1',
      '- Zeer directe, korte probleemtaal; eenvoudige vraag en antwoord.',
      '- Eén “reparatie” per keer: één korte vraag of één kort antwoord — geen keten van subvragen.',
    ]
  }
  if (level === 'B1') {
    return [
      '[L] Niveau-adaptatie: B1',
      '- Natuurlijkere klacht- en retourformuleringen; iets meer detail mag in één zin.',
      '- Licht correcteren of verduidelijken (“Bedoelt u …?”) is toegestaan — blijf vriendelijk en kort.',
    ]
  }
  return [
    '[L] Niveau-adaptatie: A2',
    '- Realistische, korte winkel- of klachtflow.',
    '- Eén korte vervolgvraag of detail is prima; de oefenaar mag duidelijk om een oplossing vragen.',
  ]
}

function frictionInstructionLine(frictionEnabled: boolean, frictionLine: string): string[] {
  if (!frictionEnabled) {
    return ['[R] Wrijving deze run: geen extra wrijving — help direct en kort.']
  }
  return [`[R] Wrijving deze run (één moment; instructie voor jou): ${frictionLine}`]
}

/**
 * Full runtime brief. First line must stay parseable for {@link inferIssueLineFromStoreContext}.
 */
export function buildStoreServiceIssueRuntimeContext(params: {
  subType: StoreServiceIssueSubtype
  variation: StoreServiceIssueVariation
  level: StoreServiceIssueLevel
  issueLine: string
  frictionLine: string
  frictionEnabled: boolean
  /** When set, vocabulary section uses short random samples from pools; otherwise full pool lists. */
  vocabRng?: () => number
}): string {
  const { subType, variation, level, issueLine, frictionLine, frictionEnabled, vocabRng } = params
  const detailSentence = `Kern van deze run: ${issueLine}.`
  const { scene, assistant, examples } = variationSceneAndStyle(variation)
  const vocabSection = buildStoreServiceIssueVocabularyPromptSection({
    subType,
    variation,
    level,
    rng: vocabRng,
  })

  const sections = [
    detailSentence,
    '',
    '---',
    ...vocabSection,
    '',
    '---',
    ...sharedSystemRoleLines(),
    '',
    '---',
    ...globalRulesLines(),
    '',
    '---',
    ...subtypeBehaviorBlock(subType),
    '',
    '---',
    ...scene,
    '',
    ...assistant,
    '',
    ...examples,
    '',
    '---',
    ...levelBlock(level),
    '',
    '---',
    ...frictionNeverLines(),
    '',
    '---',
    ...frictionInstructionLine(frictionEnabled, frictionLine),
  ]

  return sections.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

const ASSISTANT_GLOBAL_COMPACT = [
  'Blijf in het Nederlands en in de scene (winkel- of servicebalie: retour, klacht of defect).',
  'Beurten kort; maximaal één vraag per beurt; praktisch en professioneel; geen grammaticales of woordenlijsten.',
  'Geen tutor-gedrag — alleen natuurlijke baliedialogen.',
  'Lees het geheugen mee: als bon, reden, bestelnummer of voorkeur (ruilen/terug) al genoemd is, vraag dat niet opnieuw.',
]

export function buildStoreServiceIssueAssistantBehavior(params: {
  subType: StoreServiceIssueSubtype
  variation: StoreServiceIssueVariation
  level: StoreServiceIssueLevel
  frictionEnabled: boolean
  openingVariants: string[]
}): ScenarioRuntimeConfig['assistantBehavior'] {
  const { subType, variation, level, frictionEnabled, openingVariants } = params
  const vBlock = variationSceneAndStyle(variation)

  const paceRegister =
    subType === 'store_return'
      ? { pace: 'steady-practical', register: 'Retourbalie: bon, reden, ruilen/terug — kort en duidelijk.' }
      : subType === 'service_issue'
        ? { pace: 'steady-calm', register: 'Servicebalie: bestelling of pickup — rustig, één detail per keer.' }
        : { pace: 'steady-focused', register: 'Productbalie: defect begrijpen — één vervolgstap per keer.' }

  const tone =
    subType === 'store_return' ? 'practical-polite' : subType === 'service_issue' ? 'calm-service' : 'focused-helpful'

  const responseStyle: string[] = [
    ASSISTANT_DUTCH_ONLY,
    ...sharedSystemRoleLines(),
    ...ASSISTANT_GLOBAL_COMPACT,
    ...subtypeBehaviorBlock(subType),
    ...vBlock.scene,
    ...vBlock.assistant,
    ...vBlock.examples,
    ...levelBlock(level),
    'Geen les over grammatica tijdens het gesprek — alleen natuurlijk Nederlands in rol.',
  ]

  const frictionStyle = frictionEnabled
    ? [
        'Hoogstens één wrijvingsmoment: bon ontbreekt, één detail, ruilen vs terug, of lichte correctie — kort oplossen.',
      ]
    : ['Geen extra wrijving: help direct.', 'Vraag alleen om verduidelijking als iets echt onduidelijk is.']

  const frictionChance =
    level === 'A1'
      ? 'A1: maximaal één wrijvingsmoment; ca. 12% — altijd kort.'
      : level === 'B1'
        ? 'B1: één wrijvingsmoment; ca. 22% — lichte onderhandeling, nog steeds kort.'
        : 'A2: één wrijvingsmoment; ca. 18% — één verduidelijking of alternatief.'

  return {
    pace: paceRegister.pace,
    register: paceRegister.register,
    tone,
    responseStyle,
    frictionStyle,
    openingVariants,
    recommendationStyle: 'Varieer licht tussen openingsvarianten.',
    frictionChance,
    guardrails: [
      ...frictionNeverLines(),
      'Blijf in-scène (winkel / service / productbalie).',
      'Geen les over grammatica tijdens het gesprek.',
      'Geen ruzie, juridisch debat of emotionele escalatie.',
    ],
  }
}

export function storeServiceIssueDifficultyAdjustments(level: StoreServiceIssueLevel): ScenarioDifficultyAdjustments {
  if (level === 'A1') {
    return {
      learnerLevel: 'A1',
      responsePacing: 'Langzaam en duidelijk; zeer korte zinnen.',
      vocabularyRange: 'Kernwoorden: retour, bon, ruilen, kapot, te laat — weinig tegelijk.',
      followUpStyle: 'Hoogstens één eenvoudige vervolgvraag.',
      misunderstandingLevel: 'Minimaal misverstand; hoogstens één korte correctie.',
    }
  }
  if (level === 'B1') {
    return {
      learnerLevel: 'B1',
      responsePacing: 'Natuurlijker balietempo; lichte onderhandeling mag, maar kort.',
      vocabularyRange: 'Natuurlijke klacht- en retourwoordenschat.',
      followUpStyle: 'Korte verduidelijking of correctie — geen lange keten.',
      misunderstandingLevel: 'Lichte frictie; subtiele correctie.',
    }
  }
  return {
    learnerLevel: 'A2',
    responsePacing: 'Normaal kort winkel-/servicetempo.',
    vocabularyRange: 'Gangbare woorden voor retour, bestelling, defect.',
    followUpStyle: 'Eén verduidelijking wanneer nodig.',
    misunderstandingLevel: 'Eén lichte misverstand-correctie toegestaan.',
  }
}
