import { dimensionScoreCardTitle, examDimensionLabelFriendly, formatGroupedFieldNotesBody } from './examReportUserCopy'
import { dutchGrammarCoachingForSentence, type FormFillGrammarNote } from './writingFormFillReportFeedback'
import { writingExamRegisterFromTask, type WritingExamRegister } from './writingExamRegister'
import { isWritingExamGibberish } from './scoringEngine'
import type { ExamScoringDimension, ExamTaskInstance } from './types'

function excerptLabel(text: string, max = 52): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (!t) return 'Your answer'
  return t.length <= max ? t : `${t.slice(0, max)}…`
}

/** Grammar/spelling issues in free-text writing (email, note, etc.). */
export function detectProseGrammarSpellingNotes(
  answerText: string,
  register: WritingExamRegister = 'general',
): FormFillGrammarNote[] {
  const t = answerText.replace(/\r\n/g, '\n').trim()
  if (!t || isWritingExamGibberish(t)) return []

  const notes: FormFillGrammarNote[] = []
  const add = (fieldLabel: string, message: string) => {
    if (notes.some((n) => n.fieldLabel === fieldLabel && n.message === message)) return
    notes.push({ fieldLabel, message })
  }

  const sentences = t.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 4)
  const paragraphs = t.split(/\n+/).map((s) => s.trim()).filter((s) => s.length > 4)
  const units =
    sentences.length > 0 ? sentences : paragraphs.length > 0 ? paragraphs : t.length > 8 ? [t] : []
  for (const sentence of units) {
    const label = excerptLabel(sentence)
    for (const message of dutchGrammarCoachingForSentence(sentence)) {
      add(label, message)
    }
  }

  if (register === 'informal_app') {
    if (/\bgeachte\b/i.test(t)) {
      add('Tone', 'This is an informal app to a friend — use “Hoi …” instead of “Geachte …”.')
    }
    if (/\bmet vriendelijke groet\b/i.test(t) && !/\bgeachte\b/i.test(t)) {
      add('Tone', 'For an app message, “Groetjes,” fits better than “Met vriendelijke groet,”.')
    }
  } else {
    if (/\bgeachte\b/i.test(t) && !/\bmet vriendelijke groet\b/i.test(t)) {
      add('Your closing', 'Add “Met vriendelijke groet,” and your name after the main message.')
    }
    if (/\bgeachte\b/i.test(t) && !/\bheer\/mevrouw|mevrouw|heer\b/i.test(t) && /\bgeachte\s*,/i.test(t)) {
      add('Your opening', 'After “Geachte,” add “heer/mevrouw,” or the person’s name (e.g. “Geachte heer/mevrouw,”).')
    }
    if (/\bbeste\b/i.test(t) && /\bgeachte\b/i.test(t)) {
      add('Tone', 'Use either “Geachte …” (formal) or “Beste …” (neutral) — not both in one short mail.')
    }
  }

  return notes.slice(0, 8)
}

function proseGrammarRationaleLine(
  scores: Partial<Record<ExamScoringDimension, number>>,
  answerText: string,
  register: WritingExamRegister,
): string | null {
  const pct = Math.round((scores.grammar_control ?? 0) * 100)
  const notes = detectProseGrammarSpellingNotes(answerText, register)
  if (notes.length) {
    return `${dimensionScoreCardTitle('grammar_control', pct)}: ${formatGroupedFieldNotesBody(notes)}`
  }
  if ((scores.grammar_control ?? 1) >= 0.78) return null
  return `${dimensionScoreCardTitle('grammar_control', pct)}: re-read your Dutch — check verb forms (heeft/heb), spelling (tegen, mijn), and full stops between sentences.`
}

/**
 * Dimension score cards for emails / short notes (not multi-box forms).
 */
