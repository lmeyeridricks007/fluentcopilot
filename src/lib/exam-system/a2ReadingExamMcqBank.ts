import type { KnmMcqItem } from './knmMcqTypes'
import { readingItemFromDraft } from './a2ReadingExamMcqItemDraft'
import { A2_READING_EXAM_MCQ_DRAFTS } from './a2ReadingExamMcqItems'

/**
 * A2 Leesvaardigheid-style bank: short–medium Dutch source texts (note, e-mail, folder,
 * notice, simple news, web blurb). Each item uses typographic quotes around the passage.
 */
/** Full stem (intro + passage + question); passages are longer, so total is usually 300+. */
const MIN_QUESTION_NL_CHARS = 260
const MAX_QUESTION_NL_CHARS = 750
const MIN_QUESTION_EN_CHARS = 32
const MAX_QUESTION_EN_CHARS = 280
/** Body between “…” — slightly longer than before for more realistic exam texts. */
const MIN_PASSAGE_NL_CHARS = 140
const MAX_PASSAGE_NL_CHARS = 480
const MIN_OPTION_LABEL_CHARS = 5
const MAX_OPTION_LABEL_CHARS = 140

/**
 * Opening “ (U+201C) … closing ” (U+201D) — must wrap the source text for length checks.
 * Do not use these curly quote characters inside the passage body (they would end the match early).
 */
const PASSAGE_BLOCK = /\n\n\u201c([^\u201d]+)\u201d\n\n/

function assertReadingBank(items: KnmMcqItem[], label: string) {
  for (const it of items) {
    const n = it.questionNl.length
    if (n < MIN_QUESTION_NL_CHARS || n > MAX_QUESTION_NL_CHARS) {
      throw new Error(
        `${label}: questionNl length ${n} out of range [${MIN_QUESTION_NL_CHARS}, ${MAX_QUESTION_NL_CHARS}] (starts: ${it.questionNl.slice(0, 60)}…)`,
      )
    }
    const en = it.questionEn.length
    if (en < MIN_QUESTION_EN_CHARS || en > MAX_QUESTION_EN_CHARS) {
      throw new Error(`${label}: questionEn length ${en} out of range [${MIN_QUESTION_EN_CHARS}, ${MAX_QUESTION_EN_CHARS}]`)
    }
    const passageMatch = it.questionNl.match(PASSAGE_BLOCK)
    if (!passageMatch) {
      throw new Error(
        `${label}: questionNl must contain a passage wrapped in typographic quotes “…”, after a blank line. Snippet: ${it.questionNl.slice(0, 80)}…`,
      )
    }
    const passageLen = passageMatch[1].length
    if (passageLen < MIN_PASSAGE_NL_CHARS || passageLen > MAX_PASSAGE_NL_CHARS) {
      throw new Error(
        `${label}: passage length ${passageLen} out of range [${MIN_PASSAGE_NL_CHARS}, ${MAX_PASSAGE_NL_CHARS}] (starts: ${passageMatch[1].slice(0, 50)}…)`,
      )
    }
    if (!it.passageEn?.trim()) {
      throw new Error(`${label}: passageEn required (starts: ${it.questionNl.slice(0, 50)}…)`)
    }
    if (it.options.length !== 4) {
      throw new Error(`${label}: expected exactly 4 options`)
    }
    for (const o of it.options) {
      const L = o.label.length
      if (L < MIN_OPTION_LABEL_CHARS || L > MAX_OPTION_LABEL_CHARS) {
        throw new Error(`${label}: option "${o.id}" label length ${L} out of range`)
      }
    }
    const ids = new Set(it.options.map((o) => o.id))
    if (!it.correctOptionIds.length) throw new Error(`${label}: empty correctOptionIds`)
    const uniq = new Set(it.correctOptionIds)
    if (uniq.size !== it.correctOptionIds.length) throw new Error(`${label}: duplicate in correctOptionIds`)
    for (const c of it.correctOptionIds) {
      if (!ids.has(c)) throw new Error(`${label}: correct id "${c}" missing from options`)
    }
  }
}

/** Pool for A2 reading simulation — each item is a unique scenario (no template grids). */
export const A2_READING_EXAM_MCQ_POOL: readonly KnmMcqItem[] = A2_READING_EXAM_MCQ_DRAFTS.map((d) =>
  readingItemFromDraft(d),
)

assertReadingBank([...A2_READING_EXAM_MCQ_POOL], 'A2 reading exam MCQ')

if (A2_READING_EXAM_MCQ_POOL.length < 150) {
  throw new Error(`A2 reading exam bank: expected at least 150 items, got ${A2_READING_EXAM_MCQ_POOL.length}`)
}

export function getA2ReadingExamMcqByPoolIndex(index: number): KnmMcqItem {
  const pool = A2_READING_EXAM_MCQ_POOL
  if (!pool.length) throw new Error('A2 reading exam MCQ pool empty')
  const ix = ((index % pool.length) + pool.length) % pool.length
  return pool[ix]!
}
