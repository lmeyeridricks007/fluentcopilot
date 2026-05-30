import type { ScenarioDifficultyAdjustments, ScenarioRuntimeConfig } from '../../models/contracts'
import type {
  WorkColleagueInteractionLevel,
  WorkColleagueInteractionSubtype,
  WorkColleagueInteractionVariation,
} from './workColleagueInteractionScenario'
import { buildWorkColleagueVocabularyPromptSection } from './workColleagueInteractionVocabularyPools'

const ASSISTANT_DUTY_NL =
  'Alle zinnen aan de oefenaar zijn uitsluitend Nederlands; geen Engels (ook geen begroeting in het Engels).'

/** [1] Gedeelde systeemrol — collega / team / leiding in NL-werkcontext; geen tutor. */
function sharedSystemRole(): string[] {
  return [
    '[1] Systeemrol (gedeeld)',
    'Je bent een Nederlandstalige collega, teamgenoot of leidinggevende in een realistische werkomgeving in Nederland.',
    'Je blijft in rol: reageer natuurlijk, kort en passend bij het niveau van de oefenaar.',
    'Je bent geen taaldocent tijdens het gesprek — geen grammaticales, geen expliciete correcties als “les”.',
  ]
}

/** [2] Algemene regels — scene, tempo, coachbaarheid. */
function globalRules(): string[] {
  return [
    '[2] Algemene regels',
    '- Blijf in het Nederlands en in de werkscene (kantoor/team — taaloefening).',
    '- Houd beurten kort: één of twee zinnen; maximaal één vraag per beurt.',
    '- Gebruik praktisch werk-Nederlands; geen overdreven corporate jargon.',
    '- Geen grammatica-onderwijs of meta-uitleg over het Nederlands.',
    '- Blijf realistisch en professioneel; vraag één ding tegelijk.',
    '- Als de oefenaar al deadline, document, taak of vervolgstap noemde: niet exact hetzelfde opnieuw vragen; bevestig kort of vraag één nieuw ontbrekend detail.',
    '- Geen horeca-/winkelregister: vermijd “van dienst zijn”, “waarmee kan ik u helpen?” en vergelijkbare bedieningsformules — dit is collega’s op kantoor, geen balie.',
  ]
}

/** [F] Lichte wrijving — coachbaar, nooit escalerend. */
function frictionPrinciples(): string[] {
  return [
    '[F] Lichte wrijving (max. één betekenisvol moment per korte run)',
    'Toegestaan: vragen welk bestand/taak/document bedoeld wordt; vragen wanneer iets nodig is; vragen of de oefenaar al begonnen is; een deadline noemen zodat de oefenaar kan bevestigen; lichte dubbelzinnigheid die de oefenaar mag verduidelijken.',
    'Nooit: conflict-escalatie, zwaar prestatiegesprek, kantoorpolitiek, stressvolle of intimiderende manager-scène, pesten, dreigen, juridische of HR-escalatie, meerdere crises tegelijk.',
  ]
}

const SUBTYPE_LABEL_NL: Record<WorkColleagueInteractionSubtype, string> = {
  colleague_chat: 'collega — informeel-professioneel, vriendelijk, niet té chatty; snelle status- of taak-check-in',
  team_task: 'teamafstemming — praktisch, taakgericht, samenwerkend; maximaal één brok informatie per beurt',
  manager_or_lead_request:
    'leidinggevende — iets directer, nog steeds ondersteunend; voortgang, verwachting of één eenvoudige taakinstructie',
}

function subtypeBlock(subType: WorkColleagueInteractionSubtype): string[] {
  if (subType === 'colleague_chat') {
    return [
      '[3] Subtype: COLLEAGUE_CHAT',
      `Setting: ${SUBTYPE_LABEL_NL.colleague_chat}.`,
      'Gedrag: informeel-professioneel; vriendelijk; niet té chatty; snelle status- of taak-check-ins.',
    ]
  }
  if (subType === 'team_task') {
    return [
      '[3] Subtype: TEAM_TASK',
      `Setting: ${SUBTYPE_LABEL_NL.team_task}.`,
      'Gedrag: praktisch en taakgericht; samenwerkend; één brok informatie per beurt.',
    ]
  }
  return [
    '[3] Subtype: MANAGER_OR_LEAD_REQUEST',
    `Setting: ${SUBTYPE_LABEL_NL.manager_or_lead_request}.`,
    'Gedrag: iets directer, blijf ondersteunend; vraag kort naar voortgang, bevestig verwachting of geef één eenvoudige taakinstructie.',
  ]
}

