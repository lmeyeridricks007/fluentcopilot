'use client'

import { useEffect, useLayoutEffect, useRef, useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardDescription, CardTitle } from '@/components/ui/Card'
import { WritingPromptCard } from '@/features/exam-prep/writing/WritingPromptCard'
import { WritingSimulationInputPanel } from '@/features/exam-prep/writing/WritingSimulationInputPanel'
import { WritingSimulationReportScreen } from '@/features/exam-prep/writing/WritingSimulationReportScreen'
import { useWritingSimulationSession } from '@/features/exam-prep/writing/useWritingSimulationSession'
import { loadPracticeExamWritingPlan } from '@/lib/exam-prep/practice-exams/practiceExamSessionLoader'
import { getPracticeExamSet } from '@/lib/exam-prep/practice-exams/practiceExamRegistry'
import {
  appendPracticeExamAttempt,
  attemptsForPracticeExamSet,
} from '@/lib/exam-prep/practice-exams/practiceExamAttemptService'
import {
  compareToPreviousAttempt,
  practiceExamReportHeadline,
  type PracticeExamReportHeadline,
} from '@/lib/exam-prep/practice-exams/practiceExamResultAggregator'
import type { PracticeExamCompareDelta } from '@/lib/exam-prep/practice-exams/types'
import { PRACTICE_EXAM_CONTENT_VERSION } from '@/lib/exam-prep/practice-exams/types'
import { PracticeExamReportFooter } from '@/features/exam-prep/practice-exams/PracticeExamReportFooter'
import { recordExamReadinessAggregate } from '@/lib/exam-readiness/examReadinessRecorder'
import { categoryAveragesToScores } from '@/lib/missions/examPrepMissionHelpers'
import type { ExamPrepRetentionSummary } from '@/lib/exam-rewards/types'
import { getRetentionUserId, recordExamPrepActivityComplete } from '@/lib/retention/retentionService'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { formatCountdownMmSs, urgencyToneClass } from '@/lib/exam-session/examTimerService'

type CompareSnap = {
  delta: PracticeExamCompareDelta
  deltaPoints: number | null
  previousPercent: number | null
  attemptNumber: number
  headline: PracticeExamReportHeadline
  bestPercent: number | null
}

