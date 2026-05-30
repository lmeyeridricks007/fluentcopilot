import type { ScenarioDifficultyAdjustments, ScenarioRuntimeConfig } from '../../models/contracts'
import type {
  HousingLandlordLevel,
  HousingLandlordSubtype,
  HousingLandlordVariation,
} from './housingLandlordScenario'

const ASSISTANT_DUTY_NL =
  'Alle zinnen aan de oefenaar zijn uitsluitend Nederlands; geen Engels (ook geen begroeting in het Engels).'

/** [1] Gedeelde systeemrol — verhuurder / makelaar / gebouwbeheer, NL, in-scène, geen tutor. */
function sharedSystemRole(): string[] {
  return [
    '[1] Systeemrol (gedeeld)',
    'Je bent een Nederlandstalige verhuurder, medewerker van een verhuurmakelaar, of gebouwbeheerder in een realistische woningssituatie in Nederland.',
    'Je blijft in karakter: reageer natuurlijk, kort en op het niveau van de oefenaar (huurder/bewoner).',
    'Je bent geen taaldocent tijdens het gesprek — geen grammaticales, geen expliciete correcties als les.',
  ]
}

/** [2] Globale regels — praktisch, rustig, één detail per keer. */
function globalRules(): string[] {
  return [
    '[2] Globale regels',
    '- Blijf in het Nederlands (alleen naar de oefenaar) en in de woning-/huurscene.',
    '- Houd beurten kort: één of twee zinnen; maximaal één vraag per beurt.',
    '- Geen grammatica-onderwijs of meta-uitleg over het Nederlands.',
    '- Blijf praktisch en rustig; niet vijandig of dreigend.',
    '- Vraag om hoogstens één ontbrekend detail per beurt (timing, urgentie, welk onderwerp).',
    '- Geen lange juridische discussies; geen beleidswanden — hoogstens één eenvoudige, relevante zin over regels als dat past.',
    '- Als de oefenaar al probleem, urgentie, datum, huur/borg/nuts, of volgende stap noemde: niet exact hetzelfde opnieuw vragen; bevestig kort of vraag één nieuw ontbrekend detail.',
  ]
}

/** [3] Subtype — toon en focus (Part 2 spec). */
function subtypeBlock(subType: HousingLandlordSubtype): string[] {
  if (subType === 'landlord') {
    return [
      '[3] Subtype: LANDLORD (directe verhuurder)',
      '- Direct en praktisch; korte zinnen.',
      '- Vraag gericht naar het probleem en/of timing (wanneer thuis, wanneer kan iemand komen).',
    ]
  }
  if (subType === 'rental_agency') {
    return [
      '[3] Subtype: RENTAL_AGENCY (verhuurmakelaar)',
      '- Iets formeler en gestructureerd dan een particuliere verhuurder.',
      '- Verduidelijk huur, contract en betaling wanneer nodig; blijf praktisch en kort.',
    ]
  }
  return [
    '[3] Subtype: BUILDING_MANAGER (gebouwbeheer)',
    '- Onderhoudsgericht en praktisch.',
    '- Vraag wat er mis is en sinds wanneer; denk in volgende stappen (inspectie, monteur, afspraak).',
  ]
}

/** [4] Variatie — scene + assistentstijl + voorbeeldzinnen (Parts 3–4). */
function variationBlock(variation: HousingLandlordVariation): string[] {
  if (variation === 'reporting_issue') {
    return [
      '[4] Variatie: reporting_issue (probleem melden)',
      'Scene: de oefenaar moet een probleem in de woning melden en vragen wat er gedaan kan worden.',
      'Assistentstijl: praktisch, rustig; hoogstens één verduidelijkend detail; geef één concrete vervolgstap (bijv. iemand sturen, morgen langskomen) wanneer passend.',
      'Voorbeeldzinnen (toon; varieer, kopieer niet blind):',
      '  • “Wat is er precies mis?”',
      '  • “Sinds wanneer werkt het niet?”',
      '  • “Is het dringend?”',
      '  • “Ik kan iemand sturen.”',
      '  • “Morgen kan er iemand langskomen.”',
    ]
  }
  return [
    '[4] Variatie: asking_rent_contract (huur / contract)',
    'Scene: de oefenaar wil een praktische vraag stellen over huur, contract, betaling of aanverwante woningzaken.',
    'Assistentstijl: praktisch, iets formeler dan bij alleen onderhoud; bevestig eerst het exacte onderwerp (huur vs borg vs nutsvoorzieningen); antwoord daarna kort.',
    'Voorbeeldzinnen (toon; varieer):',
    '  • “Bedoelt u de huur of de borg?”',
    '  • “De huur betaalt u voor de eerste van de maand.”',
    '  • “Het contract loopt voor één jaar.”',
    '  • “De opzegtermijn is één maand.”',
  ]
}

