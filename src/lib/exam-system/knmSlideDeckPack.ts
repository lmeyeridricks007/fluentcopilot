/**
 * KNM A2 slide-deck questions from dutch kmn slides.pdf (OCR → knmSlideDeckQuestionsData.ts).
 */
import {
  initSlideDeckIllustrationCatalog,
  knmSlideDeckIllustrationIdForIndex,
} from '@/lib/exam-prep/kmn/knmSlideDeckIllustrationCatalog'
import type { KnmMcqBankEntry } from './a2KnmExamBank'
import type { KnmMcqItem } from './knmMcqTypes'
import {
  KNM_SLIDE_DECK_QUESTION_COUNT,
  KNM_SLIDE_DECK_QUESTION_ROWS,
  type SlideDeckQuestionRow,
} from './knmSlideDeckQuestionsData'

export { KNM_SLIDE_DECK_QUESTION_COUNT, KNM_SLIDE_DECK_QUESTION_ROWS }

function deckMcqOptions(good: string, wrongs: readonly [string, string, string]): KnmMcqItem['options'] {
  return [
    { id: 'a', label: good },
    { id: 'b', label: wrongs[0] },
    { id: 'c', label: wrongs[1] },
    { id: 'd', label: wrongs[2] },
  ]
}

function rowToEntry(row: SlideDeckQuestionRow, index: number): KnmMcqBankEntry {
  return {
    category: row.category,
    questionNl: row.questionNl,
    questionEn: row.questionEn,
    illustrationId: knmSlideDeckIllustrationIdForIndex(index),
    options: deckMcqOptions(row.good, row.wrongs),
    correctOptionIds: ['a'],
    audioScriptNl: row.audioScriptNl ?? row.questionNl,
  }
}

/** Register illustration catalog for exam UI (unique animated scene per question). */
initSlideDeckIllustrationCatalog(KNM_SLIDE_DECK_QUESTION_ROWS)

export function pushKnmSlideDeckPack(out: KnmMcqBankEntry[]): void {
  KNM_SLIDE_DECK_QUESTION_ROWS.forEach((row, index) => {
    out.push(rowToEntry(row, index))
  })
}
