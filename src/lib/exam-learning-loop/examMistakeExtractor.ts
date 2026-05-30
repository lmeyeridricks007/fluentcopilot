/**
 * Top-level exam attempt → learning loop: signals → dedupe → review ingest + weakness + mistakes + analytics.
 */
import { dedupeAndCapExamSignals } from '@/lib/exam-learning-loop/examSignalDeduper'
import {
  examSignalsToReviewItems,
  feedbackReviewCandidatesToReviewItems,
  mergeReviewItemLists,
} from '@/lib/exam-learning-loop/examToReviewMapper'
import { examSignalsToWeakTags } from '@/lib/exam-learning-loop/examToWeaknessMapper'
import { ingestExamDerivedReviewItems } from '@/lib/exam-learning-loop/examReviewIngest'
import { mapSpeakingSimulationToSignals, mapSpeakingTrainingToSignals } from '@/lib/exam-learning-loop/speakingMistakeMapper'
import { mapWritingSimulationToSignals, mapWritingTrainingToSignals } from '@/lib/exam-learning-loop/writingMistakeMapper'
import { mapListeningOutcomeToSignals } from '@/lib/exam-learning-loop/listeningMistakeMapper'
import { mapReadingOutcomeToSignals } from '@/lib/exam-learning-loop/readingMistakeMapper'
import { mapKmnOutcomeToSignals } from '@/lib/exam-learning-loop/kmnMistakeMapper'
import type { ExamLoopApplyResult, ExamLoopContext, ExamLearningSignal } from '@/lib/exam-learning-loop/types'
import type { ReviewPersistencePort } from '@/lib/review-engine/reviewPersistence'
import type { ExamReadinessLoopInput } from '@/lib/exam-readiness/examReadinessLoopInput'
import { recordExamReadinessFromLoopInput } from '@/lib/exam-readiness/examReadinessRecorder'
import { recordWeakSelfCheckTags } from '@/features/curriculum/a2ReviewStore'
import { recordMistakeEvent } from '@/lib/mistakes/mistakeTagger'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { trackLearningLoopStage } from '@/lib/analytics/learningLoopAnalytics'

export type ApplyExamLoopInput = ExamReadinessLoopInput

function ctxFromInput(input: ApplyExamLoopInput): ExamLoopContext {
  switch (input.kind) {
    case 'speaking_training':
      return {
        examDomain: 'speaking',
        mode: 'training',
        exerciseId: input.bundle.item.id,
        attemptId: input.bundle.attemptId,
      }
    case 'speaking_simulation':
      return {
        examDomain: 'speaking',
        mode: 'simulation',
        exerciseId: input.bundle.item.id,
        attemptId: input.bundle.attemptId,
      }
    case 'writing_training':
      return {
        examDomain: 'writing',
        mode: 'training',
        exerciseId: input.bundle.item.id,
        attemptId: input.bundle.attemptId,
      }
    case 'writing_simulation':
      return {
        examDomain: 'writing',
        mode: 'simulation',
        exerciseId: input.bundle.item.id,
        attemptId: input.bundle.attemptId,
      }
    case 'listening':
      return {
        examDomain: 'listening',
        mode: 'training',
        exerciseId: input.itemId,
        attemptId: input.attemptId,
      }
    case 'reading':
      return {
        examDomain: 'reading',
        mode: 'training',
        exerciseId: input.itemId,
        attemptId: input.attemptId,
      }
    case 'kmn':
      return {
        examDomain: 'kmn',
        mode: 'training',
        exerciseId: input.conceptOrStepId,
        attemptId: input.attemptId,
      }
  }
}

