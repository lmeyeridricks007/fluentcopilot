/**
 * Splits A2 writing bank prompts (situation + assignment vs checklist footer) for clearer UI layout.
 * Falls back to single block when the text does not match the known exam footer pattern.
 */
export type WritingExamPromptExtras = {
  fillInBulletsNl?: string[]
  answerSkeletonNl?: string
}

export type WritingExamPromptParts = {
  /** Full assignment block before checklist (unchanged from raw split). */
  assignment: string
  /** Scenario + opdracht zonder de “Vul …”-regel wanneer er gestructureerde invulbullets zijn. */
  situationDisplayNl: string
  /** Lijst met wat de kandidaat moet invullen (kopiëren-vriendelijk). */
  fillInBulletsNl: string[]
  /** Optioneel kant-en-klaar kader voor het antwoordvak. */
  answerSkeletonNl: string | null
  checklistTitle: string
  checklistItems: string[]
}

const CHECKLIST_HEAD_RE = /\n\n(Zo schrijf je je antwoord|Let op) \(alleen Nederlands\): *\n?/

/** Verwijdert de paragraaf die begint met “Vul …” (formulierinstructie) uit het opdrachtblok. */
export function stripVulInstructionParagraph(assignment: string): string {
  const paras = assignment
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
  const ix = paras.findIndex((p) => /^(Vul het volgende in|Vul in)\b/i.test(p))
  if (ix < 0) return assignment.trim()
  return paras
    .filter((_, i) => i !== ix)
    .join('\n\n')
    .trim()
}

export function splitWritingExamPromptForDisplay(
  promptNl: string,
  extras?: WritingExamPromptExtras | null,
): WritingExamPromptParts | null {
  const m = promptNl.match(CHECKLIST_HEAD_RE)
  if (!m || m.index === undefined) return null
  const assignment = promptNl.slice(0, m.index).trim()
  const titleKey = m[1]
  const checklistTitle =
    titleKey === 'Let op' ? 'Let op (alleen Nederlands)' : 'Zo schrijf je je antwoord (alleen Nederlands)'
  const tail = promptNl.slice(m.index + m[0].length).trim()
  const checklistItems = tail
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('•'))
    .map((line) => line.replace(/^•\s*/, '').trim())
    .filter(Boolean)
  if (!assignment || checklistItems.length === 0) return null

  const fillInBulletsNl = extras?.fillInBulletsNl?.length ? [...extras.fillInBulletsNl] : []
  const situationDisplayNl =
    fillInBulletsNl.length > 0 ? stripVulInstructionParagraph(assignment) : assignment
  const answerSkeletonNl = extras?.answerSkeletonNl?.trim() ? extras.answerSkeletonNl.trim() : null

  return {
    assignment,
    situationDisplayNl,
    fillInBulletsNl,
    answerSkeletonNl,
    checklistTitle,
    checklistItems,
  }
}