function variationBlock(variation: WorkColleagueInteractionVariation): string[] {
  if (variation === 'simple_workplace_conversation') {
    return [
      '[4] Variatie: simple_workplace_conversation',
      'Scene: de oefenaar voert een kort werkgerelateerd gesprek met een collega.',
      'Assistentstijl: kort, natuurlijk, status/taakgericht; hoogstens één vervolgvraag in je beurt.',
      'Voorbeelden (toon en lengte; varieer, niet herhalen als vaste tekst):',
      '  • “Hoe gaat het met dat document?”',
      '  • “Ben je al klaar met de notities?”',
      '  • “Werk je vandaag op kantoor?”',
      '  • “Kun je straks even meekijken?”',
    ]
  }
  if (variation === 'asking_for_help') {
    return [
      '[4] Variatie: asking_for_help',
      'Scene: de oefenaar heeft hulp nodig bij een taak en wil dat duidelijk en natuurlijk vragen.',
      'Assistentstijl: ondersteunend en praktisch; zo nodig één ontbrekend detail vragen (één vraag).',
      'Voorbeelden (toon; varieer):',
      '  • “Waar heb je precies hulp bij nodig?”',
      '  • “Welk bestand bedoel je?”',
      '  • “Ik kan zo even meekijken.”',
      '  • “Wat snap je nog niet?”',
    ]
  }
  return [
    '[4] Variatie: clarifying_tasks',
    'Scene: de oefenaar moet verduidelijken wat hij/zij precies moet doen.',
    'Assistentstijl: helder, praktisch, taakgericht; één verduidelijking of instructie per beurt.',
    'Voorbeelden (toon; varieer):',
    '  • “Je moet eerst het rapport afmaken.”',
    '  • “Dat moet vandaag klaar zijn.”',
    '  • “Stuur het daarna naar mij.”',
    '  • “Ik bedoel de presentatie van gisteren.”',
  ]
}

function levelBlock(level: WorkColleagueInteractionLevel): string[] {
  if (level === 'A1') {
    return [
      '[L] Niveau: A1',
      '- Eenvoudige werkvragen; heel korte zinnen.',
      '- Korte taakwoorden (document, mail, vandaag, morgen, help); minimale detailstapeling.',
    ]
  }
  if (level === 'B1') {
    return [
      '[L] Niveau: B1',
      '- Natuurlijker zakelijk Nederlands.',
      '- Lichte dubbelzinnigheid mag — de oefenaar mag doorvragen.',
      '- Iets rijkere taak- en detailtaal, nog steeds in korte beurten.',
    ]
  }
  return [
    '[L] Niveau: A2',
    '- Realistische, praktische werkinteracties.',
    '- Taak verduidelijken en om hulp vragen passen bij dit niveau.',
    '- Eenvoudige professionele toon; één verduidelijking per keer is prima.',
  ]
}

function frictionInstructionLine(frictionEnabled: boolean, frictionLine: string): string[] {
  if (!frictionEnabled) return ['[R] Geen extra wrijving in deze run — stem kort af en blijf praktisch en vriendelijk.']
  return [`[R] Wrijvingsinstructie voor deze run (één moment): ${frictionLine}`]
}

function oneSentence(s: string): string {
  const t = s.trim().replace(/\s+/g, ' ')
  return t.endsWith('.') ? t : `${t}.`
}

/** Volledige runtime-context voor hoofd-prompt (secties [1]–[R], plus optioneel [V]). */
export function buildWorkColleagueInteractionRuntimeContext(params: {
  subType: WorkColleagueInteractionSubtype
  variation: WorkColleagueInteractionVariation
  level: WorkColleagueInteractionLevel
  taskLine: string
  situationLine: string
  frictionLine: string
  frictionEnabled: boolean
  /** When set with `vocabularyRng`, a compact Dutch vocabulary block is appended. */
  taskFocus?: string
  vocabularyRng?: () => number
}): string {
  const head = `Kern van deze run: ${oneSentence(params.taskLine)} Situatie: ${oneSentence(params.situationLine)}`
  const vocabularySection =
    params.taskFocus?.trim() && params.vocabularyRng
      ? ['', '---', ...buildWorkColleagueVocabularyPromptSection({ taskFocus: params.taskFocus, level: params.level, rng: params.vocabularyRng })]
      : []
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
    ...vocabularySection,
    '',
    '---',
    ...frictionPrinciples(),
    '',
    '---',
    ...frictionInstructionLine(params.frictionEnabled, params.frictionLine),
  ]
  return sections.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

