/**
 * Structured learning signals extracted from exam attempts → review + weakness systems.
 * @see docs/product/review-engine.md, exam-prep-architecture
 */
import type { ReviewItemType } from '@/lib/schemas/reviewItem.schema'

export type ExamSignalCategory =
  | 'grammar'
  | 'vocab'
  | 'structural'
  | 'spelling'
  | 'fluency'
  | 'pronunciation'
  | 'listening'
  | 'reading'
  | 'kmn'

/** Single extractable issue (deduped/capped downstream). */
export type ExamLearningSignal = {
  category: ExamSignalCategory
  /** Fine-grained key, e.g. rubric category or correction hash. */
  subkind: string
  weight: 1 | 2 | 3
  /** Stable key for deduplication within one attempt. */
  dedupeKey: string
  /** Feeds `recordWeakSelfCheckTags` — use stable prefixes `exam-…`. */
  weakTag: string
  /** Optional extra tags (same dedupe bucket; for legacy + exam-prefixed co-tracking). */
  extraWeakTags?: string[]
  /** When set, can become a Stage-4 review row. */
  reviewHint?: {
    type: ReviewItemType
    prompt: string
    expectedAnswer: string
    tags?: string[]
  }
  /** Optional context for `recordMistakeEvent` (top signals only). */
  mistakeContext?: {
    userSnippet: string
    targetSnippet: string
    noteNl: string
  }
}

export type ExamLoopContext = {
  examDomain: 'speaking' | 'writing' | 'listening' | 'reading' | 'kmn'
  mode: 'training' | 'simulation'
  exerciseId: string
  attemptId: string
}

export type ExamLoopApplyResult = {
  signalCount: number
  dedupedSignalCount: number
  reviewItemsUpserted: number
  weakTagsEmitted: number
  mistakeEventsAppended: number
}
