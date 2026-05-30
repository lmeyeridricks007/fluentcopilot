'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  buildSpeakingSimulationSessionPlan,
  type SpeakingSimulationSessionPlan,
} from '@/lib/exam-prep/speaking/speakingSimulationSessionBuilder'
import { afterQuestionStored } from '@/lib/exam-prep/speaking/speakingSimulationController'
import { evaluateSpeakingSimulationSubmission } from '@/lib/exam-prep/speaking/speakingSimulationEvaluationService'
import { buildSpeakingSimulationSummaryUi, type SpeakingSimulationSummaryUi } from '@/lib/exam-prep/speaking/speakingSimulationResultAggregator'
import type { SpeakingTrainingItem } from '@/lib/schemas/exam/speakingTrainingItem.schema'
import type { SpeakingInputMode, SpeakingSimulationPhase, SpeakingSimulationQuestionBundle } from '@/lib/exam-prep/speaking/types'
import {
  track,
  ANALYTICS_EVENTS,
  trackExamPrepUnitStarted,
  trackExamPrepUnitCompleted,
  trackLearningUnitAbandoned,
  trackLearningStepStarted,
  trackLearningStepCompleted,
  trackLearningStepAbandoned,
  trackLearningScoreProgress,
} from '@/lib/analytics'
import { applyExamLearningLoopClient } from '@/lib/exam-learning-loop/examMistakeExtractor'
import { categoryAveragesToScores } from '@/lib/missions/examPrepMissionHelpers'
import type { ExamPrepRetentionSummary } from '@/lib/exam-rewards/types'
import { getRetentionUserId, recordExamPrepActivityComplete } from '@/lib/retention/retentionService'
import type { SessionOutcome } from '@/lib/practice-feedback/types'
import { recordAbilityScenarioSignal } from '@/lib/mastery/recordAbilitySignals'
import { remainingSecondsFromDeadline } from '@/lib/exam-session/examTimerService'
import {
  flushSpeakingSimulationFromQuestionIndex,
  type SpeakingExamDraftSnapshot,
} from '@/lib/exam-prep/speaking/speakingSimulationFlush'
import { refreshProgressAfterDomainWrite } from '@/lib/persistence'
import { PRACTICE_EXAM_CONTENT_VERSION } from '@/lib/exam-prep/practice-exams/types'
import {
  AUTOSAVE_INTERVAL_SESSION_MS,
  removeAutosaveDraft,
  speakingSimulationDraftKey,
  writeAutosaveDraft,
  type SpeakingSimulationAutosaveBodyV1,
} from '@/lib/autosave'

const SCENARIO_ID = 'exam_speaking_simulation'

const emptySpeakingDraft = (): SpeakingExamDraftSnapshot => ({
  text: '',
  inputMode: 'type',
})

function sessionOutcomeFromSimulation(summary: SpeakingSimulationSummaryUi): SessionOutcome {
  const n = summary.plan.questionCount
  if (summary.passesCount >= Math.ceil(n * 0.66)) return 'success'
  if (summary.averageNormalizedPercent >= 48) return 'partial'
  return 'needs_practice'
}

export type UseSpeakingSimulationSessionOptions = {
  practiceExamSetId?: string | null
}

