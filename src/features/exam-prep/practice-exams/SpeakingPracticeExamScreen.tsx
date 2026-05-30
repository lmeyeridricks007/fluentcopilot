'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { SpeakingPromptCard } from '@/features/exam-prep/speaking/SpeakingPromptCard'
import { SpeakingSimulationInputPanel } from '@/features/exam-prep/speaking/SpeakingSimulationInputPanel'
import { SpeakingSimulationReportScreen } from '@/features/exam-prep/speaking/SpeakingSimulationReportScreen'
import { useSpeakingSimulationSession } from '@/features/exam-prep/speaking/useSpeakingSimulationSession'
import { sectionTitleNl } from '@/lib/exam-prep/speaking/speakingExam2025PlanBuilder'
import { loadPracticeExamSpeakingPlan } from '@/lib/exam-prep/practice-exams/practiceExamSessionLoader'
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
import type { ExamPrepRetentionSummary } from '@/lib/exam-rewards/types'
import { recordExamReadinessAggregate } from '@/lib/exam-readiness/examReadinessRecorder'
import { categoryAveragesToScores } from '@/lib/missions/examPrepMissionHelpers'
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

export function SpeakingPracticeExamScreen({ setId }: { setId: string }) {
  const setDef = getPracticeExamSet(setId)
  const valid = setDef?.module === 'speaking'
  const startedRef = useRef(false)
  const recordedSessionId = useRef<string | null>(null)
  const reportUiRef = useRef<CompareSnap | null>(null)
  const [retentionReward, setRetentionReward] = useState<ExamPrepRetentionSummary | null>(null)

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
    startWithPlan,
    handleSubmitAnswer,
    retryWithSamePlan,
  } = useSpeakingSimulationSession({ practiceExamSetId: valid ? setId : null })

  useEffect(() => {
    if (!valid || startedRef.current) return
    startedRef.current = true
    const p = loadPracticeExamSpeakingPlan(setId)
    startWithPlan(p)
    track(ANALYTICS_EVENTS.practice_exam_started, {
      exam_type: 'speaking',
      set_id: setId,
      task_count: p.questionCount,
      content_version: PRACTICE_EXAM_CONTENT_VERSION,
    })
  }, [valid, setId, startWithPlan])

  useLayoutEffect(() => {
    if (phase !== 'report' || !sessionReport || !valid || !setDef) return
    if (recordedSessionId.current === sessionReport.plan.sessionId) return
    recordedSessionId.current = sessionReport.plan.sessionId

    const prior = attemptsForPracticeExamSet(setId)
    const avg = sessionReport.averageNormalizedPercent
    const ratio = sessionReport.passesCount / Math.max(1, sessionReport.plan.questionCount)
    const attemptNumber = prior.length + 1
    const cmp = compareToPreviousAttempt(prior, avg)
    const startedAt = sessionReport.bundles[0]?.attempt.startedAt ?? new Date().toISOString()
    const bestSoFar =
      prior.length > 0 ? Math.max(...prior.map((a) => a.averagePercent), avg) : avg

    const headline = practiceExamReportHeadline({
      setTitleNl: setDef.titleNl,
      averagePercent: avg,
      passedRatio: ratio,
      taskCount: sessionReport.plan.questionCount,
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
      module: 'speaking',
      contentVersion: PRACTICE_EXAM_CONTENT_VERSION,
      sessionId: sessionReport.plan.sessionId,
      startedAt,
      completedAt: new Date().toISOString(),
      averagePercent: avg,
      passedRatio: ratio,
      taskCount: sessionReport.plan.questionCount,
      meta: {
        timedOutCount: sessionReport.timedOutCount,
        weakestCategoryKey: sessionReport.weakestCategoryKey,
      },
    })

    recordExamReadinessAggregate({
      module: 'speaking',
      mode: 'simulation',
      normalizedPercent: avg,
      pass: sessionReport.passesCount >= Math.ceil(sessionReport.plan.questionCount * 0.55),
      weakRubricKeys: [sessionReport.weakestCategoryKey].filter(Boolean),
      facets: [`practice-exam:${setId}`],
    })

    const userId = getRetentionUserId()
    const meta = recordExamPrepActivityComplete({
      userId,
      kind: 'practice_exam',
      module: 'speaking',
      setId,
      averagePercent: avg,
      passedRatio: ratio,
      taskCount: sessionReport.plan.questionCount,
      attemptNumber,
      compareDelta: cmp.delta,
      deltaPoints: cmp.deltaPoints,
      readinessState: headline.readinessState,
      categoryScores: categoryAveragesToScores(sessionReport.categoryAverages),
    })
    setRetentionReward(meta.examPrep ?? null)

    track(ANALYTICS_EVENTS.practice_exam_completed, {
      exam_type: 'speaking',
      set_id: setId,
      attempt_number: attemptNumber,
      average_percent: avg,
      passed_ratio: ratio,
      score_band: sessionReport.simulationReadiness.readinessSignal.band,
      readiness_outcome: sessionReport.simulationReadiness.outcomeKey,
    })
    track(ANALYTICS_EVENTS.practice_exam_compare_viewed, {
      exam_type: 'speaking',
      set_id: setId,
      compare_delta: cmp.delta,
    })
    track(ANALYTICS_EVENTS.practice_exam_result_viewed, {
      exam_type: 'speaking',
      set_id: setId,
      average_percent: sessionReport.averageNormalizedPercent,
    })
  }, [phase, sessionReport, valid, setDef, setId])

  if (!valid || !setDef) {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto">
        <p className="text-body-sm text-ink-secondary">Deze oefenexamen-set bestaat niet.</p>
        <Link href="/app/exam-prep/speaking/practice-exams" className="text-primary-600 mt-2 inline-block">
          Terug
        </Link>
      </div>
    )
  }

  const progress =
    plan && item
      ? { current: questionIndex + 1, total: plan.questionCount, topicNl: plan.titleNl }
      : undefined

  const snap = reportUiRef.current

  const sessionTotalSec = plan ? plan.totalDurationSec : 0
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
              Vraag {questionIndex + 1} / {plan.questionCount} · één klok voor het hele examen
            </p>
          </div>
        </div>
      ) : null}

      <div className="px-4 py-6 pb-28 space-y-5">
      <div className="flex items-center gap-2 -mt-1">
        <Link
          href="/app/exam-prep/speaking/practice-exams"
          className="inline-flex items-center gap-1 text-body-sm font-medium text-primary-600 hover:underline min-h-touch py-1"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden />
          Oefenexamens — spreken
        </Link>
      </div>

      <header className="space-y-1">
        <h1 className="text-title font-bold text-ink-primary tracking-tight">{setDef.titleNl}</h1>
        <p className="text-body-sm text-ink-secondary leading-snug">{setDef.subtitleNl}</p>
      </header>

      {phase === 'question' && item && plan ? (
        <>
          <SpeakingPromptCard
            item={item}
            progress={progress}
            variant="simulation"
            examSectionTitleNl={
              plan.speaking2025Sections[questionIndex]
                ? sectionTitleNl(plan.speaking2025Sections[questionIndex]!)
                : null
            }
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

      {phase === 'report' && sessionReport && snap ? (
        <div className="space-y-5">
          <SpeakingSimulationReportScreen
            summary={sessionReport}
            practiceExamMode
            onRetrySimulation={() => {}}
            onBackToIntro={() => {}}
            retentionReward={retentionReward}
            sessionEndedBySessionTimer={sessionEndedBySessionTimer}
          />
          <PracticeExamReportFooter
            module="speaking"
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
