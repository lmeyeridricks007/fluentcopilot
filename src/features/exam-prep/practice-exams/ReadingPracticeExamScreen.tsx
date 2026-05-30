'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardDescription, CardTitle } from '@/components/ui/Card'
import { ReadingTextCard } from '@/features/exam-prep/reading/ReadingTextCard'
import { ReadingQuestionCard } from '@/features/exam-prep/reading/ReadingQuestionCard'
import { ReadingResultCard } from '@/features/exam-prep/reading/ReadingResultCard'
import { useReadingTrainingSession } from '@/features/exam-prep/reading/useReadingTrainingSession'
import { loadPracticeExamReadingPlan } from '@/lib/exam-prep/practice-exams/practiceExamSessionLoader'
import { getPracticeExamSet } from '@/lib/exam-prep/practice-exams/practiceExamRegistry'
import {
  appendPracticeExamAttempt,
  attemptsForPracticeExamSet,
} from '@/lib/exam-prep/practice-exams/practiceExamAttemptService'
import {
  compareToPreviousAttempt,
  practiceExamReportHeadline,
} from '@/lib/exam-prep/practice-exams/practiceExamResultAggregator'
import { PRACTICE_EXAM_CONTENT_VERSION } from '@/lib/exam-prep/practice-exams/types'
import { ExamPrepRewardBanner } from '@/features/exam-prep/components/ExamPrepRewardBanner'
import { PracticeExamReportFooter } from '@/features/exam-prep/practice-exams/PracticeExamReportFooter'
import { recordExamReadinessAggregate } from '@/lib/exam-readiness/examReadinessRecorder'
import type { ExamPrepRetentionSummary } from '@/lib/exam-rewards/types'
import { getRetentionUserId, recordExamPrepActivityComplete } from '@/lib/retention/retentionService'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { DUO_READING_DURATION_SEC } from '@/lib/exam/duoExamStructure'
import { formatCountdownMmSs, urgencyToneClass } from '@/lib/exam/examTimer'
import { scoreReadingMcqExam } from '@/lib/exam/examScoring'
import {
  canResumeReadingPracticeExam,
  parseReadingPracticeExamAutosave,
  readAutosaveBody,
  readingPracticeExamDraftKey,
  type ReadingPracticeExamAutosaveBodyV1,
} from '@/lib/autosave'