function extractRawSignals(input: ApplyExamLoopInput): ExamLearningSignal[] {
  switch (input.kind) {
    case 'speaking_training':
      return mapSpeakingTrainingToSignals(input.bundle)
    case 'speaking_simulation':
      return mapSpeakingSimulationToSignals(input.bundle)
    case 'writing_training':
      return mapWritingTrainingToSignals(input.bundle)
    case 'writing_simulation':
      return mapWritingSimulationToSignals(input.bundle)
    case 'listening':
      return mapListeningOutcomeToSignals({
        itemId: input.itemId,
        questionType: input.questionType,
        correct: input.correct,
        replayCount: input.replayCount,
        maxReplay: input.maxReplay,
      })
    case 'reading':
      return mapReadingOutcomeToSignals({
        itemId: input.itemId,
        readingSkill: input.readingSkill,
        correct: input.correct,
      })
    case 'kmn':
      return mapKmnOutcomeToSignals({
        topicId: input.topicId,
        surface: input.surface,
        conceptOrStepId: input.conceptOrStepId,
        correct: input.correct,
      })
  }
}

function shouldPersistReview(input: ApplyExamLoopInput, signalCount: number): boolean {
  if (signalCount === 0) return false
  if (input.kind === 'listening' || input.kind === 'reading' || input.kind === 'kmn') {
    return true
  }
  const engine =
    input.kind === 'speaking_training' ||
    input.kind === 'writing_training' ||
    input.kind === 'speaking_simulation' ||
    input.kind === 'writing_simulation'
      ? input.bundle.engine
      : null
  if (!engine) return false
  const isSimulation = input.kind === 'speaking_simulation' || input.kind === 'writing_simulation'
  if (isSimulation) {
    return !engine.pass || engine.normalizedPercent < 75
  }
  return !engine.pass || engine.normalizedPercent < 82
}

function shouldEmitWeakTags(input: ApplyExamLoopInput, signalCount: number): boolean {
  if (signalCount === 0) return false
  if (input.kind === 'listening' || input.kind === 'reading' || input.kind === 'kmn') return true
  const engine =
    input.kind === 'speaking_training' ||
    input.kind === 'writing_training' ||
    input.kind === 'speaking_simulation' ||
    input.kind === 'writing_simulation'
      ? input.bundle.engine
      : null
  if (!engine) return false
  return !engine.pass || engine.normalizedPercent < 88
}

/**
 * Full async pipeline (call from client after scoring).
 */