/** Compact gedrag voor assistantBehavior (ook zichtbaar als samengevat in scenario-partial). */
const ASSISTANT_COMPACT_RULES = [
  'Volg Runtime context als bron: secties [1] systeemrol, [2] regels, [3] subtype, [4] variatie, [L] niveau, [V] taalpool (indien aanwezig), [F]/[R] wrijving.',
  'Kort en collegiaal; maximaal één vraag per beurt; geen tutor-gedrag.',
  'Herhaal geen feiten die al in het gesprek staan — bevestig of vraag één nieuw detail.',
]

export function buildWorkColleagueInteractionAssistantBehavior(params: {
  subType: WorkColleagueInteractionSubtype
  variation: WorkColleagueInteractionVariation
  level: WorkColleagueInteractionLevel
  frictionEnabled: boolean
  openingVariants: string[]
}): ScenarioRuntimeConfig['assistantBehavior'] {
  const { subType, variation, level, frictionEnabled, openingVariants } = params
  const paceRegister =
    subType === 'colleague_chat'
      ? { pace: 'light-friendly', register: 'Informeel-professioneel: snelle status- of taak-check-in.' }
      : subType === 'team_task'
        ? { pace: 'task-practical', register: 'Team: taakgericht, samenwerkend — één brok per beurt.' }
        : { pace: 'calm-directive', register: 'Leiding: iets directer, ondersteunend — voortgang of duidelijke instructie.' }

  const tone =
    subType === 'colleague_chat' ? 'warm-professional' : subType === 'team_task' ? 'collaborative' : 'calm-lead'

  const variationOneLiner =
    variation === 'simple_workplace_conversation'
      ? 'Variatie: korte werkpraat — status/taak, natuurlijke toon.'
      : variation === 'asking_for_help'
        ? 'Variatie: om hulp vragen — ondersteunend, één detail tegelijk.'
        : 'Variatie: taak verduidelijken — helder, één verduidelijking per beurt.'

  const responseStyle: string[] = [
    ASSISTANT_DUTY_NL,
    ...ASSISTANT_COMPACT_RULES,
    `Subtype (${subType}): ${SUBTYPE_LABEL_NL[subType]}.`,
    variationOneLiner,
    `Niveau: ${level} — zie [L] in Runtime context voor taalrijkdom en tempo.`,
  ]

  const frictionStyle = frictionEnabled
    ? ['Hoogstens één wrijvingsmoment volgens [F] en [R] in Runtime context (bestand/taak/timing/begonnen?).']
    : ['Geen extra wrijving: help direct en kort ([R] in Runtime context).']

  const frictionChance =
    level === 'A1'
      ? 'A1: ca. 12% — één kort wrijvingsmoment.'
      : level === 'B1'
        ? 'B1: ca. 22% — iets meer nuance, nog steeds vriendelijk en kort.'
        : 'A2: ca. 18% — één verduidelijking of klein misverstand.'

  return {
    pace: paceRegister.pace,
    register: paceRegister.register,
    tone,
    responseStyle,
    frictionStyle,
    openingVariants,
    recommendationStyle: 'Varieer licht tussen openingsvarianten; houd de openingszin kort en passend bij subtype en niveau.',
    frictionChance,
    guardrails: [...frictionPrinciples(), 'Blijf in-scène (werkplek in Nederland).'],
  }
}

export function workColleagueInteractionDifficultyAdjustments(
  level: WorkColleagueInteractionLevel
): ScenarioDifficultyAdjustments {
  if (level === 'A1') {
    return {
      learnerLevel: 'A1',
      responsePacing: 'Zeer rustig; heel korte zinnen; één idee per beurt.',
      vocabularyRange: 'document, mail, vandaag, morgen, help, taak — weinig tegelijk; minimale detailstapeling.',
      followUpStyle: 'Maximaal één eenvoudige vervolgvraag.',
      misunderstandingLevel: 'Minimaal; één korte verduidelijking.',
    }
  }
  if (level === 'B1') {
    return {
      learnerLevel: 'B1',
      responsePacing: 'Natuurlijker werktempo; iets meer detail in één zin mag, beurt blijft kort.',
      vocabularyRange: 'Zakelijk maar toegankelijk; lichte nuance en rijkere taaktaal.',
      followUpStyle: 'Hoogstens één gerichte vervolgvraag; ketens kort houden.',
      misunderstandingLevel: 'Lichte frictie; subtiele correctie zonder les te geven.',
    }
  }
  return {
    learnerLevel: 'A2',
    responsePacing: 'Normaal kort kantoortempo; realistische werkinteracties.',
    vocabularyRange: 'Gangbare woorden voor deadline, mail, verslag, ticket, taak.',
    followUpStyle: 'Eén verduidelijking wanneer nodig.',
    misunderstandingLevel: 'Eén lichte misverstand-correctie toegestaan.',
  }
}
