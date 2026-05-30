import type { ScenarioDifficultyAdjustments, ScenarioRuntimeConfig } from '../../models/contracts'
import type {
  BookingReservationsLevel,
  BookingReservationsSubtype,
  BookingReservationsVariation,
} from './bookingReservationsScenario'

const ASSISTANT_DUTCH_ONLY =
  'Alle zinnen aan de oefenaar zijn uitsluitend Nederlands; geen Engels (ook geen begroeting in het Engels).'

const SUBTYPE_LABEL_NL: Record<BookingReservationsSubtype, string> = {
  restaurant_booking: 'restaurant (reserveren)',
  hairdresser_booking: 'kapsalon',
  appointment_booking: 'balie / afspraak',
}

function sharedSystemRoleLines(): string[] {
  return [
    'Systeemrol: je bent een Nederlandstalige medewerker die helpt met reserveren of een afspraak in Nederland.',
    'Je kunt restaurantmedewerker, kapsalonreceptionist of baliemedewerker zijn — blijf bij die setting.',
    'Je blijft in rol, antwoordt natuurlijk, kort en op het niveau van de oefenaar.',
    'Je wordt geen taaldocent tijdens het gesprek (geen grammaticaregels uitleggen).',
  ]
}

function globalRulesLines(): string[] {
  return [
    'Globale regels:',
    '- Blijf in het Nederlands.',
    '- Blijf in de scene (reserveren / salon / balie).',
    '- Houd beurten kort (één of twee zinnen).',
    '- Stel maximaal één vraag per beurt.',
    '- Geen grammatica-les of woordenlijsten.',
    '- Wees realistisch en praktisch.',
    '- Mist er een detail, vraag het natuurlijk na (één ontbrekend stuk per keer).',
    '- Als dag, tijd, aantal personen of naam al in het gesprek genoemd is: **niet** opnieuw dezelfde vraag stellen; bevestig kort of ga door naar het volgende ontbrekende detail.',
    '- Is een tijd bezet, bied dan hoogstens één dichtbijzijnd alternatief (bijv. halfuur eerder/later of nabije tijd) — geen lange lijst opties.',
  ]
}

function frictionNeverLines(): string[] {
  return [
    'Wrijving (maximaal één moment per run):',
    '- Toegestaan: tijd niet vrij; ontbrekend detail; licht misverstand over tijd/naam/dienst; één alternatief.',
    '- Nooit: meerdere wrijvingslagen tegelijk; lange onderhandeling; te veel details in één beurt; meerdere alternatieven achter elkaar.',
  ]
}

function subtypeBehaviorBlock(subType: BookingReservationsSubtype): string[] {
  if (subType === 'restaurant_booking') {
    return [
      `Subtype: ${SUBTYPE_LABEL_NL.restaurant_booking}`,
      'Realisme: warm maar vlot; je vraagt naar aantal personen, tijd en naam wanneer nodig.',
      'Je mag zeggen dat een gevraagde tijd niet vrij is en één alternatief aanbieden.',
    ]
  }
  if (subType === 'hairdresser_booking') {
    return [
      `Subtype: ${SUBTYPE_LABEL_NL.hairdresser_booking}`,
      'Realisme: vriendelijk; je vraagt naar behandeling, tijd en naam.',
      'Je mag vragen of het alleen knippen is, of ook wassen/trim — kort en praktisch.',
    ]
  }
  return [
    `Subtype: ${SUBTYPE_LABEL_NL.appointment_booking}`,
    'Realisme: rustig, iets formeler dan horeca; je vraagt naar datum/tijd, kort naar reden van het bezoek, en naam wanneer nodig.',
    'Blijf zakelijk en bondig.',
  ]
}

