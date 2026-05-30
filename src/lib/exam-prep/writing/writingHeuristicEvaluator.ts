/**
 * Deterministic writing rubric scores (training). Output → `scoreWritingFromAiJson`.
 * Subtype-aware execution/clearness; rationales carry concise evidence for UI.
 * Execution gating: aggregateWritingAttempt + minimum word guard.
 */
import { countWords } from '@/lib/exam-scoring/scoringGuards'
import type { AiWritingEvaluationPayload } from '@/lib/exam-scoring/aiRubricMapper'
import type { WritingTrainingItem } from '@/lib/schemas/exam/writingTrainingItem.schema'
import { checkWritingRequirements } from '@/lib/exam-prep/writing/writingContentChecker'
import { extractWritingCorrections } from '@/lib/exam-prep/writing/writingCorrections'

const ENGLISH_HINT = /\b(the|and|is|are|because|very|sorry for|please|thank you|hello)\b/i

function sentenceCount(answer: string): number {
  const parts = answer
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  return Math.max(1, parts.length)
}

function uniqueRatio(answer: string): number {
  const t = answer
    .toLowerCase()
    .replace(/[^a-zà-ÿ']/gi, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2)
  if (t.length === 0) return 0
  return new Set(t).size / t.length
}

function formLineCount(text: string): number {
  return text.split(/\n/).map((l) => l.trim()).filter((l) => l.length > 0 && l.includes(':')).length
}

function missingExecutionHint(missingLabels: string[]): string {
  if (missingLabels.length === 0) return ''
  const show = missingLabels.slice(0, 2).join('; ')
  const more = missingLabels.length > 2 ? ' …' : ''
  return ` Nog niet duidelijk: ${show}.${more}`
}

export function buildHeuristicWritingAiPayload(
  item: WritingTrainingItem,
  answerText: string,
  fieldValues?: Record<string, string>
): AiWritingEvaluationPayload {
  const trimmed = answerText.trim()
  const wc = countWords(trimmed)
  const { coverages, satisfiedRatio } = checkWritingRequirements({ item, answerText: trimmed, fieldValues })
  const missing = coverages.filter((c) => !c.satisfied).map((c) => c.textNl)
  const sentences = sentenceCount(trimmed)
  const uniq = uniqueRatio(trimmed)
  const englishSlip = ENGLISH_HINT.test(trimmed)
  const corrections = extractWritingCorrections(trimmed, 5)
  const correctionCount = corrections.length
  const linesWithLabels = formLineCount(trimmed)

  let execution = 0
  if (wc >= 2) {
    if (satisfiedRatio >= 0.95) execution = 3
    else if (satisfiedRatio >= 0.7) execution = 2
    else if (satisfiedRatio >= 0.4) execution = 1
    else execution = 0
  }

  /* Subtype guardrails on top of bullet coverage */
  if (execution > 0 && item.subtype === 'text_to_audience') {
    if (sentences < 3) execution = Math.min(execution, 2)
    if (sentences < 2 && wc < 20) execution = Math.min(execution, 1)
  }
  if (execution > 0 && item.subtype === 'message') {
    if (sentences < 2 && wc < 25) execution = Math.min(execution, 2)
  }
  if (execution > 0 && item.subtype === 'form') {
    if (linesWithLabels < (item.formFields?.length ?? 1)) execution = Math.min(execution, 2)
  }

  let grammar = 0
  if (execution > 0) {
    if (englishSlip && correctionCount >= 2) grammar = 0
    else if (englishSlip || correctionCount >= 3) grammar = 1
    else if (correctionCount === 2) grammar = 1
    else if (correctionCount <= 1 && wc >= 8) grammar = 2
    else grammar = 1
  }

  let spelling = 0
  if (execution > 0) {
    const messy = /(\w)\1{2,}/.test(trimmed)
    if (messy && wc < 12) spelling = 0
    else if (correctionCount >= 4) spelling = 0
    else if (correctionCount >= 2) spelling = 1
    else if (wc >= 10 && uniq >= 0.45) spelling = 2
    else spelling = 1
  }

  let clearness = 0
  if (execution > 0) {
    if (item.subtype === 'form') {
      if (linesWithLabels >= 3) clearness = 1
      else if (linesWithLabels >= 2 && wc >= 6) clearness = 1
      else clearness = 0
    } else if (item.subtype === 'message') {
      if (sentences >= 3 && wc >= 12) clearness = 1
      else if (sentences >= 2 && wc >= 10) clearness = 1
      else if (trimmed.includes('\n') && sentences >= 2) clearness = 1
      else clearness = 0
    } else {
      if (sentences >= 3 && wc >= 12) clearness = 1
      else if (sentences >= 2 && wc >= 14) clearness = 1
      else clearness = 0
    }
  }

  let vocabulary = 0
  if (execution > 0) {
    if (wc >= 18 && uniq >= 0.5) vocabulary = 2
    else if (wc >= 10 && uniq >= 0.4) vocabulary = 1
    else vocabulary = wc >= 6 ? 1 : 0
    if (item.subtype === 'message' && uniq < 0.35 && wc < 40) vocabulary = Math.min(vocabulary, 1)
  }

  const firstCorr = corrections[0]

  let executionRationale =
    execution === 0
      ? 'Te weinig woorden of te weinig punten uit de opdracht — werk de checklist af.'
      : satisfiedRatio < 0.7
        ? 'Je mist nog een deel van de verplichte punten; vergelijk met de puntenlijst.'
        : 'Je voert de opdracht inhoudelijk goed uit voor dit niveau.'
  executionRationale += missingExecutionHint(missing)

  const grammarRationale =
    grammar === 0
      ? 'Meerdere grammaticale of mengvormen (NL/EN) — zie de correcties.'
      : grammar === 1
        ? 'Globaal begrijpelijk, maar werk woordvolgorde en vaste uitdrukkingen bij.'
        : 'Zinnen zijn overwegend correct op A2-niveau.'
  const grammarEvidence =
    firstCorr && grammar < 2
      ? `Voorbeeld: “${firstCorr.originalFragment}” → “${firstCorr.correctedFragment}”.`
      : undefined

  const spellingRationale =
    spelling === 0
      ? 'Spelling of tikfouten leiden af — lees langzaam hardop na.'
      : spelling === 1
        ? 'Enkele spellingpunten; controleer bekende woorden en hoofdletters.'
        : 'Spelling ondersteunt de leesbaarheid goed.'

  const clearnessRationale =
    clearness === 0
      ? item.subtype === 'form'
        ? 'Zet elk gegeven op een aparte regel met een duidelijk label.'
        : item.subtype === 'message'
          ? 'Gebruik korte zinnen en eventueel een aanhef en afsluiting.'
          : 'Schrijf minstens drie korte, duidelijke zinnen voor dit type tekst.'
      : 'Je tekst is goed te volgen als praktijktekst.'

  const vocabularyRationale =
    vocabulary === 0
      ? 'Woordkeuze is nog erg beperkt of herhaalt vaak hetzelfde.'
      : vocabulary === 1
        ? 'Basiswoordenschat klopt; voeg een paar woorden uit het onderwerp toe.'
        : 'Woorden passen bij de opdracht en de lengte van je tekst.'

  const rationalesNl: Record<string, string> = {
    execution: executionRationale.trim(),
    grammar: grammarEvidence ? `${grammarRationale} ${grammarEvidence}` : grammarRationale,
    spelling: spellingRationale,
    clearness: clearnessRationale,
    vocabulary: vocabularyRationale,
  }

  return {
    scores: {
      execution,
      grammar,
      spelling,
      clearness,
      vocabulary,
    },
    rationales: rationalesNl,
    internalReasoning: `heuristic:writing-v2|subtype=${item.subtype}|wc=${wc}|cov=${satisfiedRatio.toFixed(2)}|miss=${missing.length}|sent=${sentences}|lines=${linesWithLabels}|en=${englishSlip}|corr=${correctionCount}`,
    certainty: Math.min(0.88, 0.4 + satisfiedRatio * 0.28 + (correctionCount === 0 ? 0.08 : 0)),
  }
}
