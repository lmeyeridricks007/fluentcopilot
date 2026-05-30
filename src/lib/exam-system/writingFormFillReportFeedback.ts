import {
  examTaskWithFormFillRubricIfNeeded,
  extractWritingFormSlotBodies,
  formFillAnswerUsesSeparatedFields,
  formFillLabelExpectsCodeOrNumber,
  isPlausibleFormFillSlotContent,
  writingExamTaskLooksFormFill,
} from './writingExamFillInCompose'
import {
  dimensionScoreCardTitle,
  examDimensionLabelFriendly,
  formatGroupedFieldNotesBody,
} from './examReportUserCopy'
import { idealizeDamageNarrativeSlot } from './writingFormFillPersonalizedIdeal'
import {
  writingProseDimensionRationaleLines,
  writingProsePersonalizedFeedbackLines,
  writingProseScoreSummary,
} from './writingProseReportFeedback'
import { isWritingExamGibberish } from './scoringEngine'
import type { ExamLevel, ExamScoringDimension, ExamTaskInstance } from './types'

export { formatGroupedFieldNotesBody } from './examReportUserCopy'
export { detectProseGrammarSpellingNotes } from './writingProseReportFeedback'

export type FormFillGrammarNote = {
  fieldLabel: string
  message: string
}

function shortFieldLabel(label: string): string {
  return label.length <= 44 ? label : `${label.slice(0, 41)}…`
}

/** Fields where we coach Dutch prose grammar (not policy numbers / dates only). */
function fieldWantsProseGrammar(label: string, body: string): boolean {
  const l = label.toLowerCase()
  if (/\bgebeurd|schade|wanneer|twee korte|reden|motiv|één zin|bibliotheek/i.test(l)) return true
  if (/\bnaam|voor- en achternaam|achternaam|adres|straat|woonplaats/i.test(l)) return true
  if (formFillLabelExpectsCodeOrNumber(label) && isPlausibleFormFillSlotContent(label, body)) return false
  return body.trim().split(/\s+/).filter(Boolean).length >= 2
}

/** English coaching lines for grammar/spelling issues found in learner Dutch (A2 form-fill). */
export function dutchGrammarCoachingForSentence(body: string): string[] {
  const t = body.trim()
  if (!t || isWritingExamGibberish(t)) return []
  const out: string[] = []
  const push = (s: string) => {
    if (!out.includes(s)) out.push(s)
  }

  const hebThird = t.match(/\bheb\s+(zijn|haar|hun|uw|de|het|mijn)\b/i)
  if (hebThird) {
    push(
      `Verb agreement: you wrote “${hebThird[0]}” — with hij/zij/het use “heeft” (e.g. “Mijn buurman heeft met zijn auto …”).`,
    )
  } else if (
    /\b(buurman|buurvrouw|hij|zij|ze|het|de auto)\b/i.test(t) &&
    /\bheb\b/i.test(t) &&
    !/\bik\s+heb\b/i.test(t)
  ) {
    push('Verb agreement: with “mijn buurman” / hij / zij use “heeft”, not “heb”.')
  }

  const teen = t.match(/\bteen\b/i)
  if (teen) {
    push(`Spelling/word choice: “${teen[0]}” → use “tegen” (against), e.g. “tegen mijn muur”.`)
  }

  const mijMuur = t.match(/\bmij\s+muur\b/i)
  if (mijMuur) {
    push(`Grammar: “${mijMuur[0]}” → possessive “mijn muur”.`)
  }

  const gerijden = t.match(/\bgerijden\b/i)
  if (gerijden) {
    push(`Spelling: “${gerijden[0]}” → past participle “gereden”.`)
  }

  if (/\bje laat weten\b/i.test(t)) {
    push('Grammar: “ik wil je laten weten” — infinitive “laten”, not “laat”.')
  }
  if (/\bgaan meenemen\b/i.test(t)) {
    push('Verb: use “ik ga … meenemen” or shorter “ik neem de boodschappen mee”, not “ik … gaan meenemen”.')
  }
  if (/\bGroete\b/i.test(t) && !/\bGroetjes|Groeten\b/i.test(t)) {
    push('Closing: in an app message use “Groetjes,” or “Groeten,” — not “Groete”.')
  }
  if (/\bmit\b/i.test(t)) {
    push('Spelling: “met” (with), not “mit”.')
  }
  if (/\bmorgon\b/i.test(t)) {
    push('Spelling: “morgen”, not “morgon”.')
  }
  if (/\bde\s+de\b/i.test(t)) {
    push('Remove the doubled word “de”.')
  }
  if (/\bDit\s+gebeurt\b/i.test(t) && !/\bnu\b/i.test(t)) {
    push('Past event: “Dit gebeurde …” (it happened), not “Dit gebeurt”.')
  }
  if (/\bgebeurt\b/i.test(t) && /\b(gisteren|vandaag|eergisteren)\b/i.test(t)) {
    push('With a past time word, use past tense “gebeurde”, not “gebeurt”.')
  }

  if (/\bkapot\b/i.test(t) && !/\b(is|zijn|geworden|beschadigd|geraakt|kapot gegaan)\b/i.test(t)) {
    push('Add a verb with “kapot” — clearer on a form: “Mijn muur is beschadigd” or “…is kapot gegaan”.')
  }

  const sentences = t.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 3)
  if (sentences.length >= 2 && sentences.some((s) => /^[a-zà-ö]/.test(s))) {
    push('Capitalize the first word after a full stop (second sentence).')
  }
  if (t.split(/[.!?]+/).filter((s) => s.trim().length > 3).length < 2 && t.split(/\s+/).length >= 10) {
    push('Use two short sentences separated by a full stop (what happened + when).')
  }

  return out
}