export function ReadingPracticeExamScreen({ setId }: { setId: string }) {
  const setDef = getPracticeExamSet(setId)
  const valid = setDef?.module === 'reading'
  const startedRef = useRef(false)
  const recordedSessionId = useRef<string | null>(null)
  const [retentionReward, setRetentionReward] = useState<ExamPrepRetentionSummary | null>(null)
  const [readingResumeSnap, setReadingResumeSnap] = useState<ReadingPracticeExamAutosaveBodyV1 | null>(null)
  const [readingAutosaveReady, setReadingAutosaveReady] = useState(false)
  const practiceExamStartedTrackedRef = useRef(false)

  const {
    phase,
    plan,
    item,
    taskIndex,
    answerUnlocked,
    duoSelectedOptionId,
    evalResult,
    correctCount,
    sessionStartedAtIso,
    sessionKey,
    startWithFixedPlan,
    hydrateReadingPracticeExamSnapshot,
    discardReadingPracticeExamDraft,
    unlockAnswers,
    submitAnswer,
    selectDuoReadingOption,
    confirmDuoReadingAnswer,
    goToPreviousDuoReadingTask,
    goNext,
    globalRemainingSec,
    sessionEndedByTimer,
  } = useReadingTrainingSession()

  useLayoutEffect(() => {
    if (!valid) {
      setReadingAutosaveReady(true)
      return
    }
    const uid = getRetentionUserId()
    const raw = readAutosaveBody(uid, readingPracticeExamDraftKey(setId))
    const snap = parseReadingPracticeExamAutosave(raw)
    const pl = loadPracticeExamReadingPlan(setId)
    const ids = pl.tasks.map((t) => t.id)
    if (snap && canResumeReadingPracticeExam(snap, setId, ids)) {
      setReadingResumeSnap(snap)
    } else {
      setReadingResumeSnap(null)
    }
    setReadingAutosaveReady(true)
  }, [valid, setId])

  const trackPracticeExamStarted = useCallback(
    (taskCount: number) => {
      if (practiceExamStartedTrackedRef.current) return
      practiceExamStartedTrackedRef.current = true
      track(ANALYTICS_EVENTS.practice_exam_started, {
        exam_type: 'reading',
        set_id: setId,
        task_count: taskCount,
        content_version: PRACTICE_EXAM_CONTENT_VERSION,
      })
    },
    [setId]
  )

  useEffect(() => {
    if (!valid || startedRef.current) return
    if (!readingAutosaveReady) return
    if (readingResumeSnap) return
    startedRef.current = true
    const pl = loadPracticeExamReadingPlan(setId)
    startWithFixedPlan(pl, { practiceExamSetId: setId })
  }, [valid, setId, startWithFixedPlan, readingAutosaveReady, readingResumeSnap])

  useEffect(() => {
    if (!valid || phase !== 'task' || !plan) return
    trackPracticeExamStarted(plan.taskCount)
  }, [valid, phase, plan, trackPracticeExamStarted])

  const progress = plan && item ? { current: taskIndex + 1, total: plan.taskCount } : undefined

  useLayoutEffect(() => {
    if (phase !== 'session_complete' || !plan || !valid || !setDef) return
    if (recordedSessionId.current === plan.sessionId) return
    recordedSessionId.current = plan.sessionId

    const prior = attemptsForPracticeExamSet(setId)
    const avg = Math.round((correctCount / Math.max(1, plan.taskCount)) * 100)
    const ratio = correctCount / Math.max(1, plan.taskCount)
    const attemptNumber = prior.length + 1
    const cmp = compareToPreviousAttempt(prior, avg)
    const startedAt = sessionStartedAtIso ?? new Date().toISOString()

    appendPracticeExamAttempt({
      setId,
      module: 'reading',
      contentVersion: PRACTICE_EXAM_CONTENT_VERSION,
      sessionId: plan.sessionId,
      startedAt,
      completedAt: new Date().toISOString(),
      averagePercent: avg,
      passedRatio: ratio,
      taskCount: plan.taskCount,
      meta: { correctCount },
    })

    recordExamReadinessAggregate({
      module: 'reading',
      mode: 'training',
      normalizedPercent: avg,
      pass: ratio >= 0.55,
      weakRubricKeys: [],
      facets: [`practice-exam:${setId}`],
    })

    const headline = practiceExamReportHeadline({
      setTitleNl: setDef.titleNl,
      averagePercent: avg,
      passedRatio: ratio,
      taskCount: plan.taskCount,
      attemptNumber,
    })
    const userId = getRetentionUserId()
    const meta = recordExamPrepActivityComplete({
      userId,
      kind: 'practice_exam',
      module: 'reading',
      setId,
      averagePercent: avg,
      passedRatio: ratio,
      taskCount: plan.taskCount,
      attemptNumber,
      compareDelta: cmp.delta,
      deltaPoints: cmp.deltaPoints,
      readinessState: headline.readinessState,
    })
    setRetentionReward(meta.examPrep ?? null)

    track(ANALYTICS_EVENTS.practice_exam_completed, {
      exam_type: 'reading',
      set_id: setId,
      attempt_number: attemptNumber,
      average_percent: avg,
      passed_ratio: ratio,
    })
    track(ANALYTICS_EVENTS.practice_exam_compare_viewed, {
      exam_type: 'reading',
      set_id: setId,
      compare_delta: cmp.delta,
    })
    track(ANALYTICS_EVENTS.practice_exam_result_viewed, {
      exam_type: 'reading',
      set_id: setId,
      average_percent: avg,
    })
  }, [phase, plan, valid, setDef, setId, correctCount, sessionStartedAtIso])

  if (!valid || !setDef) {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto">
        <p className="text-body-sm text-ink-secondary">Deze oefenexamen-set bestaat niet.</p>
        <Link href="/app/exam-prep/reading/practice-exams" className="text-primary-600 mt-2 inline-block">
          Terug
        </Link>
      </div>
    )
  }

  const attempts = attemptsForPracticeExamSet(setId)
  const showReport = phase === 'session_complete' && plan
  const avg =
    plan && phase === 'session_complete'
      ? Math.round((correctCount / Math.max(1, plan.taskCount)) * 100)
      : 0
  const ratio = plan && phase === 'session_complete' ? correctCount / Math.max(1, plan.taskCount) : 0
  const cmp =
    plan && phase === 'session_complete'
      ? compareToPreviousAttempt(
          attempts.filter((a) => a.sessionId !== plan.sessionId),
          avg
        )
      : null
  const attemptNumber = attempts.length > 0 ? attempts.length : 1
  const headline =
    plan && phase === 'session_complete'
      ? practiceExamReportHeadline({
          setTitleNl: setDef.titleNl,
          averagePercent: avg,
          passedRatio: ratio,
          taskCount: plan.taskCount,
          attemptNumber,
        })
      : null
  const bestPercent =
    attempts.length > 0 ? Math.max(...attempts.map((a) => a.averagePercent)) : avg

  const readPass = plan ? scoreReadingMcqExam(correctCount) : null
  const urgencyClass =
    globalRemainingSec != null
      ? urgencyToneClass(globalRemainingSec, DUO_READING_DURATION_SEC)
      : 'text-ink-primary'

  return (
    <div className="max-w-lg mx-auto w-full min-h-[70vh]">
      {phase === 'task' && globalRemainingSec != null ? (
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
            <p className="text-caption text-ink-secondary text-right max-w-[11rem] leading-snug">
              Vraag {taskIndex + 1} / {plan?.taskCount ?? '—'} · één klok
            </p>
          </div>
        </div>
      ) : null}

      <div className="px-4 py-6 pb-28 space-y-5">
      <div className="flex items-center gap-2 -mt-1">
        <Link
          href="/app/exam-prep/reading/practice-exams"
          className="inline-flex items-center gap-1 text-body-sm font-medium text-primary-600 hover:underline min-h-touch py-1"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden />
          Oefenexamens — lezen
        </Link>
      </div>

      <header className="space-y-1">
        <h1 className="text-title font-bold text-ink-primary tracking-tight">{setDef.titleNl}</h1>
        <p className="text-body-sm text-ink-secondary leading-snug">{setDef.subtitleNl}</p>
      </header>

      {!plan && readingAutosaveReady && readingResumeSnap ? (
        <Card variant="outlined" padding="md" className="border-primary-200 bg-primary-50/40">
          <CardTitle className="text-body font-semibold text-ink-primary">Doorgaan waar u was</CardTitle>
          <CardDescription className="mt-2 text-body-sm text-ink-secondary leading-relaxed">
            Opgeslagen voortgang voor dit lees-oefenexamen: vraag {readingResumeSnap.taskIndex + 1} van{' '}
            {readingResumeSnap.taskIds.length}.
          </CardDescription>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              className="w-full min-h-touch text-body font-semibold"
              onClick={() => {
                if (!readingResumeSnap) return
                startedRef.current = true
                const pl = loadPracticeExamReadingPlan(setId)
                hydrateReadingPracticeExamSnapshot(readingResumeSnap, pl)
                setReadingResumeSnap(null)
                trackPracticeExamStarted(pl.taskCount)
              }}
            >
              Hervatten
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full min-h-touch"
              onClick={() => {
                discardReadingPracticeExamDraft(setId)
                setReadingResumeSnap(null)
              }}
            >
              Verwijderen en opnieuw beginnen
            </Button>
          </div>
        </Card>
      ) : null}

      {phase === 'task' && item && plan ? (
        <div key={sessionKey} className="space-y-4">
          <ReadingTextCard item={item} progress={progress} />
          {!answerUnlocked && plan.flowMode !== 'duo_practice_exam' ? (
            <div className="space-y-3">
              <p className="text-body-sm text-ink-secondary leading-relaxed">
                Neem de tijd om de tekst te lezen. Daarna opent u de vraag.
              </p>
              <Button type="button" className="w-full min-h-touch" onClick={unlockAnswers}>
                Ik ben klaar om te antwoorden
              </Button>
            </div>
          ) : null}
          {answerUnlocked || plan.flowMode === 'duo_practice_exam' ? (
            <div className="space-y-3">
              <ReadingQuestionCard
                item={item}
                disabled={false}
                onSelect={
                  plan.flowMode === 'duo_practice_exam' ? selectDuoReadingOption : submitAnswer
                }
                {...(plan.flowMode === 'duo_practice_exam'
                  ? { selectedOptionId: duoSelectedOptionId }
                  : {})}
              />
              {plan.flowMode === 'duo_practice_exam' ? (
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-h-touch"
                    disabled={taskIndex <= 0}
                    onClick={goToPreviousDuoReadingTask}
                  >
                    Vorige
                  </Button>
                  <Button
                    type="button"
                    className="min-h-touch"
                    disabled={!duoSelectedOptionId}
                    onClick={confirmDuoReadingAnswer}
                  >
                    Volgende
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {phase === 'result' && evalResult && item && plan ? (
        <>
          <ReadingTextCard item={item} progress={progress} />
          <ReadingResultCard
            result={evalResult}
            onNext={goNext}
            isLastTask={taskIndex + 1 >= plan.taskCount}
          />
        </>
      ) : null}

      {showReport && plan && headline && cmp ? (
        <div className="space-y-4">
          <ExamPrepRewardBanner reward={retentionReward} />
          {sessionEndedByTimer ? (
            <Card variant="outlined" padding="md" className="border-amber-300/80 bg-amber-50/50">
              <p className="text-body-sm font-semibold text-amber-950">De examentijd is afgelopen</p>
              <p className="mt-1 text-body-sm text-amber-900/90 leading-relaxed">
                Het resultaat is gebaseerd op de vragen die u heeft beantwoord.
              </p>
            </Card>
          ) : null}
          <Card variant="outlined" padding="md" className="border-violet-200 bg-violet-50/50">
            <CardTitle className="text-body font-bold text-ink-primary">Oefenexamen afgerond</CardTitle>
            <p className="mt-2 text-body-sm text-ink-secondary">
              {correctCount} van {plan.taskCount} goed · gemiddeld {avg}%
              {readPass ? ` · typische grens ca. ${readPass.passThreshold} goed` : null}
            </p>
            {readPass ? <p className="mt-2 text-body-sm text-ink-secondary">{readPass.passLikelihoodLabelNl}</p> : null}
          </Card>
          <PracticeExamReportFooter
            module="reading"
            setId={setId}
            setTitleNl={setDef.titleNl}
            headline={headline}
            compareDelta={cmp.delta}
            compareDeltaPoints={cmp.deltaPoints}
            previousPercent={cmp.previousPercent}
            bestPercent={bestPercent}
            attemptNumber={attemptNumber}
            nextActions={[]}
            onRetakeSameSet={() => {
              recordedSessionId.current = null
              setRetentionReward(null)
              const pl = loadPracticeExamReadingPlan(setId)
              startWithFixedPlan(pl)
              track(ANALYTICS_EVENTS.practice_exam_retake_started, {
                exam_type: 'reading',
                set_id: setId,
              })
            }}
          />
        </div>
      ) : null}
      </div>
    </div>
  )
}
