'use client'

import { useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import type { WritingTrainingEvaluationBundle } from '@/lib/exam-prep/writing/types'
import { ANALYTICS_EVENTS } from '@/lib/analytics'
import { useSpeakingExamSectionReveal } from '@/features/exam-prep/speaking/useSpeakingExamSectionReveal'
import { WritingScoreSummaryCard } from '@/features/exam-prep/writing/results/WritingScoreSummaryCard'
import { WritingLearnerAnswerCard } from '@/features/exam-prep/writing/results/WritingLearnerAnswerCard'
import { WritingCategoryFeedbackList } from '@/features/exam-prep/writing/results/WritingCategoryFeedbackList'
import { WritingRubricBreakdown } from '@/features/exam-prep/writing/results/WritingRubricBreakdown'
import { SpeakingHighlightsCard } from '@/features/exam-prep/speaking/results/SpeakingHighlightsCard'
import { WritingCorrectionsCard } from '@/features/exam-prep/writing/results/WritingCorrectionsCard'
import { WritingRewrittenVersionCard } from '@/features/exam-prep/writing/results/WritingRewrittenVersionCard'
import { WritingModelAnswerCard } from '@/features/exam-prep/writing/results/WritingModelAnswerCard'
import { WritingNextStepCard } from '@/features/exam-prep/writing/results/WritingNextStepCard'

export function WritingExamResultScreen({
  result,
  onRetry,
  onNext,
}: {
  result: WritingTrainingEvaluationBundle
  onRetry: () => void
  onNext: () => void
}) {
  const tid = result.item.id
  const getBase = useMemo(
    () => () => ({ task_id: tid, exam_mode: 'training' as const }),
    [tid]
  )

  const refCorrections = useSpeakingExamSectionReveal(ANALYTICS_EVENTS.writing_exam_corrections_viewed, getBase, true)
  const refRewritten = useSpeakingExamSectionReveal(ANALYTICS_EVENTS.writing_exam_rewritten_version_viewed, getBase, true)
  const refModel = useSpeakingExamSectionReveal(ANALYTICS_EVENTS.writing_exam_model_answer_viewed, getBase, true)

  return (
    <div className="space-y-5">
      <WritingScoreSummaryCard ui={result.feedbackUi} engine={result.engine} />

      {result.feedbackUi.learnerAnswerPreview ? (
        <WritingLearnerAnswerCard text={result.feedbackUi.learnerAnswerPreview} />
      ) : null}

      <WritingCategoryFeedbackList ui={result.feedbackUi} />

      <WritingRubricBreakdown ui={result.feedbackUi} taskId={tid} />

      <SpeakingHighlightsCard strengths={result.feedbackUi.strengths} improvements={result.feedbackUi.improvements} />

      <div ref={refCorrections}>
        <WritingCorrectionsCard corrections={result.coach.corrections} />
      </div>

      <div ref={refRewritten}>
        <WritingRewrittenVersionCard dutch={result.coach.improvedVersionDutch} noteNl={result.coach.improvedVersionNoteNl} />
      </div>

      <div ref={refModel}>
        <WritingModelAnswerCard dutch={result.coach.idealAnswerDutch} noteEn={result.coach.idealAnswerNoteEn} />
      </div>

      <WritingNextStepCard
        nextStepNl={result.coach.nextStepNl}
        actions={result.feedbackBlock.nextBestActions ?? []}
        taskId={tid}
      />

      <div className="flex flex-col gap-2 pt-1">
        <Button type="button" variant="secondary" className="w-full min-h-touch" onClick={onRetry}>
          Opnieuw deze opdracht
        </Button>
        <Button type="button" className="w-full min-h-touch" onClick={onNext}>
          Nieuwe opdracht (zelfde type)
        </Button>
      </div>
    </div>
  )
}
