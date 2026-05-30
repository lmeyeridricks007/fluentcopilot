/**
 * Trust guardrails: execution-first gating, minimum response, clamping.
 */
import type { SpeakingRawScores } from '@/lib/exam-scoring/types'
import type { WritingRawScores } from '@/lib/exam-scoring/types'
import {
  SPEAKING_CATEGORY_ORDER,
  SPEAKING_MAX_BY_CATEGORY,
  speakingScoresZero,
  clampSpeakingScores,
} from '@/lib/exam-scoring/speakingScoringPolicy'
import {
  WRITING_CATEGORY_ORDER,
  WRITING_MAX_BY_CATEGORY,
  writingScoresZero,
  clampWritingScores,
} from '@/lib/exam-scoring/writingScoringPolicy'

/** Below this word count, treat as non-answer → execution 0 (then gate). */
export const MIN_WORDS_FOR_CREDIT = 2

export function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length
}

/**
 * If execution score is 0, all other categories must be 0 (formal rubric rule).
 */
export function applySpeakingExecutionGate(scores: SpeakingRawScores): {
  scores: SpeakingRawScores
  gated: boolean
} {
  const clamped = clampSpeakingScores(scores)
  if (clamped.execution !== 0) {
    return { scores: clamped, gated: false }
  }
  return { scores: speakingScoresZero(), gated: true }
}

export function applyWritingExecutionGate(scores: WritingRawScores): {
  scores: WritingRawScores
  gated: boolean
} {
  const clamped = clampWritingScores(scores)
  if (clamped.execution !== 0) {
    return { scores: clamped, gated: false }
  }
  return { scores: writingScoresZero(), gated: true }
}

/**
 * Too-short or empty response → force execution 0 (then full gate).
 */
export function applyMinimumResponseGuardSpeaking(
  responseText: string,
  scores: SpeakingRawScores
): SpeakingRawScores {
  if (countWords(responseText) < MIN_WORDS_FOR_CREDIT) {
    return applySpeakingExecutionGate({ ...scores, execution: 0 }).scores
  }
  return scores
}

export function applyMinimumResponseGuardWriting(
  responseText: string,
  scores: WritingRawScores
): WritingRawScores {
  if (countWords(responseText) < MIN_WORDS_FOR_CREDIT) {
    return applyWritingExecutionGate({ ...scores, execution: 0 }).scores
  }
  return scores
}

/** Low STT confidence: do not inflate pronunciation / clearness (soft cap). */
export function applyTranscriptConfidenceGuardSpeaking(
  scores: SpeakingRawScores,
  transcriptConfidence?: number
): SpeakingRawScores {
  if (transcriptConfidence == null || transcriptConfidence >= 0.55) return scores
  const next = { ...scores }
  next.clearness = Math.min(next.clearness, 0)
  next.pronunciation = Math.min(next.pronunciation, 1)
  return clampSpeakingScores(next)
}

export function assertScoresWithinMaxSpeaking(scores: SpeakingRawScores): void {
  for (const k of SPEAKING_CATEGORY_ORDER) {
    if (scores[k] > SPEAKING_MAX_BY_CATEGORY[k] || scores[k] < 0) {
      throw new Error(`Speaking score out of range for ${k}: ${scores[k]}`)
    }
  }
}

export function assertScoresWithinMaxWriting(scores: WritingRawScores): void {
  for (const k of WRITING_CATEGORY_ORDER) {
    if (scores[k] > WRITING_MAX_BY_CATEGORY[k] || scores[k] < 0) {
      throw new Error(`Writing score out of range for ${k}: ${scores[k]}`)
    }
  }
}
