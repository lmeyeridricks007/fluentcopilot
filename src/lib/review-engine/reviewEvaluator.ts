/**
 * Normalises learner input vs expected answers (variants, case, simple punctuation).
 */
import type { ReviewEvaluationResult, ReviewScore } from '@/lib/review-engine/types'

function norm(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[.!?…,;:]+$/g, '')
    .replace(/\s+/g, ' ')
}

export function evaluateFreeText(
  user: string,
  expected: string | string[],
  variants?: string[]
): Pick<ReviewEvaluationResult, 'correct'> {
  const u = norm(user)
  if (!u) return { correct: false }
  const candidates = new Set<string>()
  if (Array.isArray(expected)) {
    for (const e of expected) candidates.add(norm(e))
  } else {
    candidates.add(norm(expected))
  }
  for (const v of variants ?? []) {
    candidates.add(norm(v))
  }
  /* slash alternatives in one string e.g. "bon / de bon" */
  for (const c of [...candidates]) {
    for (const part of c.split(/\s*\/\s*/)) {
      candidates.add(norm(part))
    }
  }
  return { correct: [...candidates].some((c) => c && (u === c || u.includes(c) || c.includes(u))) }
}

export function evaluateMcq(selected: string, correct: string): Pick<ReviewEvaluationResult, 'correct'> {
  return { correct: norm(selected) === norm(correct) }
}

export function evaluateReorder(tokens: string[], correct: string): Pick<ReviewEvaluationResult, 'correct'> {
  return { correct: norm(tokens.join(' ')) === norm(correct) }
}

export function reviewScoreFromCorrectness(
  correct: boolean,
  selfReported?: ReviewScore
): ReviewScore {
  if (selfReported !== undefined) return selfReported
  return correct ? 4 : 1
}
