/**
 * A2 reading bank items use: instruction + typographic quoted passage + blank line + exam question (Dutch).
 * English is usually: "Read the … ." + question sentence(s).
 */

const NL_SOURCE_AND_QUESTION = /^([\s\S]*\n\n\u201c[^\u201d]+\u201d)\n\n([\s\S]+)$/

export type ReadingExamMcqPromptParts = {
  sourceBlockNl: string
  questionNl: string
  /** First English sentence (read instruction); optional if split fails. */
  sourceHintEn: string | null
  /** English translation of the quoted passage; optional. */
  passageEn: string | null
  /** English question line(s); optional. */
  questionEn: string | null
}

export function splitReadingExamMcqPrompt(
  promptNl: string,
  promptEn: string,
  passageEn?: string | null,
): ReadingExamMcqPromptParts | null {
  const m = promptNl.trim().match(NL_SOURCE_AND_QUESTION)
  if (!m) return null
  const sourceBlockNl = m[1].trim()
  const questionNl = m[2].trim()
  const en = promptEn.trim()
  let sourceHintEn: string | null = null
  let questionEnOut: string | null = null
  if (en) {
    const dot = en.indexOf('. ')
    if (dot > 6 && /^Read\b/i.test(en) && dot < en.length - 3) {
      sourceHintEn = en.slice(0, dot + 1).trim()
      questionEnOut = en.slice(dot + 2).trim() || null
    } else {
      sourceHintEn = null
      questionEnOut = en
    }
  }
  return {
    sourceBlockNl,
    questionNl,
    sourceHintEn,
    passageEn: passageEn?.trim() || null,
    questionEn: questionEnOut,
  }
}
