/**
 * Convert exam learning signals (+ optional feedback review candidates) → Stage-4 ReviewItem rows.
 */
import { reviewItemSchema, type ReviewItem } from '@/lib/schemas/reviewItem.schema'
import type { ExamLearningSignal, ExamLoopContext } from '@/lib/exam-learning-loop/types'
import type { ReviewExtractionCandidate } from '@/lib/schemas/exam/feedbackBlock.schema'

function slug(s: string, max = 48): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, max)
}

function stableId(prefix: string, key: string): string {
  return `${prefix}-${slug(key, 56)}`
}

/**
 * Build review rows from capped signals (only those with reviewHint).
 */
export function examSignalsToReviewItems(
  signals: ExamLearningSignal[],
  ctx: ExamLoopContext
): ReviewItem[] {
  const lessonId = `exam-${ctx.examDomain}-${ctx.mode}-${slug(ctx.exerciseId, 36)}`
  const moduleId = `exam-prep-${ctx.examDomain}`
  const items: ReviewItem[] = []

  for (const s of signals) {
    if (!s.reviewHint) continue
    const id = stableId(`rev-exam-${ctx.examDomain}`, `${ctx.attemptId}-${s.dedupeKey}`)
    const parsed = reviewItemSchema.safeParse({
      id,
      sourceLessonId: lessonId,
      type: s.reviewHint.type,
      prompt: s.reviewHint.prompt,
      expectedAnswer: s.reviewHint.expectedAnswer,
      difficulty: 'A2_mid',
      tags: [...(s.reviewHint.tags ?? []), 'exam_derived', ctx.examDomain],
      metadata: {
        moduleId,
        examAttemptId: ctx.attemptId,
        examExerciseId: ctx.exerciseId,
        examSignalDedupeKey: s.dedupeKey,
        examSignalCategory: s.category,
      },
    })
    if (parsed.success) items.push(parsed.data)
  }

  return items
}

/**
 * Map authoring `reviewCandidates` from FeedbackBlock into bank rows (deduped by suggested id or hash).
 */
export function feedbackReviewCandidatesToReviewItems(
  candidates: ReviewExtractionCandidate[] | undefined,
  ctx: ExamLoopContext
): ReviewItem[] {
  if (!candidates?.length) return []
  const lessonId = `exam-${ctx.examDomain}-${ctx.mode}-${slug(ctx.exerciseId, 36)}`
  const moduleId = `exam-prep-${ctx.examDomain}`
  const out: ReviewItem[] = []
  for (const c of candidates.slice(0, 3)) {
    const id =
      c.suggestedReviewItemId ??
      stableId(`rev-exam-fb-${ctx.examDomain}`, `${ctx.attemptId}-${c.prompt.slice(0, 40)}`)
    const parsed = reviewItemSchema.safeParse({
      id,
      sourceLessonId: lessonId,
      type: c.reviewItemType,
      prompt: c.prompt,
      expectedAnswer: c.expectedAnswer,
      difficulty: 'A2_mid',
      tags: [...(c.tags ?? []), 'exam_feedback_candidate'],
      metadata: { moduleId, examAttemptId: ctx.attemptId, source: 'feedback_block' },
    })
    if (parsed.success) out.push(parsed.data)
  }
  return out
}

/**
 * Merge signal-derived and feedback-candidate rows; drop duplicate ids.
 */
export function mergeReviewItemLists(primary: ReviewItem[], secondary: ReviewItem[]): ReviewItem[] {
  const seen = new Set<string>()
  const merged: ReviewItem[] = []
  for (const it of [...primary, ...secondary]) {
    if (seen.has(it.id)) continue
    seen.add(it.id)
    merged.push(it)
  }
  return merged
}
