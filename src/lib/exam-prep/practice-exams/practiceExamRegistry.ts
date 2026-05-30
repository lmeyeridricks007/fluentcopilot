/**
 * Registry of fixed practice exam sets (content-driven). Extend here — UI reads from registry only.
 */
import type {
  KmnPracticeExamSetDef,
  ListeningPracticeExamSetDef,
  PracticeExamModule,
  PracticeExamSetDef,
  ReadingPracticeExamSetDef,
  SpeakingPracticeExamSetDef,
  WritingPracticeExamSetDef,
} from '@/lib/exam-prep/practice-exams/types'
import { PRACTICE_EXAM_CONTENT_VERSION } from '@/lib/exam-prep/practice-exams/types'

const SPEAKING: SpeakingPracticeExamSetDef[] = [
  {
    id: 'speaking-pe-1',
    module: 'speaking',
    version: PRACTICE_EXAM_CONTENT_VERSION,
    ordinal: 1,
    titleNl: 'Spreken — oefenexamen 1',
    subtitleNl: 'Structuur 2025: 18 vragen, één klok (~35 min), zonder hulp tijdens het examen.',
    estimatedMinutes: 35,
  },
  {
    id: 'speaking-pe-2',
    module: 'speaking',
    version: PRACTICE_EXAM_CONTENT_VERSION,
    ordinal: 2,
    titleNl: 'Spreken — oefenexamen 2',
    subtitleNl: 'Zelfde opzet; andere volgorde uit de bank (seed per set).',
    estimatedMinutes: 35,
  },
  {
    id: 'speaking-pe-3',
    module: 'speaking',
    version: PRACTICE_EXAM_CONTENT_VERSION,
    ordinal: 3,
    titleNl: 'Spreken — oefenexamen 3',
    subtitleNl: 'Video-/afbeelding-/gespreksdelen in één sessie — zoals de productsimulatie.',
    estimatedMinutes: 35,
  },
  {
    id: 'speaking-pe-4',
    module: 'speaking',
    version: PRACTICE_EXAM_CONTENT_VERSION,
    ordinal: 4,
    titleNl: 'Spreken — oefenexamen 4',
    subtitleNl: 'Laatste vaste set-id voor trendvergelijking tussen pogingen.',
    estimatedMinutes: 35,
  },
]

const WRITING: WritingPracticeExamSetDef[] = [
  {
    id: 'writing-pe-1',
    module: 'writing',
    version: PRACTICE_EXAM_CONTENT_VERSION,
    ordinal: 1,
    titleNl: 'Schrijven — oefenexamen 1',
    subtitleNl: 'Formulier → twee berichten → tekst voor iedereen (vaste opdrachten).',
    estimatedMinutes: 42,
    writingTaskIds: ['wt-form-01', 'wt-message-01', 'wt-message-02', 'wt-audience-01'],
  },
  {
    id: 'writing-pe-2',
    module: 'writing',
    version: PRACTICE_EXAM_CONTENT_VERSION,
    ordinal: 2,
    titleNl: 'Schrijven — oefenexamen 2',
    subtitleNl: 'Zelfde examenstructuur, andere formulier- en publiekstekst.',
    estimatedMinutes: 42,
    writingTaskIds: ['wt-form-02', 'wt-message-01', 'wt-message-02', 'wt-audience-02'],
  },
  {
    id: 'writing-pe-3',
    module: 'writing',
    version: PRACTICE_EXAM_CONTENT_VERSION,
    ordinal: 3,
    titleNl: 'Schrijven — oefenexamen 3',
    subtitleNl: 'Berichten in andere volgorde — traint flexibiliteit binnen vaste set.',
    estimatedMinutes: 42,
    writingTaskIds: ['wt-form-01', 'wt-message-02', 'wt-message-01', 'wt-audience-02'],
  },
  {
    id: 'writing-pe-4',
    module: 'writing',
    version: PRACTICE_EXAM_CONTENT_VERSION,
    ordinal: 4,
    titleNl: 'Schrijven — oefenexamen 4',
    subtitleNl: 'Laatste vaste mix: tweede formulier, omgekeerde berichten, eerste publiekstekst.',
    estimatedMinutes: 42,
    writingTaskIds: ['wt-form-02', 'wt-message-02', 'wt-message-01', 'wt-audience-01'],
  },
]