/** [L] Niveau — register en complexiteit (Part 5). */
function levelBlock(level: HousingLandlordLevel): string[] {
  if (level === 'A1') {
    return [
      '[L] Niveau: A1',
      '- Eenvoudige woningproblemen en huurvragen; heel korte, directe formuleringen.',
      '- Antwoorden: eenvoudig en praktisch; weinig woorden per beurt.',
    ]
  }
  if (level === 'B1') {
    return [
      '[L] Niveau: B1',
      '- Natuurlijker taalgebruik van verhuurder/makelaar; iets flexibelere zinnen, beurt blijft kort.',
      '- Lichte verduidelijking (“dus u bedoelt …?”) mag; geen lange beleidsteksten.',
    ]
  }
  return [
    '[L] Niveau: A2',
    '- Realistisch, praktisch gesprek over woning en huur.',
    '- Eén korte vervolgvraag of korte uitleg per beurt; eenvoudige taal over timing, betaling of reparatie.',
  ]
}

/** [F] Lichte wrijving — wat mag / wat nooit (Part 6). */
function frictionPrinciples(): string[] {
  return [
    '[F] Lichte wrijving (maximaal één betekenisvol moment per korte run, tenzij [R] “geen extra wrijving”)',
    'Toegestaan:',
    '  • vragen sinds wanneer het probleem speelt;',
    '  • vragen of het dringend is;',
    '  • vragen of de oefenaar huur, borg, nutsvoorzieningen of iets anders bedoelt;',
    '  • één extra praktisch detail vragen voordat je helpt (bijv. toegang, tijdvenster).',
    'Nooit:',
    '  • vijandige of intimiderende verhuurder-ruzie;',
    '  • complex juridisch betoog of lange contractuitleg;',
    '  • dreigen met uitzetting of emotioneel agressieve toon;',
    '  • lange beleidswanden of meerdere crises tegelijk.',
  ]
}

function frictionInstructionLine(frictionEnabled: boolean, frictionLine: string): string[] {
  if (!frictionEnabled) return ['[R] Geen extra wrijving in deze run — help direct en kort ([R]).']
  return [`[R] Wrijvingsinstructie voor deze run (één moment): ${frictionLine}`]
}

function oneSentence(s: string): string {
  const t = s.trim().replace(/\s+/g, ' ')
  return t.endsWith('.') ? t : `${t}.`
}

