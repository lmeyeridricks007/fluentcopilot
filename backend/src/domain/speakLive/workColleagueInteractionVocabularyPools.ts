/**
 * Structured Dutch pools for Work / colleague interaction:
 * task topics, file/document language, time/deadline phrases, workplace verbs,
 * and learner starter phrases by variation × level.
 */

import { pickOne } from './bookingReservationsVocabularyPools'

/** Canonical task/topic ids for randomization (matches `WorkColleagueTaskFocus` in scenario). */
export const WORK_COLLEAGUE_TASK_TOPIC_POOL = [
  'document',
  'report',
  'email',
  'meeting_note',
  'presentation',
  'task_ticket',
  'planning',
  'spreadsheet',
  'file_folder',
  'approval_request',
] as const

export type WorkColleagueTaskTopicId = (typeof WORK_COLLEAGUE_TASK_TOPIC_POOL)[number]

/** Dutch nouns / anchors per task topic (assistant + learner echo). */
export const WORK_COLLEAGUE_TASK_TOPIC_LEXEMES: Record<WorkColleagueTaskTopicId, readonly string[]> = {
  document: ['het document', 'de versie', 'de bijlage', 'het concept'],
  report: ['het rapport', 'de samenvatting', 'de cijfers', 'het stuk'],
  email: ['de mail', 'het mailtje', 'de e-mail', 'het antwoord'],
  meeting_note: ['de notities', 'de actiepunten', 'het verslag van de vergadering', 'de punten van gisteren'],
  presentation: ['de presentatie', 'de slides', 'het deck', 'het overzicht'],
  task_ticket: ['de taak', 'het ticket', 'het item', 'de subtaak'],
  planning: ['de planning', 'het overzicht', 'de roadmap', 'de volgorde'],
  spreadsheet: ['de spreadsheet', 'het Excel-bestand', 'het overzicht', 'de tabel'],
  file_folder: ['het bestand', 'de map', 'de map op de drive', 'de map op Teams'],
  approval_request: ['de goedkeuring', 'het akkoord', 'de handtekening', 'het verzoek'],
}

/** General file/document vocabulary (any task). */
export const WORK_COLLEAGUE_FILE_DOCUMENT_LANGUAGE_POOL = [
  'bestand',
  'map',
  'document',
  'bijlage',
  'versie',
  'concept',
  'definitieve versie',
  'link delen',
] as const

/** Time / deadline language by level (short, speakable). */
export const WORK_COLLEAGUE_TIME_DEADLINE_A1 = [
  'vandaag',
  'morgen',
  'straks',
  'later',
  'deadline',
  'op tijd',
] as const

export const WORK_COLLEAGUE_TIME_DEADLINE_A2 = [
  ...WORK_COLLEAGUE_TIME_DEADLINE_A1,
  'eind van de dag',
  'vanmiddag',
  'voor vijf uur',
  'deze week',
] as const

export const WORK_COLLEAGUE_TIME_DEADLINE_B1 = [
  ...WORK_COLLEAGUE_TIME_DEADLINE_A2,
  'tussen twee vergaderingen door',
  'voor het weekend',
  'in lijn met de planning',
] as const

/** Workplace action / process words (verbs & close collocations). */
export const WORK_COLLEAGUE_WORKPLACE_ACTION_POOL = [
  'klaar',
  'afmaken',
  'sturen',
  'doorsturen',
  'bekijken',
  'meekijken',
  'uitleggen',
  'helpen',
  'nakijken',
  'uploaden',
  'delen',
] as const

export type WorkColleaguePoolLevel = 'A1' | 'A2' | 'B1'

export type WorkColleagueVariationStarterKey =
  | 'simple_workplace_conversation'
  | 'asking_for_help'
  | 'clarifying_tasks'

/**
 * Learner starter phrases by variation × level (Dutch).
 * A2 rows align with the product brief; A1/B1 are shorter or richer variants.
 */
export const WORK_COLLEAGUE_LEARNER_STARTER_POOLS: Record<
  WorkColleagueVariationStarterKey,
  Record<WorkColleaguePoolLevel, readonly string[]>