const LISTENING: ListeningPracticeExamSetDef[] = [
  {
    id: 'listening-pe-1',
    module: 'listening',
    version: PRACTICE_EXAM_CONTENT_VERSION,
    ordinal: 1,
    titleNl: 'Luisteren — oefenexamen 1',
    subtitleNl: '25 vragen, ~40 minuten, max. 2× herhalen per fragment, geen transcript.',
    estimatedMinutes: 40,
  },
  {
    id: 'listening-pe-2',
    module: 'listening',
    version: PRACTICE_EXAM_CONTENT_VERSION,
    ordinal: 2,
    titleNl: 'Luisteren — oefenexamen 2',
    subtitleNl: 'Zelfde examenlengte; andere volgorde uit de bank (seed per set).',
    estimatedMinutes: 40,
  },
  {
    id: 'listening-pe-3',
    module: 'listening',
    version: PRACTICE_EXAM_CONTENT_VERSION,
    ordinal: 3,
    titleNl: 'Luisteren — oefenexamen 3',
    subtitleNl: 'Meerkeuze na elk fragment — examenomstandigheden.',
    estimatedMinutes: 40,
  },
  {
    id: 'listening-pe-4',
    module: 'listening',
    version: PRACTICE_EXAM_CONTENT_VERSION,
    ordinal: 4,
    titleNl: 'Luisteren — oefenexamen 4',
    subtitleNl: 'Laatste vaste set-id voor vergelijking tussen pogingen.',
    estimatedMinutes: 40,
  },
]

const READING: ReadingPracticeExamSetDef[] = [
  {
    id: 'reading-pe-1',
    module: 'reading',
    version: PRACTICE_EXAM_CONTENT_VERSION,
    ordinal: 1,
    titleNl: 'Lezen — oefenexamen 1',
    subtitleNl: '25 meerkeuzevragen, ~65 minuten, kennis-/detail-/bedoelingsvragen bij korte teksten.',
    estimatedMinutes: 65,
  },
  {
    id: 'reading-pe-2',
    module: 'reading',
    version: PRACTICE_EXAM_CONTENT_VERSION,
    ordinal: 2,
    titleNl: 'Lezen — oefenexamen 2',
    subtitleNl: 'Zelfde lengte; andere volgorde uit de bank (seed per set).',
    estimatedMinutes: 65,
  },
  {
    id: 'reading-pe-3',
    module: 'reading',
    version: PRACTICE_EXAM_CONTENT_VERSION,
    ordinal: 3,
    titleNl: 'Lezen — oefenexamen 3',
    subtitleNl: 'Examenmodus: geen hints of vertalingen tijdens het examen.',
    estimatedMinutes: 65,
  },
  {
    id: 'reading-pe-4',
    module: 'reading',
    version: PRACTICE_EXAM_CONTENT_VERSION,
    ordinal: 4,
    titleNl: 'Lezen — oefenexamen 4',
    subtitleNl: 'Laatste vaste set-id voor vergelijking tussen pogingen.',
    estimatedMinutes: 65,
  },
]

const KMN: KmnPracticeExamSetDef[] = [
  {
    id: 'kmn-pe-1',
    module: 'kmn',
    version: PRACTICE_EXAM_CONTENT_VERSION,
    ordinal: 1,
    titleNl: 'KNM — oefenexamen 1',
    subtitleNl: '40 meerkeuzevragen, ~45 minuten — maatschappelijke kennis (werk, zorg, overheid, cultuur, onderwijs).',
    estimatedMinutes: 45,
  },
  {
    id: 'kmn-pe-2',
    module: 'kmn',
    version: PRACTICE_EXAM_CONTENT_VERSION,
    ordinal: 2,
    titleNl: 'KNM — oefenexamen 2',
    subtitleNl: 'Zelfde lengte; andere volgorde uit de vraagbank (seed per set).',
    estimatedMinutes: 45,
  },
  {
    id: 'kmn-pe-3',
    module: 'kmn',
    version: PRACTICE_EXAM_CONTENT_VERSION,
    ordinal: 3,
    titleNl: 'KNM — oefenexamen 3',
    subtitleNl: 'Geen uitleg tijdens het examen — alleen resultaat achteraf.',
    estimatedMinutes: 45,
  },
  {
    id: 'kmn-pe-4',
    module: 'kmn',
    version: PRACTICE_EXAM_CONTENT_VERSION,
    ordinal: 4,
    titleNl: 'KNM — oefenexamen 4',
    subtitleNl: 'Laatste vaste set-id voor vergelijking tussen pogingen.',
    estimatedMinutes: 45,
  },
]

export const PRACTICE_EXAM_SETS: PracticeExamSetDef[] = [
  ...SPEAKING,
  ...WRITING,
  ...LISTENING,
  ...READING,
  ...KMN,
]

export function listPracticeExamSetsForModule(module: PracticeExamModule): PracticeExamSetDef[] {
  return PRACTICE_EXAM_SETS.filter((s) => s.module === module).sort((a, b) => a.ordinal - b.ordinal)
}

export function getPracticeExamSet(setId: string): PracticeExamSetDef | undefined {
  return PRACTICE_EXAM_SETS.find((s) => s.id === setId)
}
