/**
 * Stage 4 review engine — runtime types (session cards, queues, scoring).
 * Content rows use `ReviewItem` / `SrsItem` from Zod schemas.
 */
import type { ReviewItem, ReviewItemType } from '@/lib/schemas/reviewItem.schema'
import type { SrsItem } from '@/lib/schemas/srsItem.schema'

/** Learner self-grade or derived grade before SRS mapping (1 wrong … 4 perfect). */
export type ReviewScore = 1 | 2 | 3 | 4

export type ReviewSessionMode = 'daily' | 'module' | 'mistake_fix'

export type ReviewCardUiMode = 'mcq' | 'reorder' | 'fill_blank' | 'speaking' | 'listening_mcq' | 'kmn_flash'

export type ReviewSessionCard = {
  /** Unique within the built session (instance id). */
  instanceId: string
  srsItemId: string
  reviewItemId: string
  sourceLessonId: string
  itemType: ReviewItemType
  uiMode: ReviewCardUiMode
  prompt: string
  /** MCQ / listening options (correct is always options[0] before shuffle in UI). */
  options?: string[]
  /** Word-bank order for reorder UI. */
  tokens?: string[]
  /** Canonical correct answer(s) for evaluation. */
  correctAnswer: string | string[]
  /** Optional lemma key for mastery updates. */
  lemmaKey?: string
  /** Optional grammar thread id/label. */
  grammarKey?: string
  /** KMN flashcard: optional example line on the back (from review item metadata). */
  kmnExampleNl?: string
  /** Listening MCQ: Dutch line spoken via browser TTS (not shown as the prompt). */
  listeningTextNl?: string
  /** English meaning of the target lemma — drives meaning-based hints. */
  translation?: string
  /** Dutch example sentence from the lesson catalog — anchor for cloze drills. */
  exampleNl?: string
  /** English translation of the example sentence — usage-based hint. */
  exampleEn?: string
  /** "noun" / "verb" / etc. — adds a category hint to vocab cards. */
  partOfSpeech?: string
  /** True when the prompt is a Dutch sentence with the lemma masked (cloze fill-blank). */
  isCloze?: boolean
}

export type ReviewCardLifecycle =
  | 'start'
  | 'active'
  | 'submitted'
  | 'feedback'
  | 'advance'

export type ReviewCardTelemetry =
  | 'card_started'
  | 'answer_submitted'
  | 'answer_correct'
  | 'answer_incorrect'
  | 'hint_used'
  | 'card_completed'

export type SessionBuildOptions = {
  userId: string
  mode: ReviewSessionMode
  /** Module id prefix e.g. `a2-m02` from lesson ids. */
  moduleId?: string
  /** Target cards (soft cap for ~3–5 min mobile session). */
  targetSize?: number
  now?: Date
  /** Deterministic PRNG seed (tests / simulate script). */
  seed?: number
}

export type DueSortContext = {
  now: Date
  /** Higher = more urgent in tie-breaks. */
  mistakeWeightByReviewItemId: Map<string, number>
}

export type ReviewEvaluationResult = {
  correct: boolean
  /** Normalised effective score for SRS (after penalties applied upstream). */
  score: ReviewScore
}

export type EnrichedDueRow = {
  srs: SrsItem
  item: ReviewItem
}

export function moduleIdFromLessonId(lessonId: string): string | undefined {
  const m = /^(.+)-l\d+$/i.exec(lessonId.trim())
  return m ? m[1] : undefined
}

export function slugifyLemma(lemma: string): string {
  return lemma
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9äöüéèêëàáâåœæß-]/gi, '')
    .slice(0, 48)
}

export function reviewItemIdForLemma(lessonId: string, lemma: string): string {
  const slug = slugifyLemma(lemma) || 'lemma'
  return `rev-${lessonId}-lemma-${slug}`
}

export function reviewItemIdForGrammar(lessonId: string): string {
  return `rev-${lessonId}-grammar`
}

export function srsIdFor(userId: string, reviewItemId: string): string {
  return `srs-${userId}-${reviewItemId}`.replace(/\s+/g, '_')
}