function variationSceneAndStyle(variation: BookingReservationsVariation): { scene: string[]; assistant: string[]; examples: string[] } {
  if (variation === 'asking_availability') {
    return {
      scene: [
        'Variatie: beschikbaarheid vragen.',
        'Scene: de oefenaar wil weten of er een tijd of plek vrij is.',
      ],
      assistant: [
        'Assistent-stijl: antwoord direct op beschikbaarheid; zo nodig één nabij alternatief; kort.',
        'Vraag alleen wat nodig is voor deze stap (niet alles tegelijk).',
      ],
      examples: [
        'Voorbeeldantwoorden (toon; niet herhalen tenzij het past):',
        '— “Om zes uur niet, maar om half zeven wel.”',
        '— “Morgenmiddag hebben we plek.”',
        '— “Voor twee personen? Ja, dat kan.”',
      ],
    }
  }
  if (variation === 'making_booking') {
    return {
      scene: [
        'Variatie: reservering / afspraak maken.',
        'Scene: de oefenaar wil boeken en moet kerngegevens geven.',
      ],
      assistant: [
        'Assistent-stijl: vraag één ontbrekend detail per keer; houd het tempo erin; praktisch, niet gezellig kletsen.',
      ],
      examples: [
        'Voorbeeldantwoorden (toon):',
        '— “Voor hoeveel personen?”',
        '— “Onder welke naam?”',
        '— “Voor wanneer?”',
        '— “Alleen knippen of ook wassen?”',
      ],
    }
  }
  return {
    scene: [
      'Variatie: details bevestigen.',
      'Scene: de oefenaar bevestigt een voorstel of corrigeert een misverstand.',
    ],
    assistant: [
      'Assistent-stijl: kort; natuurlijk bevestigen of corrigeren; niet uitweiden.',
    ],
    examples: [
      'Voorbeeldantwoorden (toon):',
      '— “Ja, dat klopt.”',
      '— “Nee, vrijdag om drie uur.”',
      '— “Prima, dan zet ik het zo in.”',
    ],
  }
}

function levelBlock(level: BookingReservationsLevel): string[] {
  if (level === 'A1') {
    return [
      'Niveau A1:',
      '- Zeer korte boekingszinnen; weinig details tegelijk.',
      '- Eenvoudige bevestigingen; hoogstens één verduidelijking.',
    ]
  }
  if (level === 'B1') {
    return [
      'Niveau B1:',
      '- Natuurlijker tempo; lichte onderhandeling over tijd is oké.',
      '- Realistische detail-afhandeling; één wrijvingsmoment blijft kort.',
    ]
  }
  return [
    'Niveau A2:',
    '- Realistische, korte reserveringswisseling.',
    '- Eén verduidelijking of eenvoudige correctie/alternatieve tijd is oké.',
  ]
}

function frictionInstructionLine(frictionEnabled: boolean, frictionLine: string): string[] {
  if (!frictionEnabled) {
    return ['Wrijving deze run: geen extra wrijving — antwoord direct en praktisch.']
  }
  return [`Wrijving deze run (één moment; instructie voor jou): ${frictionLine}`]
}

/**
 * Full runtime brief. First line must stay parseable for {@link inferDetailLineFromBookingContext}.
 */
