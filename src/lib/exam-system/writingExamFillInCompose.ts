import type { ExamScoringDimension, ExamTaskInstance } from './types'

/** Lines that are only `Label:` (used when stored tasks omit `writingFillInBulletsNl`). */
export function inferWritingFormBulletsFromAnswer(answer: string): string[] {
  const lines = answer.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  for (const line of lines) {
    const m = line.match(/^(.+):\s*$/)
    if (m) out.push(m[1]!.trim())
  }
  return out
}

/** Bank / prompt cues for formulier-style writing (no answer required). */
export function writingExamTaskLooksFormFillPrompt(task: ExamTaskInstance): boolean {
  if (task.taskType !== 'writing_task_exam') return false
  if (task.writingExamStratum === 'form_fill') return true
  if (Boolean(task.writingFillInBulletsNl?.length)) return true
  const p = task.promptNl
  return (
    /\b(Vul in|Vul het volgende in|zoals op een echt formulier)\b/i.test(p) ||
    (/\bformulier\b/i.test(p) && /\b(vul|invul)\w*\b/i.test(p)) ||
    (/\buw naam\b/i.test(p) && /\buw adres\b/i.test(p)) ||
    (/\bbibliotheekpas\b/i.test(p) && /\b(reden|motiv|aanvraag)\b/i.test(p))
  )
}

/**
 * True when this writing item should use the form-fill rubric and field heuristics.
 * Uses prompt/stratum/bullets, or (fallback) a labeled Dutch answer if metadata was stripped.
 */
export function writingExamTaskLooksFormFill(task: ExamTaskInstance, answerText?: string): boolean {
  if (task.taskType !== 'writing_task_exam') return false
  if (writingExamTaskLooksFormFillPrompt(task)) return true
  const a = answerText?.trim() ?? ''
  if (!a.length) return false
  const inferred = inferWritingFormBulletsFromAnswer(a)
  return (
    inferred.length >= 2 &&
    /\b(uw\s+naam|uw\s+adres|bibliotheekpas|bibliotheek|postcode|polisnummer|achternaam|ingangsdatum)\b/i.test(a)
  )
}

/** Bullets from the task, or inferred from a structured answer (same order as invulvelden). */
export function effectiveWritingFormBullets(task: ExamTaskInstance, answer: string): string[] {
  if (task.writingFillInBulletsNl?.length) return [...task.writingFillInBulletsNl]
  const inferred = inferWritingFormBulletsFromAnswer(answer)
  return inferred.length >= 2 ? inferred : []
}

/**
 * Labels that accept numbers, codes, or dates — not full Dutch prose (e.g. “Polisnummer (fictief mag)”).
 */
export function formFillLabelExpectsCodeOrNumber(label: string): boolean {
  const l = label.toLowerCase()
  if (/\bpolis/i.test(l)) return true
  if (/\bdatum|geboortedatum|geboorte\b/i.test(l)) return true
  if (/\btelefoon|mobiel|tel\.?\b/i.test(l)) return true
  if (/\bpostcode\b/i.test(l) && !/\badres|straat|woonplaats/i.test(l)) return true
  return false
}

/** True when the learner’s value is acceptable for this form line (incl. fictional policy numbers). */
export function isPlausibleFormFillSlotContent(label: string, body: string): boolean {
  const t = body.trim()
  if (!t) return false
  const labelLow = label.toLowerCase()
  const compact = t.replace(/[\s.\-/]/g, '')

  if (/\bpolis/i.test(labelLow)) {
    if (compact.length >= 4 && /^[A-Z0-9]+$/i.test(compact)) return true
    if (/\bfictief|mag\b/i.test(labelLow) && compact.length >= 4) return true
  }
  if (/\bdatum|geboorte/i.test(labelLow) && /\d/.test(t) && t.length >= 6) return true
  if (/\btelefoon|mobiel/i.test(labelLow) && /\d{6,}/.test(compact)) return true

  return false
}

/** Per invulregel tekst (na `Label:`), same order as `writingFillInBulletsNl` / scorer. */
export function extractWritingFormSlotBodies(answer: string, bullets: readonly string[]): string[] {
  const t = answer.replace(/\r\n/g, '\n').trim()
  const blocks = t.length ? t.split(/\n\n+/).map((x) => x.trim()).filter(Boolean) : []
  return bullets.map((b) => {
    const head = `${b}:`
    const block = blocks.find((bl) => bl.startsWith(`${head}\n`) || bl === head)
    if (!block) return ''
    return block.startsWith(`${head}\n`)
      ? block.slice(head.length + 1).trimEnd()
      : block.length > head.length
        ? block.slice(head.length).replace(/^\n/, '').trimEnd()
        : ''
  })
}