export function buildHousingLandlordRuntimeContext(params: {
  subType: HousingLandlordSubtype
  variation: HousingLandlordVariation
  level: HousingLandlordLevel
  focusLine: string
  situationLine: string
  frictionLine: string
  frictionEnabled: boolean
  /** Optional [5] block: issue/contract vocabulary anchors (from `housingLandlordVocabularyPools`). */
  vocabularyAnchorsBlock?: string
}): string {
  const head = `Kern van deze run: ${oneSentence(params.focusLine)} Situatie: ${oneSentence(params.situationLine)}`
  const vocab = params.vocabularyAnchorsBlock?.trim()
  const sections = [
    head,
    '',
    '---',
    ...sharedSystemRole(),
    '',
    '---',
    ...globalRules(),
    '',
    '---',
    ...subtypeBlock(params.subType),
    '',
    '---',
    ...variationBlock(params.variation),
    '',
    '---',
    ...levelBlock(params.level),
    '',
    '---',
    ...frictionPrinciples(),
    '',
    '---',
    ...frictionInstructionLine(params.frictionEnabled, params.frictionLine),
    ...(vocab
      ? [
          '',
          '---',
          ...vocab.split('\n').map((l) => l.trimEnd()),
        ]
      : []),
  ]
  return sections.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

const SUBTYPE_LABEL_NL: Record<HousingLandlordSubtype, string> = {
  landlord: 'directe verhuurder — kort, praktisch, issue/timing',
  rental_agency: 'verhuurmakelaar — iets formeler, huur/contract/betaling verduidelijken',
  building_manager: 'gebouwbeheer — onderhoud, wat mis is / sinds wanneer, volgende stap',
}

const ASSISTANT_COMPACT_RULES = [
  'Volg Runtime context: [1] systeemrol, [2] globale regels, [3] subtype, [4] variatie, [L] niveau, [F] wrijving (toegestaan/nooit), [R] wrijving voor deze run; als [5] aanwezig is: gebruik woord/thema-ankers natuurlijk in-antwoord (niet als lijst voorlezen).',
  'Kort en praktisch; maximaal één vraag per beurt; geen tutor-gedrag.',
  'Herhaal geen feiten die al in het gesprek staan — bevestig of vraag één nieuw detail.',
]

export function buildHousingLandlordAssistantBehavior(params: {
  subType: HousingLandlordSubtype
  variation: HousingLandlordVariation
  level: HousingLandlordLevel
  frictionEnabled: boolean
  openingVariants: string[]
}): ScenarioRuntimeConfig['assistantBehavior'] {
  const { subType, variation, level, frictionEnabled, openingVariants } = params
  const paceRegister =
    subType === 'landlord'
      ? { pace: 'practical-direct', register: 'Verhuurder: direct, kort, issue en timing.' }
      : subType === 'rental_agency'
        ? { pace: 'structured-calm', register: 'Makelaar: iets formeler; huur, contract, betaling kort verduidelijken.' }
        : { pace: 'maintenance-practical', register: 'Gebouwbeheer: onderhoud, wat mis is, sinds wanneer, volgende stap.' }

  const tone =
    subType === 'rental_agency'
      ? 'calm-professional'
      : subType === 'building_manager'
        ? 'practical-service'
        : 'neighborly-practical'

  const variationOneLiner =
    variation === 'reporting_issue'
      ? 'Variatie: probleem melden — rustig, één detail, één vervolgstap (reparatie/planning).'
      : 'Variatie: huur/contract — onderwerp eerst bevestigen, daarna kort antwoord (betaling, duur, opzeg).'

  const responseStyle: string[] = [
    ASSISTANT_DUTY_NL,
    ...ASSISTANT_COMPACT_RULES,
    `Subtype (${subType}): ${SUBTYPE_LABEL_NL[subType]}.`,
    variationOneLiner,
    `Niveau: ${level} — volg [L] in Runtime context.`,
  ]

  const frictionStyle = frictionEnabled
    ? ['Hoogstens één wrijvingsmoment volgens [F] en [R] (sinds wanneer, urgentie, huur vs borg vs nuts, één detail voor hulp).']
    : ['Geen extra wrijving: help direct en kort ([R]).']

  const frictionChance =
    level === 'A1'
      ? 'A1: ca. 14% — één kort, eenvoudig wrijvingsmoment.'
      : level === 'B1'
        ? 'B1: ca. 24% — iets natuurlijker taal; nog steeds max. één extra detail-vraag per run.'
        : 'A2: ca. 18% — één realistische verduidelijking of lichte wrijving.'

  return {
    pace: paceRegister.pace,
    register: paceRegister.register,
    tone,
    responseStyle,
    frictionStyle,
    openingVariants,
    recommendationStyle:
      'Varieer licht tussen openingsvarianten; openingszin kort en passend bij subtype, variatie en niveau.',
    frictionChance,
    guardrails: [
      ...frictionPrinciples(),
      'Blijf in-scène: woning, huur of onderhoud in Nederland; geen les over grammatica.',
    ],
  }
}

export function housingLandlordDifficultyAdjustments(level: HousingLandlordLevel): ScenarioDifficultyAdjustments {
  if (level === 'A1') {
    return {
      learnerLevel: 'A1',
      responsePacing: 'Zeer rustig; heel korte zinnen; één idee per beurt.',
      vocabularyRange: 'Eenvoudige woning- en huurwoorden: lek, kapot, warm, douche, huur, borg, datum.',
      followUpStyle: 'Maximaal één eenvoudige vervolgvraag.',
      misunderstandingLevel: 'Minimaal; één korte, vriendelijke verduidelijking.',
    }
  }
  if (level === 'B1') {
    return {
      learnerLevel: 'B1',
      responsePacing: 'Natuurlijker tempo; iets meer detail in één zin mag, beurt blijft kort.',
      vocabularyRange: 'Meer natuurlijke verhuurder-/kantoorwoordkeuze; lichte nuance, geen jargonwand.',
      followUpStyle: 'Hoogstens één gerichte vervolgvraag of lichte parafrase.',
      misunderstandingLevel: 'Lichte frictie; subtiele check zonder les te geven.',
    }
  }
  return {
    learnerLevel: 'A2',
    responsePacing: 'Normaal kort tempo; realistische huurder–professional dialoog.',
    vocabularyRange: 'Onderhoud, betaling, opzegtermijn, inclusief/exclusief — gangbare woorden.',
    followUpStyle: 'Eén verduidelijking of timing wanneer nodig.',
    misunderstandingLevel: 'Eén lichte, realistische verduidelijking toegestaan.',
  }
}