> = {
  simple_workplace_conversation: {
    A1: [
      'Hoe gaat het met het document?',
      'Ben je klaar?',
      'Werk je vandaag op kantoor?',
      'Kun je straks meekijken?',
    ],
    A2: [
      'Hoe gaat het met dat document?',
      'Ben je al klaar?',
      'Werk je vandaag op kantoor?',
      'Kun je straks even meekijken?',
    ],
    B1: [
      'Hoe loopt het bij jou met dat document?',
      'Ben je met dat stuk al klaar, of heb je nog iets nodig?',
      'Werk je vandaag op kantoor of juist thuis?',
      'Zou je straks even met me mee kunnen kijken?',
    ],
  },
  asking_for_help: {
    A1: [
      'Kun je helpen?',
      'Ik snap het niet.',
      'Wat moet ik doen?',
      'Waar is het?',
    ],
    A2: [
      'Kun je mij even helpen?',
      'Ik begrijp dit nog niet helemaal.',
      'Kun je uitleggen wat ik moet doen?',
      'Waar kan ik dat vinden?',
    ],
    B1: [
      'Zou je me even kunnen helpen met dit stuk?',
      'Ik zit hier nog niet helemaal lekker in — kun je me wijzen?',
      'Kun je in het kort uitleggen wat jij van mij verwacht?',
      'Weet jij waar ik dat het beste kan vinden?',
    ],
  },
  clarifying_tasks: {
    A1: [
      'Wat moet ik doen?',
      'Wanneer klaar?',
      'Naar jou sturen?',
      'Vandaag af?',
    ],
    A2: [
      'Wat moet ik precies doen?',
      'Wanneer moet dit klaar zijn?',
      'Dus ik stuur het naar jou?',
      'Moet ik dit vandaag afmaken?',
    ],
    B1: [
      'Wat is hier precies de bedoeling van mijn kant?',
      'Wanneer verwacht jij dat dit klaar is?',
      'Dus ik stuur het bestand naar jou — klopt dat?',
      'Is het realistisch dat ik dit vandaag nog afrond?',
    ],
  },
}

export function getWorkColleagueLearnerStarterPhrases(
  variation: WorkColleagueVariationStarterKey,
  level: WorkColleaguePoolLevel
): readonly string[] {
  const bank = WORK_COLLEAGUE_LEARNER_STARTER_POOLS[variation] ?? WORK_COLLEAGUE_LEARNER_STARTER_POOLS.simple_workplace_conversation
  return bank[level] ?? bank.A2
}

function timePoolForLevel(level: WorkColleaguePoolLevel): readonly string[] {
  if (level === 'A1') return WORK_COLLEAGUE_TIME_DEADLINE_A1
  if (level === 'B1') return WORK_COLLEAGUE_TIME_DEADLINE_B1
  return WORK_COLLEAGUE_TIME_DEADLINE_A2
}

function pickDistinct<T>(items: readonly T[], count: number, rng: () => number): T[] {
  const bag = [...items]
  const out: T[] = []
  while (out.length < count && bag.length) {
    const choice = pickOne(bag, rng)
    out.push(choice)
    const idx = bag.indexOf(choice)
    if (idx >= 0) bag.splice(idx, 1)
  }
  return out
}

/**
 * Compact [V] section lines for runtime context (Dutch): topic lexemes, file words, time, actions.
 */
export function buildWorkColleagueVocabularyPromptSection(params: {
  taskFocus: string
  level: WorkColleaguePoolLevel
  rng: () => number
}): string[] {
  const focus = (WORK_COLLEAGUE_TASK_TOPIC_POOL as readonly string[]).includes(params.taskFocus)
    ? (params.taskFocus as WorkColleagueTaskTopicId)
    : 'document'
  const topicLex = WORK_COLLEAGUE_TASK_TOPIC_LEXEMES[focus]
  const timePick = pickDistinct([...timePoolForLevel(params.level)], 2, params.rng)
  const actionPick = pickDistinct([...WORK_COLLEAGUE_WORKPLACE_ACTION_POOL], 2, params.rng)
  const filePick = pickDistinct([...WORK_COLLEAGUE_FILE_DOCUMENT_LANGUAGE_POOL], 2, params.rng)
  const topicPick = pickDistinct([...topicLex], 2, params.rng)
  const levelHint =
    params.level === 'A1'
      ? 'Houd voorbeelden heel kort; eenvoudige woorden.'
      : params.level === 'B1'
        ? 'Mag iets natuurlijker zakelijk; nog steeds korte beurten.'
        : 'Realistisch kantoor-Nederlands; korte zinnen.'

  return [
    '[V] Taalpool bij dit onderwerp (Nederlands — varieer; geen vaste zin herhalen)',
    `Niveauhint: ${levelHint}`,
    `Taakonderwerp (${focus}): ${topicPick.join(' · ')}`,
    `Bestand/document-taal: ${filePick.join(' · ')}`,
    `Tijd / deadline: ${timePick.join(' · ')}`,
    `Acties: ${actionPick.join(' · ')}`,
  ]
}
