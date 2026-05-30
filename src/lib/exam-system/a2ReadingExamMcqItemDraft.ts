import type { KnmMcqItem } from './knmMcqTypes'

/** Authoring shape — converted to bank items with typographic quotes. */
export type ReadingExamItemDraft = {
  introNl: string
  /** Must be one sentence ending with a period (for English assist split). */
  readHintEn: string
  passageNl: string
  passageEn: string
  questionNl: string
  questionEn: string
  options: KnmMcqItem['options']
  correctOptionIds: string[]
}

export function readingItemFromDraft(d: ReadingExamItemDraft): KnmMcqItem {
  const questionNl = `${d.introNl}\n\n“${d.passageNl}”\n\n${d.questionNl}`
  const questionEn = `${d.readHintEn} ${d.questionEn}`
  return {
    questionNl,
    questionEn,
    passageEn: d.passageEn.trim(),
    options: d.options,
    correctOptionIds: d.correctOptionIds,
  }
}
