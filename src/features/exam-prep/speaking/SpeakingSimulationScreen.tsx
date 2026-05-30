'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardDescription, CardTitle } from '@/components/ui/Card'
import { SpeakingPromptCard } from '@/features/exam-prep/speaking/SpeakingPromptCard'
import { SpeakingSimulationInputPanel } from '@/features/exam-prep/speaking/SpeakingSimulationInputPanel'
import { SpeakingSimulationReportScreen } from '@/features/exam-prep/speaking/SpeakingSimulationReportScreen'
import { useSpeakingSimulationSession } from '@/features/exam-prep/speaking/useSpeakingSimulationSession'
import { SPEAKING_SIMULATION_QUESTION_COUNT } from '@/lib/exam-prep/speaking/speakingSimulationSessionBuilder'
import { sectionTitleNl } from '@/lib/exam-prep/speaking/speakingExam2025PlanBuilder'
import { formatCountdownMmSs, urgencyToneClass } from '@/lib/exam-session/examTimerService'

export function SpeakingSimulationScreen() {
  const {
    phase,
    plan,
    item,
    questionIndex,
    sessionReport,
    submitError,
    setSubmitError,
    submitBusy,
    sessionKey,
    answerDeadlineMs,
    globalRemainingSec,
    sessionEndedBySessionTimer,
    speakingExamDraftRef,
    startSimulation,
    handleSubmitAnswer,
    retrySimulation,
    backToIntro,
    retentionReward,
  } = useSpeakingSimulationSession()

  const progress =
    plan && item
      ? { current: questionIndex + 1, total: plan.questionCount, topicNl: plan.titleNl }
      : undefined

  const sessionTotalSec = plan != null ? plan.totalDurationSec : 35 * 60
  const sessionTotalMin = Math.max(1, Math.round(sessionTotalSec / 60))
  const urgencyClass =
    globalRemainingSec != null && plan
      ? urgencyToneClass(globalRemainingSec, sessionTotalSec)
      : 'text-ink-primary'

  return (
    <div className="max-w-lg mx-auto w-full min-h-[70vh]">
      {phase === 'question' && plan && globalRemainingSec != null ? (
        <div
          className="sticky top-0 z-20 border-b border-slate-200/90 bg-white/95 backdrop-blur-sm px-4 py-3 shadow-sm"
          role="timer"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
            <div className="min-w-0">
              <p className="text-caption font-semibold uppercase tracking-wide text-slate-600">Examentijd</p>
              <p className={`text-title font-bold tabular-nums leading-none mt-0.5 ${urgencyClass}`}>
                {formatCountdownMmSs(globalRemainingSec)}
              </p>
            </div>
            <p className="text-caption text-ink-secondary text-right leading-snug max-w-[11rem]">
              {plan.questionCount} vragen · één klok voor het hele examen
            </p>
          </div>
        </div>
      ) : null}

      <div className="px-4 py-6 pb-28 space-y-5">
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
        <h1 className="text-title font-bold text-ink-primary tracking-tight">Spreken — simulatie</h1>
        <p className="text-body-sm text-ink-secondary leading-snug">
          {phase === 'intro'
            ? `Eén spreekexamen (structuur 2025): ${SPEAKING_SIMULATION_QUESTION_COUNT} vragen, ongeveer ${sessionTotalMin} minuten totaal. Geen hulp tijdens het examen.`
            : phase === 'question' && plan
              ? 'Werk verder; de resterende tijd staat bovenaan.'
              : null}
        </p>
      </header>

      {phase === 'intro' ? (
        <Card variant="outlined" padding="md" className="border-slate-300 bg-white">
          <CardTitle className="text-body font-semibold text-ink-primary">Voordat je start</CardTitle>
          <CardDescription className="mt-3 text-body-sm text-ink-secondary leading-relaxed space-y-2 block">
            <span className="block">
              <strong className="font-semibold text-ink-primary">{SPEAKING_SIMULATION_QUESTION_COUNT} vragen</strong> in drie examendelen (video/situatie,
              afbeelding, gesprek). <strong className="font-semibold text-ink-primary">Één totale examentijd</strong> voor de hele sessie.
            </span>
            <span className="block">Geen tips of correcties tussendoor. Loopt de tijd af, dan wordt automatisch ingeleverd.</span>
            <span className="block">Spreek in waar mogelijk; typen alleen als de microfoon niet werkt.</span>
          </CardDescription>
          <Button type="button" className="mt-5 w-full min-h-touch text-body font-semibold" onClick={startSimulation}>
            Start simulatie
          </Button>
        </Card>
      ) : null}

      {phase === 'question' && item && plan ? (
        <>
          <SpeakingPromptCard
            item={item}
            progress={progress}
            variant="simulation"
            examSectionTitleNl={plan.speaking2025Sections[questionIndex] ? sectionTitleNl(plan.speaking2025Sections[questionIndex]!) : null}
          />
          <SpeakingSimulationInputPanel
            sessionKey={sessionKey}
            answerDeadlineMs={answerDeadlineMs}
            timerActive={!submitBusy && answerDeadlineMs > 0}
            onSubmit={handleSubmitAnswer}
            speakingDraftRef={speakingExamDraftRef}
            error={submitError}
            onDismissError={() => setSubmitError(null)}
          />
        </>
      ) : null}

      {phase === 'report' && sessionReport ? (
        <SpeakingSimulationReportScreen
          summary={sessionReport}
          onRetrySimulation={retrySimulation}
          onBackToIntro={backToIntro}
          retentionReward={retentionReward}
          sessionEndedBySessionTimer={sessionEndedBySessionTimer}
        />
      ) : null}
      </div>
    </div>
  )
}