/** Collect grammar/spelling notes for every relevant invulveld. */
export function detectFormFillGrammarSpellingNotes(
  bullets: readonly string[],
  slots: readonly string[],
): FormFillGrammarNote[] {
  const out: FormFillGrammarNote[] = []
  const add = (fieldLabel: string, message: string) => {
    if (out.some((n) => n.fieldLabel === fieldLabel && n.message === message)) return
    out.push({ fieldLabel, message })
  }

  for (let i = 0; i < bullets.length; i += 1) {
    const label = bullets[i]!
    const body = (slots[i] ?? '').trim()
    if (!body || isWritingExamGibberish(body)) continue
    if (!fieldWantsProseGrammar(label, body)) continue

    const labelLow = label.toLowerCase()

    if (/\bnaam|voor- en achternaam|achternaam\b/i.test(labelLow) && /^[a-zà-ö]/.test(body)) {
      add(label, 'Capitalize each part of your name (e.g. “Lee Meyeridricks”).')
    }

    if (/\badres|straat|postcode|woonplaats/i.test(labelLow)) {
      if (hasDutchPostcodeShape(body) && !/\d{4}\s+[a-z]{2}\b/i.test(body) && /\d{4}[a-z]{2}/i.test(body)) {
        add(label, 'Postcode spacing: write “1234 AB” (four digits, space, two letters).')
      }
    }

    for (const message of dutchGrammarCoachingForSentence(body)) {
      add(label, message)
    }
  }

  return out
}

function grammarControlRationaleLine(
  scores: Partial<Record<ExamScoringDimension, number>>,
  bullets: readonly string[],
  slots: readonly string[],
): string | null {
  const pct = Math.round((scores.grammar_control ?? 0) * 100)
  const badLabels = bullets.filter((_label, i) => {
    const s = (slots[i] ?? '').trim()
    const label = bullets[i] ?? ''
    if (!s.length) return false
    if (isPlausibleFormFillSlotContent(label, s)) return false
    return isWritingExamGibberish(s)
  })

  if (badLabels.length) {
    return `${dimensionScoreCardTitle('grammar_control', pct)}: ${badLabels.map((l) => `“${shortFieldLabel(l)}”`).join(', ')} ${badLabels.length > 1 ? 'read as nonsense' : 'reads as nonsense'} — write real Dutch words for that box.`
  }

  const notes = detectFormFillGrammarSpellingNotes(bullets, slots)
  if (notes.length) {
    return `${dimensionScoreCardTitle('grammar_control', pct)}: ${formatGroupedFieldNotesBody(notes)}`
  }

  if ((scores.grammar_control ?? 1) >= 0.58) return null

  const hasAddress = bullets.some((b) => /\badres|straat|postcode/i.test(b))
  const hasName = bullets.some((b) => /\bnaam|achternaam/i.test(b))
  const hints: string[] = []
  if (hasName) hints.push('check capitals in your name')
  if (hasAddress) hints.push('use a full Dutch address with postcode like “1234 AB”')
  if (hints.length) {
    return `${dimensionScoreCardTitle('grammar_control', pct)}: no single big error stood out — ${hints.join('; ')}.`
  }

  return `${dimensionScoreCardTitle('grammar_control', pct)}: re-read each box for verb forms (heeft/heb), spelling of common words (tegen, mijn), and two clear sentences where asked.`
}