export function WritingPracticeExamScreen({ setId }: { setId: string }) {
  const setDef = getPracticeExamSet(setId)
  const valid = setDef?.module === 'writing'
  const startedRef = useRef(false)
  const recordedSessionId = useRef<string | null>(null)
  const reportUiRef = useRef<CompareSnap | null>(null)
  const [retentionReward, setRetentionReward] = useState<ExamPrepRetentionSummary | null>(null)
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
    examDraftRef,
    sessionEndedByGlobalTimer,
    startWithPlan,
    handleSubmitTask,
    retryWithSamePlan,
    initialWritingAutosaveChecked,
    writingResumeOffer,
    applyWritingSimulationResume,
    discardWritingSimulationResume,
    writingInputSeedDraft,
    writingInputSeedSessionKey,
  } = useWritingSimulationSession({ practiceExamSetId: valid ? setId : null })

  const practiceExamStartedTrackedRef = useRef(false)

  const trackPracticeExamStarted = useCallback(
    (taskCount: number) => {
      if (practiceExamStartedTrackedRef.current) return
      practiceExamStartedTrackedRef.current = true
      track(ANALYTICS_EVENTS.practice_exam_started, {
        exam_type: 'writing',
        set_id: setId,
        task_count: taskCount,
        content_version: PRACTICE_EXAM_CONTENT_VERSION,
      })
    },
    [setId]
  )

  useEffect(() => {
    if (!valid || startedRef.current) return
    if (!initialWritingAutosaveChecked) return
    if (writingResumeOffer) return
    startedRef.current = true
    const p = loadPracticeExamWritingPlan(setId)
    startWithPlan(p)
  }, [valid, setId, startWithPlan, initialWritingAutosaveChecked, writingResumeOffer])

  useEffect(() => {
    if (!valid || phase !== 'task' || !plan) return
    trackPracticeExamStarted(plan.taskCount)
  }, [valid, phase, plan, trackPracticeExamStarted])

  useLayoutEffect(() => {
    if (phase !== 'report' || !sessionReport || !valid || !setDef) return
    if (recordedSessionId.current === sessionReport.plan.sessionId) return
    recordedSessionId.current = sessionReport.plan.sessionId

    const prior = attemptsForPracticeExamSet(setId)
    const avg = sessionReport.averageNormalizedPercent
    const ratio = sessionReport.passesCount / Math.max(1, sessionReport.plan.taskCount)
    const attemptNumber = prior.length + 1
    const cmp = compareToPreviousAttempt(prior, avg)
    const startedAt = sessionReport.bundles[0]?.attempt.startedAt ?? new Date().toISOString()
    const bestSoFar =
      prior.length > 0 ? Math.max(...prior.map((a) => a.averagePercent), avg) : avg

    const headline = practiceExamReportHeadline({
      setTitleNl: setDef.titleNl,
      averagePercent: avg,
      passedRatio: ratio,
      taskCount: sessionReport.plan.taskCount,
      attemptNumber,
    })

    reportUiRef.current = {
      ...cmp,
      attemptNumber,
      headline,
      bestPercent: bestSoFar,
    }

    appendPracticeExamAttempt({
      setId,
      module: 'writing',
      contentVersion: PRACTICE_EXAM_CONTENT_VERSION,
      sessionId: sessionReport.plan.sessionId,
      startedAt,
      completedAt: new Date().toISOString(),
      averagePercent: avg,
      passedRatio: ratio,
      taskCount: sessionReport.plan.taskCount,
      meta: { weakestCategoryKey: sessionReport.weakestCategoryKey },
    })

    recordExamReadinessAggregate({
      module: 'writing',
      mode: 'simulation',
      normalizedPercent: avg,
      pass: sessionReport.passesCount >= Math.ceil(sessionReport.plan.taskCount * 0.55),
      weakRubricKeys: [sessionReport.weakestCategoryKey].filter(Boolean),
      facets: [`practice-exam:${setId}`],
    })

    const userId = getRetentionUserId()
    const meta = recordExamPrepActivityComplete({
      userId,
      kind: 'practice_exam',
      module: 'writing',
      setId,
      averagePercent: avg,
      passedRatio: ratio,
      taskCount: sessionReport.plan.taskCount,
      attemptNumber,
      compareDelta: cmp.delta,
      deltaPoints: cmp.deltaPoints,
      readinessState: headline.readinessState,
      categoryScores: categoryAveragesToScores(sessionReport.categoryAverages),
    })
    setRetentionReward(meta.examPrep ?? null)

    track(ANALYTICS_EVENTS.practice_exam_completed, {
      exam_type: 'writing',
      set_id: setId,
      attempt_number: attemptNumber,
      average_percent: avg,
      passed_ratio: ratio,
      score_band: sessionReport.simulationReadiness.readinessSignal.band,
      readiness_outcome: sessionReport.simulationReadiness.outcomeKey,
    })
    track(ANALYTICS_EVENTS.practice_exam_compare_viewed, {
      exam_type: 'writing',
      set_id: setId,
      compare_delta: cmp.delta,
    })
    track(ANALYTICS_EVENTS.practice_exam_result_viewed, {
      exam_type: 'writing',
      set_id: setId,
      average_percent: sessionReport.averageNormalizedPercent,
    })
  }, [phase, sessionReport, valid, setDef, setId])

  /** Hoisted above the early return so hook order stays consistent across renders. */
  const urgencyClass = useMemo(() => {
    if (globalRemainingSec == null || !plan) return 'text-ink-primary'
    return urgencyToneClass(globalRemainingSec, plan.totalDurationSec)
  }, [globalRemainingSec, plan])

  if (!valid || !setDef) {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto">
        <p className="text-body-sm text-ink-secondary">Deze oefenexamen-set bestaat niet.</p>
        <Link href="/app/exam-prep/writing/practice-exams" className="text-primary-600 mt-2 inline-block">
          Terug
        </Link>
      </div>
    )
  }

  const progress =
    plan && currentPlanTask
      ? {
          current: currentPlanTask.progressCurrent,
          total: currentPlanTask.progressTotal,
          partLabelNl: currentPlanTask.partLabelNl,
        }
      : undefined

  const snap = reportUiRef.current

  return (
    <div className="max-w-lg mx-auto w-full min-h-[70vh]">
      {phase === 'task' && plan && globalRemainingSec != null ? (
        <div
          className="sticky top-0 z-20 border-b border-slate-200/90 bg-white/95 backdrop-blur-sm px-4 py-3 shadow-sm"
          role="timer"
          aria-live="polite"
        >
          <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
            <div className="min-w-0">
              <p className="text-caption font-semibold uppercase tracking-wide text-slate-600">Examentijd</p>
              <p className={`text-title font-bold tabular-nums leading-none mt-0.5 ${urgencyClass}`}>
                {formatCountdownMmSs(globalRemainingSec)}
              </p>
            </div>
            <p className="text-caption text-ink-secondary text-right leading-snug">
              Oefenexamen · {plan.taskCount} delen
            </p>
          </div>
        </div>
      ) : null}

      <div className="px-4 py-6 pb-28 space-y-5">
      <div className="flex items-center gap-2 -mt-1">
        <Link
          href="/app/exam-prep/writing/practice-exams"
          className="inline-flex items-center gap-1 text-body-sm font-medium text-primary-600 hover:underline min-h-touch py-1"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden />
          Oefenexamens — schrijven
        </Link>
      </div>

      <header className="space-y-1">
        <h1 className="text-title font-bold text-ink-primary tracking-tight">{setDef.titleNl}</h1>
        <p className="text-body-sm text-ink-secondary leading-snug">{setDef.subtitleNl}</p>
      </header>

      {!plan && initialWritingAutosaveChecked && writingResumeOffer ? (
        <Card variant="outlined" padding="md" className="border-primary-200 bg-primary-50/40">
          <CardTitle className="text-body font-semibold text-ink-primary">Doorgaan waar u was</CardTitle>
          <CardDescription className="mt-2 text-body-sm text-ink-secondary leading-relaxed">
            Er is opgeslagen voortgang voor dit oefenexamen (deel {writingResumeOffer.taskIndex + 1} van{' '}
            {writingResumeOffer.plan.taskCount}).
          </CardDescription>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              className="w-full min-h-touch text-body font-semibold"
              onClick={() => {
                startedRef.current = true
                applyWritingSimulationResume()
              }}
            >
              Hervatten
            </Button>
            <Button type="button" variant="secondary" className="w-full min-h-touch" onClick={discardWritingSimulationResume}>
              Verwijderen en opnieuw beginnen
            </Button>
          </div>
        </Card>
      ) : null}

      {phase === 'task' && item && plan && currentPlanTask ? (
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

      {phase === 'report' && sessionReport && snap ? (
        <div className="space-y-5">
          <WritingSimulationReportScreen
            summary={sessionReport}
            practiceExamMode
            onRetrySimulation={() => {}}
            onBackToIntro={() => {}}
            retentionReward={retentionReward}
            sessionEndedByGlobalTimer={sessionEndedByGlobalTimer}
          />
          <PracticeExamReportFooter
            module="writing"
            setId={setId}
            setTitleNl={setDef.titleNl}
            headline={snap.headline}
            compareDelta={snap.delta}
            compareDeltaPoints={snap.deltaPoints}
            previousPercent={snap.previousPercent}
            bestPercent={snap.bestPercent}
            attemptNumber={snap.attemptNumber}
            nextActions={sessionReport.nextBestActions}
            onRetakeSameSet={() => {
              reportUiRef.current = null
              recordedSessionId.current = null
              setRetentionReward(null)
              retryWithSamePlan()
            }}
          />
        </div>
      ) : null}
      </div>
    </div>
  )
}