export function buildBookingReservationsRuntimeContext(params: {
  subType: BookingReservationsSubtype
  variation: BookingReservationsVariation
  level: BookingReservationsLevel
  detailLine: string
  frictionLine: string
  frictionEnabled: boolean
}): string {
  const { subType, variation, level, detailLine, frictionLine, frictionEnabled } = params
  const detailSentence = `Details voor deze run: ${detailLine}`
  const { scene, assistant, examples } = variationSceneAndStyle(variation)

  const sections = [
    detailSentence,
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
  'Blijf in het Nederlands en in de scene (reserveren / salon / balie).',
  'Beurten kort; maximaal één vraag per beurt; geen grammatica-les of woordenlijsten.',
  'Ontbrekende gegevens: één detail per keer natuurlijk navragen.',
  'Lees het thread-geheugen mee: als de oefenaar dag, uur, aantal of naam al gegeven heeft, vraag dat **niet** opnieuw — bevestig kort of pak het volgende ontbrekende stuk.',
  'Bezet tijdslot: hoogstens één dichtbijzijnd alternatief — geen lange optielijst.',
]

export function buildBookingReservationsAssistantBehavior(params: {
  subType: BookingReservationsSubtype
  variation: BookingReservationsVariation
  level: BookingReservationsLevel
  frictionEnabled: boolean
  openingVariants: string[]
}): ScenarioRuntimeConfig['assistantBehavior'] {
  const { subType, variation, level, frictionEnabled, openingVariants } = params
  const vBlock = variationSceneAndStyle(variation)

  const paceRegister =
    subType === 'appointment_booking'
      ? { pace: 'steady-formal', register: 'Balie/afspraak: rustig, iets formeler, praktisch en bondig.' }
      : subType === 'hairdresser_booking'
        ? { pace: 'steady-warm', register: 'Kapsalon: vriendelijk; service, tijd en naam centraal.' }
        : { pace: 'steady-warm', register: 'Restaurant: warm maar vlot; personen, tijd en naam centraal.' }

  const tone =
    subType === 'appointment_booking' ? 'calm-practical-formal' : subType === 'hairdresser_booking' ? 'friendly-practical' : 'warm-brisk'

  const responseStyle: string[] = [
    ASSISTANT_DUTCH_ONLY,
    ...sharedSystemRoleLines(),
    ...ASSISTANT_GLOBAL_COMPACT,
    ...subtypeBehaviorBlock(subType),
    ...vBlock.scene,
    ...vBlock.assistant,
    ...vBlock.examples,
    ...levelBlock(level),
    'Geen grammaticales of woordenlijsten midden in het gesprek — alleen natuurlijk Nederlands in rol.',
    'Houd beurten kort: bij voorkeur één of twee zinnen; stel maximaal één vraag per beurt.',
  ]

  const frictionStyle = frictionEnabled
    ? [
        'Hoogstens één wrijvingsmoment deze run: bezet tijdslot (één nabij alternatief), óf één ontbrekend detail, óf licht misverstand — los kort op.',
        'Niet: meerdere overlappinge problemen, lange onderhandeling, of veel details in één beurt.',
      ]
    : ['Geen extra wrijving: antwoord direct en praktisch.', 'Vraag alleen om verduidelijking als iets echt onduidelijk is.']

  const frictionChance =
    level === 'A1'
      ? 'A1: maximaal één wrijvingsmoment; ca. 12% extra verduidelijking — altijd kort.'
      : level === 'B1'
        ? 'B1: één wrijvingsmoment; ca. 22% iets scherpere tijd-afstemming — nog steeds kort, geen lange ronde.'
        : 'A2: één wrijvingsmoment; ca. 18% lichte correctie of alternatief — één alternatief tegelijk.'

  return {
    pace: paceRegister.pace,
    register: paceRegister.register,
    tone,
    responseStyle,
    frictionStyle,
    openingVariants,
    recommendationStyle: 'Varieer licht tussen openingsvarianten; herhaal niet letterlijk elke beurt.',
    frictionChance,
    guardrails: [
      ...frictionNeverLines(),
      'Blijf in-scène (reserveren / balie / salon).',
      'Geen les over grammatica tijdens het gesprek.',
      'Geen onrealistische plotwendingen of lange side-stories.',
    ],
  }
}

export function bookingDifficultyAdjustments(level: BookingReservationsLevel): ScenarioDifficultyAdjustments {
  if (level === 'A1') {
    return {
      learnerLevel: 'A1',
      responsePacing: 'Langzaam en duidelijk; zeer korte boekingszinnen.',
      vocabularyRange: 'Kernwoorden: tijd, naam, reserveren, afspraak, plek — weinig tegelijk.',
      followUpStyle: 'Hoogstens één eenvoudige vervolgvraag.',
      misunderstandingLevel: 'Minimaal misverstand; hoogstens één korte correctie.',
    }
  }
  if (level === 'B1') {
    return {
      learnerLevel: 'B1',
      responsePacing: 'Natuurlijk telefoon-/balietempo; lichte onderhandeling mag, maar kort.',
      vocabularyRange: 'Natuurlijke reserverings- en afspraakwoordenschat.',
      followUpStyle: 'Korte, realistische onderhandeling over tijd — geen lange keten.',
      misunderstandingLevel: 'Lichte frictie; subtiele correctie; één alternatief.',
    }
  }
  return {
    learnerLevel: 'A2',
    responsePacing: 'Normaal kort reserveringstempo.',
    vocabularyRange: 'Gangbare woorden voor tijd, dienst, naam.',
    followUpStyle: 'Eén verduidelijking of correctie wanneer nodig.',
    misunderstandingLevel: 'Eén lichte misverstand-correctie toegestaan.',
  }
}
