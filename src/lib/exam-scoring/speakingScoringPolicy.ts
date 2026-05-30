/**
 * Dutch A2 speaking rubric — fixed maxima per formal grading model.
 * Ranges: execution 0–3; vocabulary, grammar, fluency, pronunciation 0–2; clearness 0–1. Total 12.
 */
import type { SpeakingEngineCategoryKey, SpeakingRawScores } from '@/lib/exam-scoring/types'

export const SPEAKING_RUBRIC_ID = 'rubric-a2-speaking-formal-v1'
export const SPEAKING_RUBRIC_VERSION = '2.0.0'
export const SPEAKING_EVALUATOR_VERSION = 'exam-scoring-speaking-v1'

/** Ordered display / aggregation order. */
export const SPEAKING_CATEGORY_ORDER: SpeakingEngineCategoryKey[] = [
  'execution',
  'vocabulary',
  'grammar',
  'fluency',
  'clearness',
  'pronunciation',
]

export const SPEAKING_MAX_BY_CATEGORY: Record<SpeakingEngineCategoryKey, number> = {
  execution: 3,
  vocabulary: 2,
  grammar: 2,
  fluency: 2,
  clearness: 1,
  pronunciation: 2,
}

export const SPEAKING_MAX_TOTAL = SPEAKING_CATEGORY_ORDER.reduce(
  (s, k) => s + SPEAKING_MAX_BY_CATEGORY[k],
  0
)

export const SPEAKING_CATEGORY_LABELS: Record<SpeakingEngineCategoryKey, { nl: string; en: string }> = {
  execution: { nl: 'Uitvoering van de opdracht', en: 'Execution of the task' },
  vocabulary: { nl: 'Woordenschat', en: 'Vocabulary' },
  grammar: { nl: 'Grammatica', en: 'Grammar' },
  fluency: { nl: 'Vloeiendheid', en: 'Fluency' },
  clearness: { nl: 'Duidelijkheid / verstaanbaarheid', en: 'Clearness / understandability' },
  pronunciation: { nl: 'Uitspraak', en: 'Pronunciation' },
}

export function speakingScoresZero(): SpeakingRawScores {
  return {
    execution: 0,
    vocabulary: 0,
    grammar: 0,
    fluency: 0,
    clearness: 0,
    pronunciation: 0,
  }
}

export function clampSpeakingScores(raw: SpeakingRawScores): SpeakingRawScores {
  const out = { ...raw }
  for (const k of SPEAKING_CATEGORY_ORDER) {
    const max = SPEAKING_MAX_BY_CATEGORY[k]
    out[k] = Math.max(0, Math.min(max, Math.round(Number(out[k]) || 0)))
  }
  return out
}
