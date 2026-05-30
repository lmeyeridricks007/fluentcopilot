/**
 * Builds a learner-aligned rewritten draft (A2) — distinct from the bank model answer.
 * Applies a deeper correction pass than the short list shown in the UI.
 */
import type { WritingTrainingItem } from '@/lib/schemas/exam/writingTrainingItem.schema'
import type { ExamScoringEngineOutput } from '@/lib/exam-scoring/types'
import {
  applyWritingCorrectionsToText,
  extractWritingCorrections,
  polishWritingSurface,
} from '@/lib/exam-prep/writing/writingCorrections'

const REWRITE_CORRECTION_CAP = 8
const DISPLAY_CORRECTION_CAP = 5

/** Corrections for the result card (selective). */
export function extractWritingCorrectionsForDisplay(answer: string): ReturnType<typeof extractWritingCorrections> {
  return extractWritingCorrections(answer, DISPLAY_CORRECTION_CAP)
}

/** Deeper pass for building the rewritten text. */
export function extractWritingCorrectionsForRewrite(answer: string): ReturnType<typeof extractWritingCorrections> {
  return extractWritingCorrections(answer, REWRITE_CORRECTION_CAP)
}

function collapseDuplicatePunctuation(text: string): string {
  return text.replace(/([.!?])\1+/g, '$1').replace(/\s+([.!?])/g, '$1')
}

function splitFormLines(text: string): { isForm: boolean; lines: string[] } {
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean)
  if (lines.length >= 2 && lines.every((l) => /^.+:\s*.+$/i.test(l) || l.includes(':'))) {
    return { isForm: true, lines }
  }
  return { isForm: false, lines: [text] }
}

function polishFormValue(val: string): string {
  const v = val.trim()
  if (!v) return v
  if (/^\d/.test(v)) return v
  const first = v.charAt(0).toUpperCase()
  return v.length > 1 ? first + v.slice(1) : first
}

/**
 * Polish label:value lines (form) — no forced period (avoids breaking phone/postcode).
 */
function polishFormBody(text: string): string {
  const { isForm, lines } = splitFormLines(text)
  if (!isForm) return text
  return lines
    .map((line) => {
      const idx = line.indexOf(':')
      if (idx === -1) return line.trim()
      const label = line.slice(0, idx + 1).trim()
      const val = line.slice(idx + 1).trim()
      if (!val) return `${label} `
      return `${label} ${polishFormValue(val)}`
    })
    .join('\n')
}

/**
 * Rewritten version: same intent as the learner, clearer A2 Dutch — not the ideal model answer.
 */
export function buildWritingRewrittenDraft(input: {
  item: WritingTrainingItem
  answer: string
  engine: ExamScoringEngineOutput
}): { text: string; noteNl: string } {
  const trimmed = input.answer.trim()
  if (!trimmed) {
    return { text: '', noteNl: 'Geen tekst om te herschrijven.' }
  }

  const rewriteCorrections = extractWritingCorrectionsForRewrite(trimmed)
  let draft = applyWritingCorrectionsToText(trimmed, rewriteCorrections)
  draft = collapseDuplicatePunctuation(draft)

  if (input.item.subtype === 'form') {
    draft = polishFormBody(draft)
  } else {
    const parts = draft.split(/\n\s*\n/).map((p) => polishWritingSurface(p.trim())).filter(Boolean)
    draft = parts.join('\n\n')
    if (!/[.!?]$/.test(draft.trim())) {
      draft = polishWritingSurface(draft)
    }
  }

  if (draft.length < 2) {
    draft = polishWritingSurface(trimmed) || trimmed
  }

  const noteNl =
    rewriteCorrections.length > 0
      ? 'Dit is uw eigen tekst, taalkundig strakker en duidelijker — nog steeds A2. Het is géén verplicht modelantwoord.'
      : 'Hoofdletters, alinea’s en leestekens opgeschoond; inhoud blijft van u. Vergelijk met het modelantwoord hieronder: dat toont een ander sterk voorbeeld.'

  return { text: draft, noteNl }
}