export function writingProseDimensionRationaleLines(
  task: ExamTaskInstance,
  answerText: string,
  scores: Partial<Record<ExamScoringDimension, number>>,
): string[] {
  const answer = answerText.trim()
  if (!answer) return []

  const register = writingExamRegisterFromTask(task)
  const weaker = (dim: ExamScoringDimension) => (scores[dim] ?? 1) < 0.68
  const parts: { dim: ExamScoringDimension; line: string }[] = []
  const words = answer.split(/\s+/).filter(Boolean).length

  const grammarLine = proseGrammarRationaleLine(scores, answer, register)
  if (grammarLine && (scores.grammar_control ?? 1) < 0.78) {
    parts.push({ dim: 'grammar_control', line: grammarLine })
  }

  if (weaker('task_completion') && words < (register === 'informal_app' ? 12 : 25)) {
    parts.push({
      dim: 'task_completion',
      line:
        register === 'informal_app'
          ? `${dimensionScoreCardTitle('task_completion', (scores.task_completion ?? 0) * 100)}: say in one or two sentences what you want your friend to know (the app task does not need a long mail).`
          : `${dimensionScoreCardTitle('task_completion', (scores.task_completion ?? 0) * 100)}: your answer is quite short — include every part of the assignment (what you need, why, and a polite close).`,
    })
  }

  if (weaker('structure')) {
    parts.push({
      dim: 'structure',
      line:
        register === 'informal_app'
          ? `${dimensionScoreCardTitle('structure', (scores.structure ?? 0) * 100)}: short app layout — “Hoi …”, your message, then “Groetjes,” and your name on separate lines.`
          : register === 'formal_mail'
            ? `${dimensionScoreCardTitle('structure', (scores.structure ?? 0) * 100)}: use short paragraphs — greeting, main message (1–3 sentences), then “Met vriendelijke groet,” and your name.`
            : `${dimensionScoreCardTitle('structure', (scores.structure ?? 0) * 100)}: use short paragraphs — greeting, main message, then an appropriate closing and your name.`,
    })
  }

  if (weaker('politeness')) {
    parts.push({
      dim: 'politeness',
      line:
        register === 'informal_app'
          ? `${dimensionScoreCardTitle('politeness', (scores.politeness ?? 0) * 100)}: informal app to a friend — “Hoi …” (optionally their name) and “Groetjes,” work well; avoid “Geachte …” / “Met vriendelijke groet,” here.`
          : register === 'formal_mail'
            ? `${dimensionScoreCardTitle('politeness', (scores.politeness ?? 0) * 100)}: formal mail — “Geachte heer/mevrouw,” and “Met vriendelijke groet,” with your name.`
            : `${dimensionScoreCardTitle('politeness', (scores.politeness ?? 0) * 100)}: match the situation — formal mail uses “Geachte …” / “Met vriendelijke groet,”; informal messages use “Hoi …” / “Groetjes,”.`,
    })
  }

  if (weaker('natural_wording')) {
    parts.push({
      dim: 'natural_wording',
      line: `${dimensionScoreCardTitle('natural_wording', (scores.natural_wording ?? 0) * 100)}: use simple everyday words you would say out loud; avoid long or invented words.`,
    })
  }

  parts.sort((a, b) => (scores[a.dim] ?? 1) - (scores[b.dim] ?? 1))
  const seen = new Set<ExamScoringDimension>()
  const out: string[] = []
  for (const p of parts) {
    if (seen.has(p.dim)) continue
    seen.add(p.dim)
    out.push(p.line)
  }
  return out.slice(0, 5)
}

export function writingProseScoreSummary(
  composite: number,
  scores: Partial<Record<ExamScoringDimension, number>>,
): string {
  const entries = (Object.entries(scores) as [ExamScoringDimension, number | undefined][])
    .filter(([, v]) => typeof v === 'number')
    .map(([dim, v]) => ({ dim, v: v! }))
  if (!entries.length) {
    return `Overall ${Math.round(composite * 100)}% — based on how well your Dutch fits the task, not only length.`
  }
  entries.sort((a, b) => a.v - b.v)
  const weakest = entries[0]!
  const weakLabel = examDimensionLabelFriendly(weakest.dim)
  const weakPct = Math.round(weakest.v * 100)
  return `Overall ${Math.round(composite * 100)}%: ${weakLabel} (${weakPct}%) pulled the score down most — see the specific notes below.`
}

/** Actionable tips tied to this answer (emails, notes). */
export function writingProsePersonalizedFeedbackLines(task: ExamTaskInstance, answerText: string): string[] {
  const answer = answerText.trim()
  if (!answer) return ['No text was submitted — write your answer in Dutch before you finish the task.']

  const out: string[] = []
  const seen = new Set<string>()
  const push = (s: string) => {
    const t = s.trim()
    if (!t || seen.has(t)) return
    seen.add(t)
    out.push(t)
  }

  const register = writingExamRegisterFromTask(task)
  const grammarNotes = detectProseGrammarSpellingNotes(answer, register)
  if (grammarNotes.length) {
    push(formatGroupedFieldNotesBody(grammarNotes))
  }

  if (register === 'informal_app') {
    if (/\bgeachte\b/i.test(answer)) {
      push('Wrong register for this task: use “Hoi …” and “Groetjes,” — not “Geachte …”.')
    }
    if (!/\b(groetjes|groeten)\b/i.test(answer) && /\bgroete\b/i.test(answer)) {
      push('Almost there: write “Groetjes,” (with -jes) as your closing.')
    }
  } else if (/\bgeachte\b/i.test(answer) && !/\bmet vriendelijke groet\b/i.test(answer)) {
    push('Add a formal closing: “Met vriendelijke groet,” then your name on a new line.')
  }

  const wordCount = answer.split(/\s+/).filter(Boolean).length
  if (wordCount < 20 && register !== 'informal_app') {
    push('Your mail is very short — add one more sentence that explains your request or situation clearly.')
  }

  if (out.length === 0) {
    push(
      register === 'informal_app'
        ? 'Compare with the sample: informal “Hoi …”, short message, “Groetjes,” — not a formal letter.'
        : 'Compare your text with the sample answer: same type of mail (greeting, message, closing) and similar length.',
    )
  }

  return out.slice(0, 8)
}