export function useSpeakingSimulationSession(options: UseSpeakingSimulationSessionOptions = {}) {
  const practiceExamSetId = options.practiceExamSetId ?? null
  const speakingAutosaveKey = useMemo(
    () => speakingSimulationDraftKey(practiceExamSetId ?? 'free'),
    [practiceExamSetId]
  )
  const speakingAutosaveEntityId = practiceExamSetId ?? 'speaking-simulation-free'

  const [retentionReward, setRetentionReward] = useState<ExamPrepRetentionSummary | null>(null)
  const [phase, setPhase] = useState<SpeakingSimulationPhase>('intro')
  const [plan, setPlan] = useState<ReturnType<typeof buildSpeakingSimulationSessionPlan> | null>(null)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [questionStartedAt, setQuestionStartedAt] = useState<string | null>(null)
  const [completedBundles, setCompletedBundles] = useState<SpeakingSimulationQuestionBundle[]>([])
  const [sessionReport, setSessionReport] = useState<SpeakingSimulationSummaryUi | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitBusy, setSubmitBusy] = useState(false)
  const [answerDeadlineMs, setAnswerDeadlineMs] = useState(0)
  const [globalRemainingSec, setGlobalRemainingSec] = useState<number | null>(null)
  const [sessionEndedBySessionTimer, setSessionEndedBySessionTimer] = useState(false)

  const activeQuestionKeyRef = useRef<string | null>(null)
  const reportIntegrationRef = useRef(false)
  const completedBundlesRef = useRef<SpeakingSimulationQuestionBundle[]>([])
  const unitStartedAtMsRef = useRef<number | null>(null)
  const unitCompletedRef = useRef(false)
  const planRef = useRef(plan)
  const phaseRef = useRef(phase)
  const questionIndexRef = useRef(questionIndex)
  const questionStartedAtRef = useRef<string | null>(null)
  const sessionDeadlineMsRef = useRef<number | null>(null)
  const sessionTimerFiredRef = useRef(false)
  const flushSpeakingInProgressRef = useRef(false)
  const speakingExamDraftRef = useRef<SpeakingExamDraftSnapshot>(emptySpeakingDraft())
  const submitBusyRef = useRef(false)

  const item: SpeakingTrainingItem | null = plan?.questions[questionIndex] ?? null

  useEffect(() => {
    completedBundlesRef.current = completedBundles
  }, [completedBundles])

  useEffect(() => {
    planRef.current = plan
    phaseRef.current = phase
    questionIndexRef.current = questionIndex
    questionStartedAtRef.current = questionStartedAt
  }, [plan, phase, questionIndex, questionStartedAt])
  useEffect(() => {
    submitBusyRef.current = submitBusy
  }, [submitBusy])

  const emitSpeakingAbandon = useCallback(
    (abandonReason: 'navigation_unmount' | 'user_exit') => {
      if (unitCompletedRef.current) return
      const pl = planRef.current
      const startMs = unitStartedAtMsRef.current
      if (!pl || startMs == null) return
      const ph = phaseRef.current
      if (ph === 'report') return
      if (ph !== 'question') return
      const qi = questionIndexRef.current
      const q = pl.questions[qi]
      if (!q) return
      const qStartIso = questionStartedAtRef.current
      const stepDur =
        qStartIso && Number.isFinite(Date.parse(qStartIso)) ? Date.now() - Date.parse(qStartIso) : undefined
      trackLearningStepAbandoned({
        unit_kind: 'speaking_simulation',
        unit_id: pl.sessionId,
        module: 'speaking',
        surface: 'exam_prep_simulation',
        exam_mode: 'simulation',
        step_key: q.id,
        step_index: qi + 1,
        step_total: pl.questionCount,
        question_type: q.subtype,
        duration_ms: stepDur,
        abandon_reason: abandonReason,
      })
      trackLearningUnitAbandoned({
        unit_kind: 'speaking_simulation',
        unit_id: pl.sessionId,
        module: 'speaking',
        surface: 'exam_prep_simulation',
        exam_mode: 'simulation',
        duration_ms: Date.now() - startMs,
        step_index: qi + 1,
        step_total: pl.questionCount,
        progress_ratio: pl.questionCount > 0 ? qi / pl.questionCount : 0,
        exit_phase: ph,
        abandon_reason: abandonReason,
      })
    },
    []
  )

  useEffect(() => {
    return () => {
      emitSpeakingAbandon('navigation_unmount')
    }
  }, [emitSpeakingAbandon])

  const completeSpeakingSimulation = useCallback(
    (nextBundles: SpeakingSimulationQuestionBundle[], endedBySessionTimer: boolean) => {
      const pl = planRef.current
      if (!pl) return
      const uid = getRetentionUserId()
      removeAutosaveDraft(uid, speakingAutosaveKey, 'simulation', speakingAutosaveEntityId, 'complete')
      sessionDeadlineMsRef.current = null
      sessionTimerFiredRef.current = true
      completedBundlesRef.current = nextBundles
      setCompletedBundles(nextBundles)
      const summary = buildSpeakingSimulationSummaryUi({ plan: pl, bundles: nextBundles })
      setSessionReport(summary)
      setSessionEndedBySessionTimer(endedBySessionTimer)
      setPhase('report')
      unitCompletedRef.current = true
      const unitStart = unitStartedAtMsRef.current
      track(ANALYTICS_EVENTS.speaking_exam_simulation_completed, {
        session_id: pl.sessionId,
        question_count: pl.questionCount,
        average_normalized_percent: summary.averageNormalizedPercent,
        passes_count: summary.passesCount,
        timed_out_count: summary.timedOutCount,
        voice_answer_count: nextBundles.filter((b) => b.inputMode === 'voice').length,
        typed_answer_count: nextBundles.filter((b) => b.inputMode === 'type').length,
        readiness_outcome: summary.simulationReadiness.outcomeKey,
        score_band: summary.simulationReadiness.readinessSignal.band,
        exam_mode: 'simulation',
        session_timer_expired: endedBySessionTimer,
      })
      trackExamPrepUnitCompleted({
        unit_kind: 'speaking_simulation',
        unit_id: pl.sessionId,
        module: 'speaking',
        surface: 'exam_prep_simulation',
        exam_mode: 'simulation',
        duration_ms: unitStart != null ? Date.now() - unitStart : undefined,
        step_total: pl.questionCount,
        step_completed_count: pl.questionCount,
        score_summary: summary.averageNormalizedPercent,
        outcome: summary.simulationReadiness.outcomeKey,
        extra: {
          voice_answer_count: nextBundles.filter((b) => b.inputMode === 'voice').length,
          typed_answer_count: nextBundles.filter((b) => b.inputMode === 'type').length,
          timed_out_count: summary.timedOutCount,
        },
      })
      const passSession = summary.passesCount >= Math.ceil(pl.questionCount * 0.66)
      trackLearningScoreProgress({
        module: 'speaking',
        metric_key: 'speaking_simulation_avg_normalized',
        value: summary.averageNormalizedPercent,
        unit_id: pl.sessionId,
        exam_mode: 'simulation',
        pass: passSession,
      })
    },
    [speakingAutosaveEntityId, speakingAutosaveKey]
  )

  const runSpeakingSessionFlush = useCallback(() => {
    if (sessionTimerFiredRef.current || flushSpeakingInProgressRef.current || submitBusyRef.current) return
    const pl = planRef.current
    if (!pl || phaseRef.current !== 'question') return
    flushSpeakingInProgressRef.current = true
    const qi = questionIndexRef.current
    const startIso = questionStartedAtRef.current ?? new Date().toISOString()
    const submittedAt = new Date().toISOString()
    const prior = completedBundlesRef.current
    const flushBundles = flushSpeakingSimulationFromQuestionIndex({
      plan: pl,
      fromQuestionIndex: qi,
      draft: { ...speakingExamDraftRef.current },
      questionStartedAtIso: startIso,
      submittedAtIso: submittedAt,
    })
    const merged = [...prior, ...flushBundles]
    flushBundles.forEach((b, i) => {
      const idx = prior.length + i + 1
      applyExamLearningLoopClient({ kind: 'speaking_simulation', bundle: b })
      track(ANALYTICS_EVENTS.speaking_exam_scored, {
        question_id: b.item.id,
        question_subtype: b.item.subtype,
        question_index: idx,
        question_total: pl.questionCount,
        normalized_percent: b.engine.normalizedPercent,
        pass: b.engine.pass,
        exam_mode: 'simulation',
        timed_out: true,
        session_timer: true,
      })
    })
    completeSpeakingSimulation(merged, true)
    flushSpeakingInProgressRef.current = false
  }, [completeSpeakingSimulation])

  useEffect(() => {
    if (phase !== 'question' || !plan) {
      setGlobalRemainingSec(null)
      return
    }
    const tick = () => {
      const d = sessionDeadlineMsRef.current
      if (d == null) return
      const r = remainingSecondsFromDeadline(d)
      setGlobalRemainingSec(r)
      if (r <= 0 && !sessionTimerFiredRef.current && phaseRef.current === 'question') {
        runSpeakingSessionFlush()
      }
    }
    tick()
    const id = window.setInterval(tick, 400)
    return () => window.clearInterval(id)
  }, [phase, plan?.sessionId, runSpeakingSessionFlush])

  useLayoutEffect(() => {
    if (phase !== 'question' || !item || !plan) return
    const key = `${plan.sessionId}-${questionIndex}-${item.id}`
    if (activeQuestionKeyRef.current === key) return
    activeQuestionKeyRef.current = key
    const started = new Date().toISOString()
    setQuestionStartedAt(started)
    const sessEnd = sessionDeadlineMsRef.current
    if (sessEnd != null) setAnswerDeadlineMs(sessEnd)
    track(ANALYTICS_EVENTS.speaking_exam_simulation_question_started, {
      session_id: plan.sessionId,
      question_id: item.id,
      question_subtype: item.subtype,
      question_index: questionIndex + 1,
      question_total: plan.questionCount,
      difficulty_band: item.difficultyBand,
      exam_mode: 'simulation',
    })
    trackLearningStepStarted({
      unit_kind: 'speaking_simulation',
      unit_id: plan.sessionId,
      module: 'speaking',
      surface: 'exam_prep_simulation',
      exam_mode: 'simulation',
      step_key: item.id,
      step_index: questionIndex + 1,
      step_total: plan.questionCount,
      question_type: item.subtype,
      difficulty_band: item.difficultyBand,
    })
  }, [phase, item, plan, questionIndex])

  useEffect(() => {
    if (phase !== 'question') return
    const tick = () => {
      const uid = getRetentionUserId()
      if (!uid) return
      const pl = planRef.current
      if (!pl || phaseRef.current !== 'question') return
      const body: SpeakingSimulationAutosaveBodyV1 = {
        v: 1,
        scope: practiceExamSetId ? { practiceExamSetId } : 'free',
        practiceContentVersion: practiceExamSetId ? PRACTICE_EXAM_CONTENT_VERSION : undefined,
        plan: pl,
        questionIndex: questionIndexRef.current,
        completedBundles: completedBundlesRef.current,
        currentDraft: { ...speakingExamDraftRef.current },
        sessionDeadlineMs: sessionDeadlineMsRef.current,
        questionStartedAtIso: questionStartedAtRef.current,
      }
      writeAutosaveDraft(uid, speakingAutosaveKey, 'simulation', speakingAutosaveEntityId, body, { save_mode: 'interval' })
    }
    const id = window.setInterval(tick, AUTOSAVE_INTERVAL_SESSION_MS)
    tick()
    return () => window.clearInterval(id)
  }, [phase, speakingAutosaveEntityId, speakingAutosaveKey, practiceExamSetId])

  useEffect(() => {
    const flush = () => {
      if (document.visibilityState !== 'hidden') return
      if (phaseRef.current !== 'question') return
      const pl = planRef.current
      if (!pl) return
      const uid = getRetentionUserId()
      if (!uid) return
      const body: SpeakingSimulationAutosaveBodyV1 = {
        v: 1,
        scope: practiceExamSetId ? { practiceExamSetId } : 'free',
        practiceContentVersion: practiceExamSetId ? PRACTICE_EXAM_CONTENT_VERSION : undefined,
        plan: pl,
        questionIndex: questionIndexRef.current,
        completedBundles: completedBundlesRef.current,
        currentDraft: { ...speakingExamDraftRef.current },
        sessionDeadlineMs: sessionDeadlineMsRef.current,
        questionStartedAtIso: questionStartedAtRef.current,
      }
      writeAutosaveDraft(uid, speakingAutosaveKey, 'simulation', speakingAutosaveEntityId, body, { save_mode: 'flush' })
    }
    document.addEventListener('visibilitychange', flush)
    return () => document.removeEventListener('visibilitychange', flush)
  }, [speakingAutosaveEntityId, speakingAutosaveKey, practiceExamSetId])

  const startWithPlan = useCallback((p: SpeakingSimulationSessionPlan) => {
    removeAutosaveDraft(getRetentionUserId(), speakingAutosaveKey, 'simulation', speakingAutosaveEntityId, 'restart')
    setPlan(p)
    setQuestionIndex(0)
    setQuestionStartedAt(null)
    setCompletedBundles([])
    setSessionReport(null)
    setSubmitError(null)
    setSubmitBusy(false)
    setAnswerDeadlineMs(0)
    sessionDeadlineMsRef.current = Date.now() + p.totalDurationSec * 1000
    sessionTimerFiredRef.current = false
    flushSpeakingInProgressRef.current = false
    speakingExamDraftRef.current = emptySpeakingDraft()
    activeQuestionKeyRef.current = null
    reportIntegrationRef.current = false
    completedBundlesRef.current = []
    unitStartedAtMsRef.current = Date.now()
    unitCompletedRef.current = false
    setPhase('question')
    track(ANALYTICS_EVENTS.speaking_exam_simulation_started, {
      session_id: p.sessionId,
      question_count: p.questionCount,
      exercise_refs: p.exerciseRefs,
      exam_mode: 'simulation',
    })
    trackExamPrepUnitStarted({
      unit_kind: 'speaking_simulation',
      unit_id: p.sessionId,
      module: 'speaking',
      surface: 'exam_prep_simulation',
      exam_mode: 'simulation',
      step_total: p.questionCount,
    })
  }, [speakingAutosaveEntityId, speakingAutosaveKey])

  const startSimulation = useCallback(() => {
    startWithPlan(buildSpeakingSimulationSessionPlan(Date.now()))
  }, [startWithPlan])

  const handleSubmitAnswer = useCallback(
    (input: { text: string; inputMode: SpeakingInputMode; transcriptConfidence?: number; timedOut: boolean }) => {
      if (!item || !plan || !questionStartedAt || submitBusy) return
      if (sessionTimerFiredRef.current) return
      const t = input.text.trim()
      if (!input.timedOut && !t) {
        setSubmitError('Spreek of typ eerst een antwoord, of wacht tot de tijd om is.')
        return
      }
      setSubmitError(null)
      setSubmitBusy(true)
      const submittedAt = new Date().toISOString()
      if (input.timedOut) {
        track(ANALYTICS_EVENTS.speaking_exam_simulation_question_timed_out, {
          session_id: plan.sessionId,
          question_id: item.id,
          question_index: questionIndex + 1,
          question_total: plan.questionCount,
          had_text: t.length > 0,
          input_mode: input.inputMode,
          exam_mode: 'simulation',
        })
      }

      let bundle: SpeakingSimulationQuestionBundle
      try {
        bundle = evaluateSpeakingSimulationSubmission({
          item,
          responseText: t,
          inputMode: input.inputMode,
          transcriptConfidence: input.transcriptConfidence,
          startedAtIso: questionStartedAt,
          submittedAtIso: submittedAt,
          timedOut: input.timedOut,
        })
      } catch {
        setSubmitError('Kon je antwoord niet verwerken. Probeer opnieuw.')
        setSubmitBusy(false)
        return
      }

      track(ANALYTICS_EVENTS.speaking_exam_scored, {
        question_id: item.id,
        question_subtype: item.subtype,
        question_index: questionIndex + 1,
        question_total: plan.questionCount,
        normalized_percent: bundle.engine.normalizedPercent,
        pass: bundle.engine.pass,
        readiness_label: bundle.engine.readinessLabel,
        weak_tags: bundle.engine.weakTags,
        rubric_total: bundle.engine.totalScore,
        rubric_max: bundle.engine.maxScore,
        scenario_group: item.scenarioGroupId,
        difficulty_band: item.difficultyBand,
        exam_mode: 'simulation',
        timed_out: input.timedOut,
      })

      track(ANALYTICS_EVENTS.speaking_exam_simulation_question_completed, {
        session_id: plan.sessionId,
        question_id: item.id,
        question_subtype: item.subtype,
        question_index: questionIndex + 1,
        question_total: plan.questionCount,
        input_mode: input.inputMode,
        timed_out: input.timedOut,
        word_count: t.split(/\s+/).filter(Boolean).length,
        normalized_percent: bundle.engine.normalizedPercent,
        pass: bundle.engine.pass,
        exam_mode: 'simulation',
      })

      const qStartMs = Date.parse(questionStartedAt)
      const stepDurationMs = Number.isFinite(qStartMs) ? Date.parse(submittedAt) - qStartMs : undefined
      trackLearningStepCompleted({
        unit_kind: 'speaking_simulation',
        unit_id: plan.sessionId,
        module: 'speaking',
        surface: 'exam_prep_simulation',
        exam_mode: 'simulation',
        step_key: item.id,
        step_index: questionIndex + 1,
        step_total: plan.questionCount,
        duration_ms: stepDurationMs,
        score: bundle.engine.normalizedPercent,
        correct: bundle.engine.pass,
        input_modality: input.inputMode === 'voice' ? 'voice' : 'type',
        timed_out: input.timedOut,
      })

      applyExamLearningLoopClient({ kind: 'speaking_simulation', bundle })

      const nextBundles = [...completedBundlesRef.current, bundle]
      completedBundlesRef.current = nextBundles
      setCompletedBundles(nextBundles)
      refreshProgressAfterDomainWrite(getRetentionUserId())

      const advance = afterQuestionStored(questionIndex, plan.questionCount)
      if (advance === 'session_report') {
        completeSpeakingSimulation(nextBundles, false)
      } else {
        setQuestionIndex((i) => i + 1)
      }
      setSubmitBusy(false)
    },
    [item, plan, questionIndex, questionStartedAt, submitBusy, completeSpeakingSimulation]
  )

  useEffect(() => {
    if (phase !== 'report' || !sessionReport || reportIntegrationRef.current) return
    reportIntegrationRef.current = true
    track(ANALYTICS_EVENTS.speaking_exam_simulation_result_viewed, {
      session_id: sessionReport.plan.sessionId,
      question_count: sessionReport.plan.questionCount,
      average_normalized_percent: sessionReport.averageNormalizedPercent,
      timed_out_count: sessionReport.timedOutCount,
      readiness_outcome: sessionReport.simulationReadiness.outcomeKey,
      score_band: sessionReport.simulationReadiness.readinessSignal.band,
      exam_mode: 'simulation',
    })
    const userId = getRetentionUserId()
    const outcome = sessionOutcomeFromSimulation(sessionReport)
    const meta = recordExamPrepActivityComplete({
      userId,
      kind: 'speaking_simulation_session',
      scenarioId: SCENARIO_ID,
      outcome,
      averageNormalizedPercent: sessionReport.averageNormalizedPercent,
      categoryScores: categoryAveragesToScores(sessionReport.categoryAverages),
    })
    setRetentionReward(meta.examPrep ?? null)
    recordAbilityScenarioSignal({
      userId,
      scenarioId: SCENARIO_ID,
      outcome,
    })
  }, [phase, sessionReport])

  const retrySimulation = useCallback(() => {
    if (sessionReport) {
      track(ANALYTICS_EVENTS.speaking_exam_simulation_retry_clicked, {
        session_id: sessionReport.plan.sessionId,
        exam_mode: 'simulation',
      })
    }
    startSimulation()
  }, [sessionReport, startSimulation])

  const retryWithSamePlan = useCallback(() => {
    if (sessionReport) {
      track(ANALYTICS_EVENTS.speaking_exam_simulation_retry_clicked, {
        session_id: sessionReport.plan.sessionId,
        exam_mode: 'simulation',
      })
      startWithPlan({
        ...sessionReport.plan,
        sessionId:
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `sim-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      })
    }
  }, [sessionReport, startWithPlan])

  const backToIntro = useCallback(() => {
    emitSpeakingAbandon('user_exit')
    setRetentionReward(null)
    setPhase('intro')
    setPlan(null)
    setQuestionIndex(0)
    setCompletedBundles([])
    setSessionReport(null)
    setQuestionStartedAt(null)
    setSubmitError(null)
    setSubmitBusy(false)
    activeQuestionKeyRef.current = null
    reportIntegrationRef.current = false
    completedBundlesRef.current = []
    unitStartedAtMsRef.current = null
    unitCompletedRef.current = false
    sessionDeadlineMsRef.current = null
    sessionTimerFiredRef.current = false
    setGlobalRemainingSec(null)
    setSessionEndedBySessionTimer(false)
    setAnswerDeadlineMs(0)
    speakingExamDraftRef.current = emptySpeakingDraft()
  }, [emitSpeakingAbandon])

  const sessionKey = useMemo(
    () => `${plan?.sessionId ?? 'na'}-${questionIndex}-${item?.id ?? 'x'}`,
    [plan?.sessionId, questionIndex, item?.id]
  )

  return {
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
    startWithPlan,
    handleSubmitAnswer,
    retrySimulation,
    retryWithSamePlan,
    backToIntro,
    retentionReward,
  }
}
