'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { WritingCategorySelector } from '@/features/exam-prep/writing/WritingCategorySelector'
import { WritingPromptCard } from '@/features/exam-prep/writing/WritingPromptCard'
import { WritingInputPanel } from '@/features/exam-prep/writing/WritingInputPanel'
import { WritingExamResultScreen } from '@/features/exam-prep/writing/results/WritingExamResultScreen'
import { ExamPrepRewardBanner } from '@/features/exam-prep/components/ExamPrepRewardBanner'
import { useWritingTrainingSession } from '@/features/exam-prep/writing/useWritingTrainingSession'
import { useAuthStore } from '@/store/authStore'

export function WritingTrainingScreen() {
  const userId = useAuthStore((s) => s.user?.id ?? '')
  const {
    phase,
    item,
    result,
    submitError,
    setSubmitError,
    sessionKey,
    selectCategory,
    submitAnswer,
    retrySameTask,
    nextTaskSameCategory,
    backToCategories,
    retentionReward,
  } = useWritingTrainingSession()

  return (
    <div className="px-4 py-6 pb-28 space-y-5 max-w-lg mx-auto w-full min-h-[70vh]">
      <div className="flex items-center gap-2 -mt-1">
        <Link
          href="/app/exam-prep/writing"
          className="inline-flex items-center gap-1 text-body-sm font-medium text-primary-600 hover:underline min-h-touch py-1"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden />
          Schrijven — examen
        </Link>
      </div>

      <header className="space-y-1">
        <h1 className="text-title font-bold text-ink-primary tracking-tight">Writing — training</h1>
        <p className="text-body-sm text-ink-secondary leading-snug">
          Examengerichte opdrachten met puntenlijst, rubricbeoordeling (uitvoering, grammatica, spelling, duidelijkheid,
          woordenschat) en duidelijke vervolgstappen — niet hetzelfde als vrije chat.
        </p>
      </header>

      {phase === 'category' ? <WritingCategorySelector onSelect={selectCategory} /> : null}

      {phase === 'prompt' && item ? (
        <>
          <WritingPromptCard item={item} />
          <WritingInputPanel
            sessionKey={sessionKey}
            item={item}
            userId={userId || undefined}
            onSubmit={submitAnswer}
            error={submitError}
            onDismissError={() => setSubmitError(null)}
          />
          <Button type="button" variant="secondary" className="w-full min-h-touch" onClick={backToCategories}>
            Ander opdrachttype kiezen
          </Button>
        </>
      ) : null}

      {phase === 'feedback' && result ? (
        <>
          <ExamPrepRewardBanner reward={retentionReward} />
          <WritingExamResultScreen result={result} onRetry={retrySameTask} onNext={nextTaskSameCategory} />
        </>
      ) : null}
    </div>
  )
}
