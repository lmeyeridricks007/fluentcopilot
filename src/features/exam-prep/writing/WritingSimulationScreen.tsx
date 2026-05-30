'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardDescription, CardTitle } from '@/components/ui/Card'
import { WritingPromptCard } from '@/features/exam-prep/writing/WritingPromptCard'
import { WritingSimulationInputPanel } from '@/features/exam-prep/writing/WritingSimulationInputPanel'
import { WritingSimulationReportScreen } from '@/features/exam-prep/writing/WritingSimulationReportScreen'
import { useWritingSimulationSession } from '@/features/exam-prep/writing/useWritingSimulationSession'
import {
  WRITING_SIMULATION_TASK_COUNT,
  WRITING_SIMULATION_TOTAL_DURATION_SEC,
} from '@/lib/exam-prep/writing/writingSimulationSessionBuilder'
import { formatCountdownMmSs, urgencyToneClass } from '@/lib/exam-session/examTimerService'

export function WritingSimulationScreen() {
  const {
    phase,
    plan,
    currentPlanTask,
    item,
    sessionReport,
    submitError,
    setSubmitError,
    submitBusy,
    sessionKey,
    globalRemainingSec,
    sessionEndedByGlobalTimer,
    examDraftRef,
    startSimulation,
    handleSubmitTask,
    retrySimulation,
    backToIntro,
    retentionReward,
    initialWritingAutosaveChecked,
    writingResumeOffer,
    applyWritingSimulationResume,
    discardWritingSimulationResume,
    writingInputSeedDraft,
    writingInputSeedSessionKey,
  } = useWritingSimulationSession()

  const progress =
    plan && currentPlanTask
      ? {
          current: currentPlanTask.progressCurrent,
          total: currentPlanTask.progressTotal,
          partLabelNl: currentPlanTask.partLabelNl,
        }
      : undefined

  const totalMin = Math.round(WRITING_SIMULATION_TOTAL_DURATION_SEC / 60)
  const urgencyClass =
    globalRemainingSec != null && plan
      ? urgencyToneClass(globalRemainingSec, plan.totalDurationSec)
      : 'text-ink-primary'

  return (
    <div className="max-w-lg mx-auto w-full min-h-[70vh]">
      {phase === 'task' && plan && globalRemainingSec != null ? (
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
              {WRITING_SIMULATION_TASK_COUNT} delen · één klok voor het hele examen
            </p>
          </div>
        </div>
      ) : null}

      <div className="px-4 py-6 pb-28 space-y-5">
        {phase !== 'task' ? (
          <div className="flex items-center gap-2 -mt-1">
            <Link
              href="/app/exam-prep/writing"
              className="inline-flex items-center gap-1 text-body-sm font-medium text-primary-600 hover:underline min-h-touch py-1"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden />
              Schrijven — examen
            </Link>
          </div>
        ) : null}

        <header className="space-y-1">
          <h1 className="text-title font-bold text-ink-primary tracking-tight">Schrijven — simulatie</h1>
          <p className="text-body-sm text-ink-secondary leading-snug">
            {phase === 'intro'
              ? `Eén schrijfexamen onder tijdsdruk (${totalMin} minuten totaal). Geen hulp of modelantwoord tijdens het examen.`
              : phase === 'task' && plan
                ? 'Werk rustig verder. U ziet de resterende tijd bovenaan.'
                : null}
          </p>
        </header>

        {phase === 'intro' && initialWritingAutosaveChecked && writingResumeOffer ? (
          <Card variant="outlined" padding="md" className="border-primary-200 bg-primary-50/40">
            <CardTitle className="text-body font-semibold text-ink-primary">Doorgaan waar u was</CardTitle>
            <CardDescription className="mt-2 text-body-sm text-ink-secondary leading-relaxed">
              We hebben een tussentijds opgeslagen voortgang gevonden voor deze simulatie (deel {writingResumeOffer.taskIndex + 1} van{' '}
              {writingResumeOffer.plan.taskCount}). De resterende tijd wordt hervat als die nog niet verstreken is.
            </CardDescription>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button type="button" className="w-full min-h-touch text-body font-semibold" onClick={applyWritingSimulationResume}>
                Hervatten
              </Button>
              <Button type="button" variant="secondary" className="w-full min-h-touch" onClick={discardWritingSimulationResume}>
                Verwijderen en nieuw beginnen
              </Button>
            </div>
          </Card>
        ) : null}

        {phase === 'intro' && initialWritingAutosaveChecked && !writingResumeOffer ? (
          <Card variant="outlined" padding="md" className="border-slate-300 bg-white">
            <CardTitle className="text-body font-semibold text-ink-primary">Start schrijfexamen</CardTitle>
            <CardDescription className="mt-3 text-body-sm text-ink-secondary leading-relaxed">
              U krijgt <strong className="font-semibold text-ink-primary">{WRITING_SIMULATION_TASK_COUNT} opeenvolgende delen</strong>{' '}
              (zoals op het A2-examen). De totale tijd is <strong className="font-semibold text-ink-primary">{totalMin} minuten</strong>.
              Loopt de tijd af, dan worden alle openstaande antwoorden automatisch ingeleverd — ook als een deel nog leeg is. Aan het eind
              volgt één rapport.
            </CardDescription>
            <Button type="button" className="mt-5 w-full min-h-touch text-body font-semibold" onClick={startSimulation}>
              Start examen
            </Button>
          </Card>
        ) : null}

        {phase === 'task' && item && currentPlanTask && plan ? (
          <>
            <WritingPromptCard item={item} variant="simulation" progress={progress} examSimulationMinimal />
            <WritingSimulationInputPanel
              sessionKey={sessionKey}
              item={item}
              timerMode="global"
              timerActive={!submitBusy}
              onSubmit={handleSubmitTask}
              examDraftRef={examDraftRef}
              seedDraft={writingInputSeedDraft}
              seedSessionKey={writingInputSeedSessionKey}
              error={submitError}
              onDismissError={() => setSubmitError(null)}
            />
          </>
        ) : null}

        {phase === 'report' && sessionReport ? (
          <WritingSimulationReportScreen
            summary={sessionReport}
            onRetrySimulation={retrySimulation}
            onBackToIntro={backToIntro}
            retentionReward={retentionReward}
            sessionEndedByGlobalTimer={sessionEndedByGlobalTimer}
          />
        ) : null}
      </div>
    </div>
  )
}