export async function applyExamLearningLoop(
  userId: string,
  port: ReviewPersistencePort,
  input: ApplyExamLoopInput
): Promise<ExamLoopApplyResult> {
  const ctx = ctxFromInput(input)
  recordExamReadinessFromLoopInput(input)
  const raw = extractRawSignals(input)
  const rawCount = raw.length
  if (rawCount === 0) {
    return {
      signalCount: 0,
      dedupedSignalCount: 0,
      reviewItemsUpserted: 0,
      weakTagsEmitted: 0,
      mistakeEventsAppended: 0,
    }
  }

  const { signals, droppedDuplicateKeys } = dedupeAndCapExamSignals(raw, {
    maxSignals: 14,
    maxReviewHints: 5,
  })

  let reviewItems = examSignalsToReviewItems(signals, ctx)
  if (
    input.kind === 'speaking_training' &&
    input.bundle.feedbackBlock.reviewCandidates?.length
  ) {
    const fb = feedbackReviewCandidatesToReviewItems(input.bundle.feedbackBlock.reviewCandidates, ctx)
    reviewItems = mergeReviewItemLists(reviewItems, fb)
  }
  if (
    input.kind === 'writing_training' &&
    input.bundle.feedbackBlock.reviewCandidates?.length
  ) {
    const fb = feedbackReviewCandidatesToReviewItems(input.bundle.feedbackBlock.reviewCandidates, ctx)
    reviewItems = mergeReviewItemLists(reviewItems, fb)
  }

  let reviewUpserted = 0
  if (shouldPersistReview(input, signals.length) && reviewItems.length > 0) {
    const r = await ingestExamDerivedReviewItems(userId, port, reviewItems)
    reviewUpserted = r.newBankRows
  }

  let weakCount = 0
  if (shouldEmitWeakTags(input, signals.length)) {
    const tags = examSignalsToWeakTags(signals)
    recordWeakSelfCheckTags(tags)
    weakCount = tags.length
  }

  let mistakeEventsAppended = 0
  const recordMistakes =
    input.kind === 'speaking_training' ||
    input.kind === 'writing_training' ||
    input.kind === 'listening' ||
    input.kind === 'reading'
  if (recordMistakes) {
    const withCtx = signals.filter((s) => s.mistakeContext).slice(0, 3)
    for (const s of withCtx) {
      if (!s.mistakeContext) continue
      await recordMistakeEvent(port, {
        userId,
        lessonId: `exam-${ctx.examDomain}-${ctx.mode}`,
        stepId: `${ctx.attemptId}-${s.dedupeKey}`,
        itemId: ctx.exerciseId,
        userAnswer: s.mistakeContext.userSnippet.slice(0, 400),
        correctAnswer: s.mistakeContext.targetSnippet.slice(0, 400),
        severity: s.weight,
        classify: {
          contextTags: [s.category, s.subkind, s.weakTag, 'exam_prep', ctx.examDomain],
          userAnswer: s.mistakeContext.userSnippet,
          correctAnswer: s.mistakeContext.targetSnippet,
        },
      })
      mistakeEventsAppended += 1
    }
  }

  track(ANALYTICS_EVENTS.exam_mistakes_extracted, {
    exam_domain: ctx.examDomain,
    exam_mode: ctx.mode,
    exercise_id: ctx.exerciseId,
    raw_signal_count: rawCount,
    deduped_signal_count: signals.length,
    deduped_duplicate_keys: droppedDuplicateKeys,
  })
  if (rawCount > 0) {
    trackLearningLoopStage('mistake_extracted', {
      exam_domain: ctx.examDomain,
      exam_mode: ctx.mode,
      exercise_id: ctx.exerciseId,
      attempt_id: ctx.attemptId,
      raw_signal_count: rawCount,
      deduped_signal_count: signals.length,
    })
  }
  track(ANALYTICS_EVENTS.exam_review_items_generated, {
    exam_domain: ctx.examDomain,
    count: reviewItems.length,
    new_rows: reviewUpserted,
    persisted: shouldPersistReview(input, signals.length),
  })
  if (reviewUpserted > 0) {
    trackLearningLoopStage('review_item_created', {
      exam_domain: ctx.examDomain,
      exam_mode: ctx.mode,
      new_rows: reviewUpserted,
      review_item_count: reviewItems.length,
    })
  }
  track(ANALYTICS_EVENTS.exam_weakness_updated, {
    exam_domain: ctx.examDomain,
    weak_tag_count: weakCount,
  })
  if (weakCount > 0) {
    trackLearningLoopStage('weakness_updated', {
      exam_domain: ctx.examDomain,
      weak_tag_count: weakCount,
    })
  }
  if (droppedDuplicateKeys > 0) {
    track(ANALYTICS_EVENTS.exam_signal_deduped, {
      exam_domain: ctx.examDomain,
      dropped: droppedDuplicateKeys,
    })
  }
  track(ANALYTICS_EVENTS.exam_next_practice_recommended, {
    exam_domain: ctx.examDomain,
    has_review_items: reviewItems.length > 0,
    has_weak_tags: weakCount > 0,
  })
  trackLearningLoopStage('recommendation_emitted', {
    exam_domain: ctx.examDomain,
    exam_mode: ctx.mode,
    has_review_items: reviewItems.length > 0,
    has_weak_tags: weakCount > 0,
    review_item_count: reviewItems.length,
  })

  return {
    signalCount: rawCount,
    dedupedSignalCount: signals.length,
    reviewItemsUpserted: reviewUpserted,
    weakTagsEmitted: weakCount,
    mistakeEventsAppended,
  }
}

/** Client-safe fire-and-forget wrapper. */
export function applyExamLearningLoopClient(input: ApplyExamLoopInput): void {
  if (typeof window === 'undefined') return
  void (async () => {
    const { localReviewPersistence } = await import('@/lib/review-engine/reviewPersistence')
    const { getRetentionUserId } = await import('@/lib/retention/retentionService')
    await applyExamLearningLoop(getRetentionUserId(), localReviewPersistence, input)
  })()
}
