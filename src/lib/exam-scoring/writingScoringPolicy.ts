/**
 * Dutch A2 writing rubric — fixed maxima. Total max 10.
 * execution 0–3; grammar, spelling, vocabulary 0–2; clearness 0–1.
 */
import type { WritingEngineCategoryKey, WritingRawScores } from '@/lib/exam-scoring/types'

export const WRITING_RUBRIC_ID = 'rubric-a2-writing-formal-v1'
export const WRITING_RUBRIC_VERSION = '2.0.0'
export const WRITING_EVALUATOR_VERSION = 'exam-scoring-writing-v1'

export const WRITING_CATEGORY_ORDER: WritingEngineCategoryKey[] = [
  'execution',
  'grammar',
  'spelling',
  'clearness',
  'vocabulary',
]

export const WRITING_MAX_BY_CATEGORY: Record<WritingEngineCategoryKey, number> = {
  execution: 3,
  grammar: 2,
  spelling: 2,
  clearness: 1,
  vocabulary: 2,
}

export const WRITING_MAX_TOTAL = WRITING_CATEGORY_ORDER.reduce(
  (s, k) => s + WRITING_MAX_BY_CATEGORY[k],
  0
)

export const WRITING_CATEGORY_LABELS: Record<WritingEngineCategoryKey, { nl: string; en: string }> = {
  execution: { nl: 'Uitvoering van de opdracht', en: 'Execution of the task' },
  grammar: { nl: 'Grammatica', en: 'Grammar' },
  spelling: { nl: 'Spelling', en: 'Spelling' },
  clearness: { nl: 'Duidelijkheid / verstaanbaarheid', en: 'Clearness / understandability' },
  vocabulary: { nl: 'Woordenschat', en: 'Vocabulary' },
}

export function writingScoresZero(): WritingRawScores {
  return {
    execution: 0,
    grammar: 0,
    spelling: 0,
    clearness: 0,
    vocabulary: 0,
  }
}

export function clampWritingScores(raw: WritingRawScores): WritingRawScores {
  const out = { ...raw }
  for (const k of WRITING_CATEGORY_ORDER) {
    const max = WRITING_MAX_BY_CATEGORY[k]
    out[k] = Math.max(0, Math.min(max, Math.round(Number(out[k]) || 0)))
  }
  return out
}