function isWritingFormFillReportTask(task: ExamTaskInstance, answerText?: string): boolean {
  return task.taskType === 'writing_task_exam' && writingExamTaskLooksFormFill(task, answerText)
}

/** A2-appropriate library motivation: short Dutch with reading/learning intent is enough. */
function isPlausibleA2LibraryMotivation(text: string): boolean {
  const t = text.trim().toLowerCase()
  if (t.length < 6 || isWritingExamGibberish(text)) return false
  return /\b(ik wil|ik zou|graag|lezen|leest|boek|boeken|lenen|bibli|pas|stud|studie|taal|Nederlands|oefen|leren|meer|kinder)\b/i.test(
    t,
  )
}

function hasDutchPostcodeShape(s: string): boolean {
  return /\b\d{4}\s*[a-z]{2}\b|\b\d{4}[a-z]{2}\b/i.test(s)
}

/**
 * One line per weak rubric dimension, tied to this answer (English; report UI).
 */
export function writingFormFillDimensionRationaleLines(
  task: ExamTaskInstance,
  answerText: string,
  scores: Partial<Record<ExamScoringDimension, number>>,
  level: ExamLevel = 'A2',
): string[] {
  if (!isWritingFormFillReportTask(task, answerText)) return []
  const taskEff = examTaskWithFormFillRubricIfNeeded(task, answerText)
  const bullets = taskEff.writingFillInBulletsNl
  if (!bullets?.length) return []

  const slots = extractWritingFormSlotBodies(answerText, bullets)
  const nonempty = slots.filter((s) => s.trim().length > 0).length
  const substantive = slots.filter((s, i) => {
    const t = s.trim()
    if (t.length < 2) return false
    const label = bullets[i] ?? ''
    if (isPlausibleFormFillSlotContent(label, t)) return true
    return !isWritingExamGibberish(t)
  }).length
  const n = Math.max(1, bullets.length)
  const weaker = (dim: ExamScoringDimension) => (scores[dim] ?? 1) < 0.68

  const parts: { dim: ExamScoringDimension; line: string }[] = []

  if (weaker('completeness') && nonempty < n) {
    parts.push({
      dim: 'completeness',
      line: `${dimensionScoreCardTitle('completeness', (scores.completeness ?? 0) * 100)}: ${n - nonempty} of ${n} box${n - nonempty === 1 ? '' : 'es'} still empty — fill every line on the form.`,
    })
  }

  if (weaker('task_completion') && substantive < n) {
    parts.push({
      dim: 'task_completion',
      line: `${dimensionScoreCardTitle('task_completion', (scores.task_completion ?? 0) * 100)}: only ${substantive} of ${n} answers look complete for what each line asked (name, number, or Dutch sentences as appropriate).`,
    })
  }

  if (weaker('grammar_control')) {
    const grammarLine = grammarControlRationaleLine(scores, bullets, slots)
    if (grammarLine) {
      parts.push({ dim: 'grammar_control', line: grammarLine })
    }
  }

  if (weaker('structure')) {
    const separated = formFillAnswerUsesSeparatedFields(answerText, bullets)
    /* Multi-box UI: layout is automatic — do not show a rubric card that blames “form layout”. */
    if (separated && nonempty >= n) {
      // skip
    } else if (separated) {
      parts.push({
        dim: 'structure',
        line: `${dimensionScoreCardTitle('structure', (scores.structure ?? 0) * 100)}: ${n - nonempty} box${n - nonempty === 1 ? '' : 'es'} still empty — fill each line on the form.`,
      })
    } else {
      const labelled = bullets.filter((b) => answerText.includes(`${b}:`)).length
      parts.push({
        dim: 'structure',
        line: `${dimensionScoreCardTitle('structure', (scores.structure ?? 0) * 100)}: use the same Dutch label as in the task, then a colon, then your answer on the next line — you matched ${labelled}/${n} field label(s).`,
      })
    }
  }

  if (weaker('relevance')) {
    const last = (slots[slots.length - 1] ?? '').trim()
    const library = /\bbibliotheek|bibliotheekpas/i.test(bullets.join(' '))
    if (level === 'A2' && library && isPlausibleA2LibraryMotivation(last)) {
      /* Short motivations like “Ik wil graag meer lezen.” are acceptable at A2 — do not show a false “irrelevant” critique. */
    } else if (last) {
      const tail = last.length > 56 ? `${last.slice(0, 56)}…` : last
      const pct = Math.round((scores.relevance ?? 0) * 100)
      const exampleLine =
        library && level === 'A2'
          ? 'Example (A2): “Ik wil graag boeken lenen om mijn Nederlands te oefenen.”'
          : library
            ? 'Example: mention books, studying, or why you need the card — one short sentence.'
            : 'Say what happened and when in two short Dutch sentences.'
      parts.push({
        dim: 'relevance',
        line: `${dimensionScoreCardTitle('relevance', pct)}:\nYour answer: “${tail}”\n${exampleLine}`,
      })
    } else {
      const pct = Math.round((scores.relevance ?? 0) * 100)
      const exampleLine =
        library && level === 'A2'
          ? 'Example (A2): “Ik wil graag boeken lenen om Nederlands te oefenen.”'
          : 'Add one clear Dutch sentence for the last box.'
      parts.push({
        dim: 'relevance',
        line: `${dimensionScoreCardTitle('relevance', pct)}:\nThe last box is still empty.\n${exampleLine}`,
      })
    }
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

/** One-line explainer for why the overall question score looks lower than “I filled every box”. */
export function writingFormFillScoreSummary(
  composite: number,
  scores: Partial<Record<ExamScoringDimension, number>>,
): string {
  const entries = (Object.entries(scores) as [ExamScoringDimension, number | undefined][])
    .filter(([, v]) => typeof v === 'number')
    .map(([dim, v]) => ({ dim, v: v! }))
  if (!entries.length) {
    return `Overall ${Math.round(composite * 100)}%: your score looks at more than whether each box has text — grammar and how well your answers fit the task matter too.`
  }
  entries.sort((a, b) => a.v - b.v)
  const weakest = entries[0]!
  const weakLabel = examDimensionLabelFriendly(weakest.dim)
  const weakPct = Math.round(weakest.v * 100)
  return `Overall ${Math.round(composite * 100)}%: you filled the form, but ${weakLabel} (${weakPct}%) pulled the score down most — especially clear Dutch in the last box(es).`
}

/**
 * Short, answer-specific coaching for form-fill writing (English; report UI).
 * Call after slot extraction; skips non–form-fill tasks.
 */
export function writingFormFillPersonalizedFeedbackLines(task: ExamTaskInstance, answerText: string): string[] {
  if (!isWritingFormFillReportTask(task, answerText)) return []
  const taskEff = examTaskWithFormFillRubricIfNeeded(task, answerText)
  const bullets = taskEff.writingFillInBulletsNl
  if (!bullets?.length) return []

  const slots = extractWritingFormSlotBodies(answerText, bullets)
  const out: string[] = []
  const seen = new Set<string>()
  const push = (s: string) => {
    const t = s.trim()
    if (!t || seen.has(t)) return
    seen.add(t)
    out.push(t)
  }

  for (let i = 0; i < bullets.length; i += 1) {
    const label = bullets[i]!
    const body = (slots[i] ?? '').trim()
    const labelLow = label.toLowerCase()

    if (
      !formFillAnswerUsesSeparatedFields(answerText, bullets) &&
      !answerText.includes(`${label}:`)
    ) {
      push(
        `We could not find the exact line “${label}:” in your answer — use the same Dutch label as in the task, a colon, then your text on the next line.`,
      )
    }

    if (!body) {
      push(
        formFillLabelExpectsCodeOrNumber(label)
          ? `“${label}” is empty — add a value for this line (a number or code is fine when the task allows it).`
          : `“${label}” is empty — add Dutch text for this line.`,
      )
      continue
    }

    if (isPlausibleFormFillSlotContent(label, body)) {
      if (/\bpolis/i.test(labelLow) && /^\d+$/.test(body.replace(/[\s.\-/]/g, ''))) {
        push(`“${label}” is fine — fictional policy numbers are allowed on this form.`)
      }
    } else if (isWritingExamGibberish(body)) {
      const preview = body.length > 36 ? `${body.slice(0, 36)}…` : body
      push(
        `“${label}” (“${preview}”) does not read as meaningful Dutch — replace it with plausible content for that line.`,
      )
      continue
    }

    if (/\badres|straat|postcode|woonplaats|verhuiz|nieuw adres|oud adres/i.test(labelLow)) {
      const letterish = body.replace(/[^a-zA-Zà-ö]/g, '').length
      const digitish = body.replace(/\D/g, '').length
      if (digitish >= 4 && letterish < 4) {
        push(
          `“${label}” is mostly numbers — a Dutch address usually includes a street name, house number, a postcode like 1234 AB, and a city name. Example: “Hoofdstraat 12, 1234 AB Utrecht”.`,
        )
      } else if (
        letterish >= 4 &&
        !hasDutchPostcodeShape(body) &&
        body.length < 18 &&
        !/\b[a-z]{2,}\s*,\s*[a-z]{3,}\b/i.test(body)
      ) {
        push(
          `“${label}” looks too short for a full address — add postcode and city if the task asks for a complete address. Example: “Hoofdstraat 12, 1234 AB Amstelveen”.`,
        )
      } else if (hasDutchPostcodeShape(body) && !/\d{4}\s+[a-z]{2}\b/i.test(body) && /\d{4}[a-z]{2}/i.test(body)) {
        push(
          `Optional polish: Dutch postcodes are often written with a space (e.g. “1186 XV” instead of “1186XV”) — both are usually understood at A2.`,
        )
      }
    }

    if (/\bnaam|voor- en achternaam|achternaam\b/i.test(labelLow)) {
      if (body.length < 3) push(`“${label}” is very short — use a believable first and last name in Dutch.`)
      else if (/^\d+$/.test(body.replace(/\s/g, '')))
        push(`“${label}” should be a person’s name, not only digits.`)
    }

    if (/\breden|motiv|één zin|bibliotheek|pas\b/i.test(labelLow)) {
      if (body.length < 12) {
        push(
          `The motivation line should be one clear Dutch sentence (e.g. why you want a library card) — yours is very short. Example: “Ik wil graag boeken lenen.”`,
        )
      } else if (
        !/\b(ik|omdat|want|graag|stud|boek|boeken|lenen|lees|lezen|leest|taal|bibli|kinder|pas|cursus|meer|Nederlands|oefen)\b/i.test(
          body,
        )
      ) {
        push(
          `Your motivation could name the situation a bit more clearly — at A2 a short sentence with “lezen”, “boeken”, or “Nederlands oefenen” is enough. Example: “Ik wil graag meer lezen en mijn Nederlands oefenen.”`,
        )
      }
    }

    if (/\bgebeurd|schade|wanneer|twee korte/i.test(labelLow)) {
      if (body.length < 3) {
        push(`“${label}” needs two short Dutch sentences: what happened and when.`)
      } else if (body.trim().length >= 8 && !isWritingExamGibberish(body)) {
        const ideal = idealizeDamageNarrativeSlot(body)
        push(`Ideal version for your situation: “${ideal}”`)
      }
    }

    if (/\bdatum|geboorte|telefoon|mobiel/i.test(labelLow) && body.length < 3) {
      push(`“${label}” needs a concrete, plausible value for this form (Dutch).`)
    }
  }

  const grammarNotes = detectFormFillGrammarSpellingNotes(bullets, slots)
  if (grammarNotes.length) {
    push(formatGroupedFieldNotesBody(grammarNotes))
  }

  if (out.length === 0) {
    push(
      'Compare each box with the sample answer: realistic Dutch details and a clear sentence where the form asks for one.',
    )
  }

  return out.slice(0, 8)
}

function isWritingTaskExam(task: ExamTaskInstance): boolean {
  return task.taskType === 'writing_task_exam'
}

/** Dimension score cards for any writing simulation item. */
export function writingExamDimensionRationaleLines(
  task: ExamTaskInstance,
  answerText: string,
  scores: Partial<Record<ExamScoringDimension, number>>,
  level: ExamLevel = 'A2',
): string[] {
  if (!isWritingTaskExam(task)) return []
  if (isWritingFormFillReportTask(task, answerText)) {
    return writingFormFillDimensionRationaleLines(task, answerText, scores, level)
  }
  return writingProseDimensionRationaleLines(task, answerText, scores)
}

/** Field- or sentence-specific tips for any writing item. */
export function writingExamPersonalizedFeedbackLines(task: ExamTaskInstance, answerText: string): string[] {
  if (!isWritingTaskExam(task)) return []
  if (isWritingFormFillReportTask(task, answerText)) {
    return writingFormFillPersonalizedFeedbackLines(task, answerText)
  }
  return writingProsePersonalizedFeedbackLines(task, answerText)
}

export function writingExamScoreSummary(
  composite: number,
  scores: Partial<Record<ExamScoringDimension, number>>,
  task: ExamTaskInstance,
  answerText?: string,
): string {
  if (isWritingFormFillReportTask(task, answerText ?? '')) {
    return writingFormFillScoreSummary(composite, scores)
  }
  return writingProseScoreSummary(composite, scores)
}