/** Formulier-invul rubric aligned with the A2 writing bank (no mail “politeness”). */
export const FORM_FILL_SCORING_DIMENSIONS: ExamScoringDimension[] = [
  'task_completion',
  'completeness',
  'structure',
  'grammar_control',
  'relevance',
]

/**
 * Old stored sessions may still list mail-style dimensions, or omit bullets after sync.
 * When this returns an upgraded task, callers may persist it (reprocess) or use it only for scoring (report UI).
 */
export function examTaskWithFormFillRubricIfNeeded(task: ExamTaskInstance, answerText?: string): ExamTaskInstance {
  if (task.taskType !== 'writing_task_exam') return task
  if (!writingExamTaskLooksFormFill(task, answerText)) return task

  const inferred = inferWritingFormBulletsFromAnswer(answerText ?? '')
  const fillBullets =
    task.writingFillInBulletsNl?.length ? task.writingFillInBulletsNl : inferred.length ? inferred : undefined

  const sameFormDims =
    task.scoringDimensions.length === FORM_FILL_SCORING_DIMENSIONS.length &&
    FORM_FILL_SCORING_DIMENSIONS.every((d) => task.scoringDimensions.includes(d))
  const hasMailDims =
    task.scoringDimensions.includes('politeness') || task.scoringDimensions.includes('natural_wording')

  if (sameFormDims && !hasMailDims) {
    if (task.writingFillInBulletsNl?.length) return task
    if (fillBullets?.length)
      return { ...task, writingFillInBulletsNl: [...fillBullets], writingExamStratum: task.writingExamStratum ?? 'form_fill' }
    return task
  }

  return {
    ...task,
    scoringDimensions: [...FORM_FILL_SCORING_DIMENSIONS],
    writingExamStratum: task.writingExamStratum ?? 'form_fill',
    ...(fillBullets?.length && !task.writingFillInBulletsNl?.length ? { writingFillInBulletsNl: [...fillBullets] } : {}),
  }
}

/** Layout score for multi-box form-fill: the exam UI maps each box to a line — not a writing skill to penalize. */
export function formFillLayoutScore01(
  answerText: string,
  bullets: readonly string[],
): number | null {
  if (!formFillAnswerUsesSeparatedFields(answerText, bullets)) return null
  const slots = extractWritingFormSlotBodies(answerText, bullets)
  const n = Math.max(1, bullets.length)
  const nonempty = slots.filter((s) => s.trim().length > 0).length
  return Math.max(0, Math.min(1, 0.9 + 0.1 * (nonempty / n)))
}

/**
 * True when the stored answer matches the multi-box exam UI (`composeWritingFillInAnswer`).
 * Learners do not need to type labels or colons themselves in that flow.
 */
export function formFillAnswerUsesSeparatedFields(
  answerText: string,
  bullets: readonly string[],
): boolean {
  if (!bullets.length) return false
  const t = answerText.replace(/\r\n/g, '\n').trim()
  if (!t.length) return false
  return bullets.every((b) => t.includes(`${b}:\n`))
}

/** Stored exam text: one block per bullet, `Label:\n` then the learner’s lines. */
export function composeWritingFillInAnswer(bullets: string[], values: string[]): string {
  return bullets
    .map((b, i) => {
      const v = (values[i] ?? '').replace(/\r\n/g, '\n').trimEnd()
      return `${b}:\n${v}`
    })
    .join('\n\n')
}

/**
 * Rehydrates multifield UI from a saved attempt. Returns `null` if the text does not look structured
 * (e.g. legacy single-paragraph answers).
 */
export function parseWritingFillInAnswer(bullets: string[], answerText: string): string[] | null {
  const t = answerText.replace(/\r\n/g, '\n').trim()
  if (!t) return bullets.map(() => '')

  const blocks = t.split(/\n\n+/).map((x) => x.trim()).filter(Boolean)
  const values = bullets.map(() => '')
  let matched = 0

  for (let i = 0; i < bullets.length; i++) {
    const b = bullets[i]!
    const withNl = `${b}:\n`
    const withColon = `${b}:`
    const block = blocks.find((bl) => bl.startsWith(withNl) || bl === withColon || bl.startsWith(`${withColon}\n`))
    if (!block) continue
    const rest = block.startsWith(withNl)
      ? block.slice(withNl.length)
      : block.slice(withColon.length).replace(/^\n/, '')
    values[i] = rest.trimEnd()
    matched++
  }

  if (matched === 0) return null
  return values
}
