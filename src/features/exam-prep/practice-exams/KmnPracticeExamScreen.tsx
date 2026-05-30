'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { clsx } from 'clsx'
import { Card, CardTitle } from '@/components/ui/Card'
import { bringKmnReviewItemForward } from '@/lib/exam-prep/kmn/kmnFlashcardService'
import { getKmnQuizQuestionById } from '@/lib/exam-prep/kmn/kmnContentBuilder'
import { buildKmnDuoPracticeExamQuestions, DUO_KNM_DURATION_SEC } from '@/lib/exam-prep/kmn/kmnExamPlanBuilder'
import { evaluateKmnQuizAnswer, shuffleQuizOptions } from '@/lib/exam-prep/kmn/kmnQuizService'
import { recordKmnQuizResult } from '@/lib/exam-prep/kmn/kmnProgressService'
import type { KmnQuizQuestion, KmnTopicId } from '@/lib/exam-prep/kmn/types'
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
import { KmnQuizQuestionMedia } from '@/features/exam-prep/kmn/KmnQuizQuestionMedia'
import { PracticeExamReportFooter } from '@/features/exam-prep/practice-exams/PracticeExamReportFooter'
import { recordExamReadinessAggregate } from '@/lib/exam-readiness/examReadinessRecorder'
import type { ExamPrepRetentionSummary } from '@/lib/exam-rewards/types'
import { getRetentionUserId, recordExamPrepActivityComplete } from '@/lib/retention/retentionService'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { remainingSecondsFromDeadline } from '@/lib/exam-session/examTimerService'
import { formatCountdownMmSs, urgencyToneClass } from '@/lib/exam/examTimer'
import { scoreKmnMcqExam } from '@/lib/exam/examScoring'
import { localReviewPersistence } from '@/lib/review-engine/reviewPersistence'
import { recordMistakeEvent } from '@/lib/mistakes/mistakeTagger'
import { applyExamLearningLoopClient } from '@/lib/exam-learning-loop/examMistakeExtractor'

