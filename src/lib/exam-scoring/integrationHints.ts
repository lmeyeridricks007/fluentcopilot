/**
 * Derive weak tags and short summary from scored categories (feedback / review / analytics).
 */
import type { SpeakingRawScores } from '@/lib/exam-scoring/types'
import type { WritingRawScores } from '@/lib/exam-scoring/types'
import { SPEAKING_MAX_BY_CATEGORY, SPEAKING_CATEGORY_ORDER } from '@/lib/exam-scoring/speakingScoringPolicy'
import { WRITING_MAX_BY_CATEGORY, WRITING_CATEGORY_ORDER } from '@/lib/exam-scoring/writingScoringPolicy'

const RATIO_WEAK = 0.5

function isCategoryWeak(score: number, max: number): boolean {
  if (max <= 0) return false
  return score < max * RATIO_WEAK
}

export function weakTagsFromSpeakingScores(scores: SpeakingRawScores): string[] {
  const tags: string[] = []
  for (const k of SPEAKING_CATEGORY_ORDER) {
    if (isCategoryWeak(scores[k], SPEAKING_MAX_BY_CATEGORY[k])) {
      tags.push(`exam-speaking-${k}`)
    }
  }
  if (scores.execution === 0) tags.push('exam-execution')
  return [...new Set(tags)]
}

export function weakTagsFromWritingScores(scores: WritingRawScores): string[] {
  const tags: string[] = []
  for (const k of WRITING_CATEGORY_ORDER) {
    if (isCategoryWeak(scores[k], WRITING_MAX_BY_CATEGORY[k])) {
      tags.push(`exam-writing-${k}`)
    }
  }
  if (scores.execution === 0) tags.push('exam-execution')
  return [...new Set(tags)]
}

export function mistakeOrientedTagsFromSpeaking(scores: SpeakingRawScores): string[] {
  const out: string[] = []
  if (isCategoryWeak(scores.grammar, SPEAKING_MAX_BY_CATEGORY.grammar)) out.push('grammar')
  if (isCategoryWeak(scores.vocabulary, SPEAKING_MAX_BY_CATEGORY.vocabulary)) out.push('vocab')
  if (isCategoryWeak(scores.pronunciation, SPEAKING_MAX_BY_CATEGORY.pronunciation))
    out.push('pronunciation')
  if (scores.execution === 0) out.push('task-completion')
  return [...new Set(out)]
}

export function mistakeOrientedTagsFromWriting(scores: WritingRawScores): string[] {
  const out: string[] = []
  if (isCategoryWeak(scores.grammar, WRITING_MAX_BY_CATEGORY.grammar)) out.push('grammar')
  if (isCategoryWeak(scores.spelling, WRITING_MAX_BY_CATEGORY.spelling)) out.push('spelling')
  if (isCategoryWeak(scores.vocabulary, WRITING_MAX_BY_CATEGORY.vocabulary)) out.push('vocab')
  if (scores.execution === 0) out.push('task-completion')
  return [...new Set(out)]
}
