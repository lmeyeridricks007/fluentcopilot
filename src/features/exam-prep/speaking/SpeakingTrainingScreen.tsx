'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SpeakingPromptCard } from '@/features/exam-prep/speaking/SpeakingPromptCard'
import { SpeakingInputPanel } from '@/features/exam-prep/speaking/SpeakingInputPanel'
import { SpeakingSessionIntroCard } from '@/features/exam-prep/speaking/SpeakingSessionIntroCard'
import { SpeakingCompactFeedbackCard } from '@/features/exam-prep/speaking/SpeakingCompactFeedbackCard'
import { SpeakingSessionSummaryScreen } from '@/features/exam-prep/speaking/SpeakingSessionSummaryScreen'
import { useSpeakingTrainingSession } from '@/features/exam-prep/speaking/useSpeakingTrainingSession'

export function SpeakingTrainingScreen() {
  const {
    phase,
    plan,
    item,
    questionIndex,
    lastBundle,
    sessionSummary,
    submitError,
    setSubmitError,
    sessionKey,
    startSession,
    beginAnswering,
    submitAnswer,
    continueAfterCompact,
    retryCurrentQuestion,
    cancelAnswering,
    backToIntro,
    retentionReward,
  } = useSpeakingTrainingSession()

  const progress =
    plan && item
      ? { current: questionIndex + 1, total: plan.questionCount, topicNl: plan.topicTitleNl }
      : undefined

  const isLastQuestion = !!(plan && questionIndex + 1 >= plan.questionCount)

  return (
    <div className="px-4 py-6 pb-28 space-y-5 max-w-lg mx-auto w-full min-h-[70vh]">
      <div className="flex items-center gap-2 -mt-1">
        <Link
          href="/app/exam-prep/speaking"
          className="inline-flex items-center gap-1 text-body-sm font-medium text-primary-600 hover:underline min-h-touch py-1"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden />
          Spreken — examen
        </Link>
      </div>

      <header className="space-y-1">
        <h1 className="text-title font-bold text-ink-primary tracking-tight">Speaking — training</h1>
        <p className="text-body-sm text-ink-secondary leading-snug">
          {phase === 'intro'
            ? 'Kies een thema en doorloop een korte sessie met meerdere vragen. Aan het eind zie je een samenvatting en je spreekvertrouwen.'
            : plan
              ? `Focus: ${plan.topicTitleNl}. Je krijgt korte feedback per vraag; de volledige analyse staat in de sessiesamenvatting.`
              : 'Examencoach-modus: rubricscores, correcties en modelantwoord — nu als sessie.'}
        </p>
      </header>

      {phase === 'intro' ? <SpeakingSessionIntroCard onPickGroup={startSession} /> : null}

      {phase === 'prompt' && item ? (
        <>
          <SpeakingPromptCard item={item} progress={progress} />
          <div className="flex flex-col gap-2">
            <Button type="button" className="w-full min-h-touch text-body font-semibold" onClick={beginAnswering}>
              Start met antwoord
            </Button>
            <Button type="button" variant="secondary" className="w-full min-h-touch" onClick={backToIntro}>
              Ander thema kiezen
            </Button>
          </div>
        </>
      ) : null}

      {phase === 'input' && item ? (
        <>
          <SpeakingPromptCard item={item} progress={progress} />
          <SpeakingInputPanel
            sessionKey={sessionKey}
            onSubmit={submitAnswer}
            error={submitError}
            onDismissError={() => setSubmitError(null)}
          />
          <Button type="button" variant="secondary" className="w-full min-h-touch" onClick={cancelAnswering}>
            Terug naar vraag
          </Button>
        </>
      ) : null}

      {phase === 'question_compact' && lastBundle ? (
        <SpeakingCompactFeedbackCard
          bundle={lastBundle}
          isLastInSession={isLastQuestion}
          onContinue={continueAfterCompact}
          onRetry={retryCurrentQuestion}
        />
      ) : null}

      {phase === 'session_summary' && sessionSummary ? (
        <SpeakingSessionSummaryScreen
          summary={sessionSummary}
          onNewSession={backToIntro}
          retentionReward={retentionReward}
        />
      ) : null}
    </div>
  )
}