export function KmnPracticeExamScreen({ setId }: { setId: string }) {
  const setDef = getPracticeExamSet(setId)
  const valid = setDef?.module === 'kmn'
  const seed = useMemo(() => Date.now(), [])
  const sessionIdRef = useRef(
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `kmn-pe-${Date.now()}`
  )
  const recordedRef = useRef(false)
  const startedAtRef = useRef<string | null>(null)
  const sessionDeadlineMsRef = useRef<number | null>(null)
  const kmnTimerFiredRef = useRef(false)
  const phaseRef = useRef<'q' | 'report'>('q')
  const [globalRemainingSec, setGlobalRemainingSec] = useState<number | null>(null)
  const [sessionEndedByTimer, setSessionEndedByTimer] = useState(false)

  const questions = useMemo(() => {
    if (!valid || !setDef || setDef.module !== 'kmn') return []
    if (setDef.kmnQuizQuestionIds?.length) {
      const out: KmnQuizQuestion[] = []
      for (const id of setDef.kmnQuizQuestionIds) {
        const qq = getKmnQuizQuestionById(id)
        if (qq) out.push(qq)
      }
      return out
    }
    return buildKmnDuoPracticeExamQuestions(setId)
  }, [valid, setDef, setId])

  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<'q' | 'report'>('q')
  const [correctCount, setCorrectCount] = useState(0)
  const [retentionReward, setRetentionReward] = useState<ExamPrepRetentionSummary | null>(null)

  const q = questions[index]
  const shuffledOpts = useMemo(() => (q ? shuffleQuizOptions(q, seed + index * 7) : []), [q, seed, index])

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    if (questions.length === 0) return
    sessionDeadlineMsRef.current = Date.now() + DUO_KNM_DURATION_SEC * 1000
    kmnTimerFiredRef.current = false
    setSessionEndedByTimer(false)
  }, [questions.length, setId])

  useEffect(() => {
    if (questions.length === 0 || phase === 'report') {
      setGlobalRemainingSec(null)
      return
    }
    const tick = () => {
      const d = sessionDeadlineMsRef.current
      if (d == null) return
      const r = remainingSecondsFromDeadline(d)
      setGlobalRemainingSec(r)
      if (r <= 0 && !kmnTimerFiredRef.current && phaseRef.current !== 'report') {
        kmnTimerFiredRef.current = true
        setSessionEndedByTimer(true)
        setPhase('report')
      }
    }
    tick()
    const id = window.setInterval(tick, 400)
    return () => window.clearInterval(id)
  }, [questions.length, phase, setId])

  useEffect(() => {
    if (questions.length && !startedAtRef.current) {
      startedAtRef.current = new Date().toISOString()
      track(ANALYTICS_EVENTS.practice_exam_started, {
        exam_type: 'kmn',
        set_id: setId,
        task_count: questions.length,
        content_version: PRACTICE_EXAM_CONTENT_VERSION,
      })
    }
  }, [questions.length, setId])

  const submit = useCallback(
    async (optionId: string) => {
      if (!q || phase !== 'q') return
      const { correct } = evaluateKmnQuizAnswer(q, optionId)
      if (correct) setCorrectCount((c) => c + 1)

      recordKmnQuizResult(q.topicId as KmnTopicId, correct)
      track(ANALYTICS_EVENTS.kmn_quiz_answered, {
        kmn_topic: q.topicId,
        question_id: q.id,
        correct,
        level: q.level,
        practice_exam_set_id: setId,
      })

      if (!correct) {
        applyExamLearningLoopClient({
          kind: 'kmn',
          topicId: q.topicId as KmnTopicId,
          surface: 'quiz',
          conceptOrStepId: q.id,
          correct: false,
          attemptId: `kmn-pe-${setId}-${q.id}-${Date.now()}`,
        })
        if (q.linkedReviewItemId) {
          await bringKmnReviewItemForward(getRetentionUserId(), localReviewPersistence, q.linkedReviewItemId)
        }
        await recordMistakeEvent(localReviewPersistence, {
          userId: getRetentionUserId(),
          lessonId: `kmn-${q.topicId}`,
          stepId: `quiz-${q.id}`,
          itemId: q.id,
          userAnswer: optionId,
          correctAnswer: q.correctOptionId,
          severity: 2,
          errorTypeOverride: 'grammar',
          classify: {
            contextTags: ['kmn', 'practice-exam', setId, q.topicId],
            userAnswer: optionId,
            correctAnswer: q.correctOptionId,
          },
        })
      }

      if (index + 1 >= questions.length) {
        setPhase('report')
      } else {
        setIndex((i) => i + 1)
      }
    },
    [q, phase, setId, index, questions.length]
  )

  useLayoutEffect(() => {
    if (phase !== 'report' || !valid || !setDef || questions.length === 0 || recordedRef.current) return
    recordedRef.current = true

    const prior = attemptsForPracticeExamSet(setId)
    const avg = Math.round((correctCount / Math.max(1, questions.length)) * 100)
    const ratio = correctCount / Math.max(1, questions.length)
    const attemptNumber = prior.length + 1
    const cmp = compareToPreviousAttempt(prior, avg)
    const startedAt = startedAtRef.current ?? new Date().toISOString()

    appendPracticeExamAttempt({
      setId,
      module: 'kmn',
      contentVersion: PRACTICE_EXAM_CONTENT_VERSION,
      sessionId: sessionIdRef.current,
      startedAt,
      completedAt: new Date().toISOString(),
      averagePercent: avg,
      passedRatio: ratio,
      taskCount: questions.length,
      meta: { correctCount },
    })

    recordExamReadinessAggregate({
      module: 'kmn',
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
      taskCount: questions.length,
      attemptNumber,
    })
    const userId = getRetentionUserId()
    const meta = recordExamPrepActivityComplete({
      userId,
      kind: 'practice_exam',
      module: 'kmn',
      setId,
      averagePercent: avg,
      passedRatio: ratio,
      taskCount: questions.length,
      attemptNumber,
      compareDelta: cmp.delta,
      deltaPoints: cmp.deltaPoints,
      readinessState: headline.readinessState,
    })
    setRetentionReward(meta.examPrep ?? null)

    track(ANALYTICS_EVENTS.practice_exam_completed, {
      exam_type: 'kmn',
      set_id: setId,
      attempt_number: attemptNumber,
      average_percent: avg,
      passed_ratio: ratio,
    })
    track(ANALYTICS_EVENTS.practice_exam_compare_viewed, {
      exam_type: 'kmn',
      set_id: setId,
      compare_delta: cmp.delta,
    })
    track(ANALYTICS_EVENTS.practice_exam_result_viewed, {
      exam_type: 'kmn',
      set_id: setId,
      average_percent: avg,
    })
  }, [phase, valid, setDef, questions.length, correctCount, setId])

  const restart = useCallback(() => {
    sessionIdRef.current =
      typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `kmn-pe-${Date.now()}`
    recordedRef.current = false
    setRetentionReward(null)
    startedAtRef.current = new Date().toISOString()
    sessionDeadlineMsRef.current = Date.now() + DUO_KNM_DURATION_SEC * 1000
    kmnTimerFiredRef.current = false
    setSessionEndedByTimer(false)
    setIndex(0)
    setPhase('q')
    setCorrectCount(0)
    track(ANALYTICS_EVENTS.practice_exam_retake_started, { exam_type: 'kmn', set_id: setId })
    track(ANALYTICS_EVENTS.practice_exam_started, {
      exam_type: 'kmn',
      set_id: setId,
      task_count: questions.length,
      content_version: PRACTICE_EXAM_CONTENT_VERSION,
    })
  }, [questions.length, setId])

  if (!valid || !setDef || setDef.module !== 'kmn') {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto">
        <p className="text-body-sm text-ink-secondary">Deze oefenexamen-set bestaat niet.</p>
        <Link href="/app/exam-prep/kmn/practice-exams" className="text-primary-600 mt-2 inline-block">
          Terug
        </Link>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto">
        <p className="text-body-sm text-ink-secondary">Geen vragen geladen voor deze set.</p>
        <Link href="/app/exam-prep/kmn/practice-exams">Terug</Link>
      </div>
    )
  }

  const attempts = attemptsForPracticeExamSet(setId)
  const avg = Math.round((correctCount / Math.max(1, questions.length)) * 100)
  const ratio = correctCount / Math.max(1, questions.length)
  const cmp =
    phase === 'report'
      ? compareToPreviousAttempt(
          attempts.filter((a) => a.sessionId !== sessionIdRef.current),
          avg
        )
      : null
  const attemptNumber = attempts.length > 0 ? attempts.length : 1
  const headline =
    phase === 'report'
      ? practiceExamReportHeadline({
          setTitleNl: setDef.titleNl,
          averagePercent: avg,
          passedRatio: ratio,
          taskCount: questions.length,
          attemptNumber,
        })
      : null
  const bestPercent =
    attempts.length > 0 ? Math.max(...attempts.map((a) => a.averagePercent)) : avg

  const kmnPass = scoreKmnMcqExam(correctCount, questions.length)
  const urgencyClass =
    globalRemainingSec != null
      ? urgencyToneClass(globalRemainingSec, DUO_KNM_DURATION_SEC)
      : 'text-ink-primary'

  return (
    <div className="max-w-lg mx-auto w-full min-h-[70vh]">
      {phase === 'q' && globalRemainingSec != null ? (
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
              {questions.length} vragen · één klok
            </p>
          </div>
        </div>
      ) : null}

      <div className="px-4 py-6 pb-28 space-y-5">
      <div className="flex items-center gap-2 -mt-1">
        <Link
          href="/app/exam-prep/kmn/practice-exams"
          className="inline-flex items-center gap-1 text-body-sm font-medium text-primary-600 hover:underline min-h-touch py-1"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden />
          Oefenexamens — KNM
        </Link>
      </div>

      <header className="space-y-1">
        <h1 className="text-title font-bold text-ink-primary tracking-tight">{setDef.titleNl}</h1>
        <p className="text-body-sm text-ink-secondary leading-snug">{setDef.subtitleNl}</p>
      </header>

      {phase === 'q' && q ? (
        <Card variant="outlined" padding="md" className="border-slate-200 space-y-4">
          <p className="text-caption text-ink-tertiary">
            Vraag {index + 1} van {questions.length}
          </p>
          <KmnQuizQuestionMedia question={q} />
          <CardTitle className="text-body font-semibold text-ink-primary leading-snug">{q.promptNl}</CardTitle>
          <ul className="mt-4 space-y-2 list-none p-0 m-0">
            {shuffledOpts.map((opt) => (
              <li key={opt.id}>
                <button
                  type="button"
                  onClick={() => void submit(opt.id)}
                  className={clsx(
                    'w-full text-left rounded-xl border border-slate-200 px-4 py-3 text-body-sm text-ink-primary',
                    'min-h-touch hover:bg-slate-50 active:bg-slate-100 transition-colors'
                  )}
                >
                  {opt.labelNl}
                </button>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {phase === 'report' && headline && cmp ? (
        <div className="space-y-4">
          <ExamPrepRewardBanner reward={retentionReward} />
          {sessionEndedByTimer ? (
            <Card variant="outlined" padding="md" className="border-amber-300/80 bg-amber-50/50">
              <p className="text-body-sm font-semibold text-amber-950">De examentijd is afgelopen</p>
              <p className="mt-1 text-body-sm text-amber-900/90 leading-relaxed">
                Het resultaat hieronder is gebaseerd op de vragen die u heeft beantwoord.
              </p>
            </Card>
          ) : null}
          <Card variant="outlined" padding="md" className="border-violet-200 bg-violet-50/50">
            <CardTitle className="text-body font-bold text-ink-primary">Oefenexamen afgerond</CardTitle>
            <p className="mt-2 text-body-sm text-ink-secondary">
              {correctCount} van {questions.length} goed · score {avg}% · typische grens ca. {kmnPass.passThreshold} goed
            </p>
            <p className="mt-2 text-body-sm text-ink-secondary">{kmnPass.passLikelihoodLabelNl}</p>
          </Card>
          <PracticeExamReportFooter
            module="kmn"
            setId={setId}
            setTitleNl={setDef.titleNl}
            headline={headline}
            compareDelta={cmp.delta}
            compareDeltaPoints={cmp.deltaPoints}
            previousPercent={cmp.previousPercent}
            bestPercent={bestPercent}
            attemptNumber={attemptNumber}
            nextActions={[]}
            onRetakeSameSet={restart}
          />
        </div>
      ) : null}
      </div>
    </div>
  )
}
