/**
 * Deterministic checks for bullet / form coverage to support execution scoring (training).
 */
import type { WritingTrainingItem } from '@/lib/schemas/exam/writingTrainingItem.schema'

export type WritingRequirementCoverage = {
  id: string
  textNl: string
  satisfied: boolean
  kind: 'content' | 'form_field'
}

function normalizeAnswer(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function textHasTerm(haystack: string, term: string): boolean {
  const t = normalizeAnswer(term).replace(/\s+/g, ' ').trim()
  if (!t) return false
  /* Substring match: picks up Dutch compounds (e.g. inlever → inleveren). */
  return haystack.includes(t)
}

export function checkWritingRequirements(input: {
  item: WritingTrainingItem
  /** Composed learner text (form: joined labels + values) */
  answerText: string
  fieldValues?: Record<string, string>
}): { coverages: WritingRequirementCoverage[]; satisfiedRatio: number } {
  const haystack = normalizeAnswer(input.answerText)
  const fv = input.fieldValues ?? {}

  const coverages: WritingRequirementCoverage[] = []

  for (const req of input.item.requirements) {
    if (req.kind === 'form_field') {
      const v = fv[req.fieldId]?.trim() ?? ''
      const ok = v.length > 0
      coverages.push({
        id: req.id,
        textNl: req.textNl,
        satisfied: ok,
        kind: 'form_field',
      })
      continue
    }

    const hit = req.matchTerms.some((term) => textHasTerm(haystack, term))
    coverages.push({
      id: req.id,
      textNl: req.textNl,
      satisfied: hit,
      kind: 'content',
    })
  }

  const n = coverages.length
  const satisfied = coverages.filter((c) => c.satisfied).length
  const satisfiedRatio = n > 0 ? satisfied / n : 0

  return { coverages, satisfiedRatio }
}
