'use client'

import { useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import type { SpeakingTrainingEvaluationBundle } from '@/lib/exam-prep/speaking/types'
import { ANALYTICS_EVENTS } from '@/lib/analytics'
import { useSpeakingExamSectionReveal } from '@/features/exam-prep/speaking/useSpeakingExamSectionReveal'
import { SpeakingScoreSummaryCard } from '@/features/exam-prep/speaking/results/SpeakingScoreSummaryCard'
import { SpeakingLearnerAnswerCard } from '@/features/exam-prep/speaking/results/SpeakingLearnerAnswerCard'
import { SpeakingRubricBreakdown } from '@/features/exam-prep/speaking/results/SpeakingRubricBreakdown'
import { SpeakingHighlightsCard } from '@/features/exam-prep/speaking/results/SpeakingHighlightsCard'
import { SpeakingCorrectionsCard } from '@/features/exam-prep/speaking/results/SpeakingCorrectionsCard'
import { SpeakingImprovedVersionCard } from '@/features/exam-prep/speaking/results/SpeakingImprovedVersionCard'
import { SpeakingIdealAnswerCard } from '@/features/exam-prep/speaking/results/SpeakingIdealAnswerCard'
import { SpeakingNextStepCard } from '@/features/exam-prep/speaking/results/SpeakingNextStepCard'

export function SpeakingExamResultScreen({
  result,
  onRetry,
  onNext,
}: {
  result: SpeakingTrainingEvaluationBundle
  onRetry: () => void
  onNext: () => void
}) {
  const qid = result.item.id
  const getBase = useMemo(
    () => () => ({ question_id: qid, exam_mode: 'training' as const }),
    [qid]
  )

  const refCorrections = useSpeakingExamSectionReveal(ANALYTICS_EVENTS.speaking_exam_corrections_viewed, getBase, true)
  const refImproved = useSpeakingExamSectionReveal(ANALYTICS_EVENTS.speaking_exam_improved_version_viewed, getBase, true)
  const refIdeal = useSpeakingExamSectionReveal(ANALYTICS_EVENTS.speaking_exam_ideal_answer_viewed, getBase, true)

  return (
    <div className="space-y-5">
      <SpeakingScoreSummaryCard ui={result.feedbackUi} engine={result.engine} />

      {result.feedbackUi.learnerAnswerPreview ? (
        <SpeakingLearnerAnswerCard text={result.feedbackUi.learnerAnswerPreview} />
      ) : null}

      <SpeakingRubricBreakdown ui={result.feedbackUi} questionId={qid} />

      <SpeakingHighlightsCard strengths={result.feedbackUi.strengths} improvements={result.feedbackUi.improvements} />

      <div ref={refCorrections}>
        <SpeakingCorrectionsCard corrections={result.coach.corrections} />
      </div>

      <div ref={refImproved}>
        <SpeakingImprovedVersionCard dutch={result.coach.improvedVersionDutch} noteNl={result.coach.improvedVersionNoteNl} />
      </div>

      <div ref={refIdeal}>
        <SpeakingIdealAnswerCard dutch={result.coach.idealAnswerDutch} noteEn={result.coach.idealAnswerNoteEn} />
      </div>

      <SpeakingNextStepCard
        nextStepNl={result.coach.nextStepNl}
        actions={result.feedbackBlock.nextBestActions ?? []}
        questionId={qid}
      />

      <div className="flex flex-col gap-2 pt-1">
        <Button type="button" variant="secondary" className="w-full min-h-touch" onClick={onRetry}>
          Opnieuw deze vraag
        </Button>
        <Button type="button" className="w-full min-h-touch" onClick={onNext}>
          Volgende vraag
        </Button>
      </div>
    </div>
  )
}
