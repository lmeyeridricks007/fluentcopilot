'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  buildWritingSimulationSessionPlan,
  type WritingSimulationSessionPlan,
} from '@/lib/exam-prep/writing/writingSimulationSessionBuilder'
import { afterWritingTaskStored } from '@/lib/exam-prep/writing/writingSimulationController'
import { evaluateWritingSimulationSubmission } from '@/lib/exam-prep/writing/writingSimulationEvaluationService'
import {
  buildWritingSimulationSummaryUi,
  type WritingSimulationSummaryUi,
} from '@/lib/exam-prep/writing/writingSimulationResultAggregator'
import type { WritingSimulationPhase, WritingSimulationTaskBundle } from '@/lib/exam-prep/writing/types'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { applyExamLearningLoopClient } from '@/lib/exam-learning-loop/examMistakeExtractor'
import { categoryAveragesToScores } from '@/lib/missions/examPrepMissionHelpers'
import type { ExamPrepRetentionSummary } from '@/lib/exam-rewards/types'
import { getRetentionUserId, recordExamPrepActivityComplete } from '@/lib/retention/retentionService'
import type { SessionOutcome } from '@/lib/practice-feedback/types'
import { recordAbilityScenarioSignal } from '@/lib/mastery/recordAbilitySignals'
import { remainingSecondsFromDeadline } from '@/lib/exam-session/examTimerService'
import {
  flushWritingSimulationFromTaskIndex,
  type WritingExamDraftSnapshot,
} from '@/lib/exam-prep/writing/writingSimulationFlush'
import {
  trackAutosaveRestored,
  AUTOSAVE_INTERVAL_SESSION_MS,
  writingSimulationDraftKey,
  readAutosaveBody,
  removeAutosaveDraft,
  writeAutosaveDraft,
  parseWritingSimulationAutosave,
  canResumeWritingSimulation,
  type WritingSimulationAutosaveBodyV1,
} from '@/lib/autosave'
import { PRACTICE_EXAM_CONTENT_VERSION } from '@/lib/exam-prep/practice-exams/types'

const SCENARIO_ID = 'exam_writing_simulation'

function outcomeFromSummary(summary: WritingSimulationSummaryUi): SessionOutcome {
  const n = summary.plan.taskCount
  if (summary.passesCount >= Math.ceil(n * 0.66)) return 'success'
  if (summary.averageNormalizedPercent >= 48) return 'partial'
  return 'needs_practice'
}

const emptyDraft = (): WritingExamDraftSnapshot => ({
  bodyText: '',
  fieldValues: {},
  isForm: false,
})

export type UseWritingSimulationSessionOptions = {
  /** When set, draft keys and resume scope are isolated to this practice exam set. */
  practiceExamSetId?: string | null
}

export function useWritingSimulationSession(options: UseWritingSimulationSessionOptions = {}) {
  const practiceExamSetId = options.practiceExamSetId ?? null
  const autosaveKey = useMemo(
    () => writingSimulationDraftKey(practiceExamSetId ?? 'free'),
    [practiceExamSetId]
  )
  const autosaveEntityId = practiceExamSetId ?? 'writing-simulation-free'

  const [retentionReward, setRetentionReward] = useState<ExamPrepRetentionSummary | null>(null)
  const [phase, setPhase] = useState<WritingSimulationPhase>('intro')
  const [plan, setPlan] = useState<WritingSimulationSessionPlan | null>(null)
  const [taskIndex, setTaskIndex] = useState(0)
  const [taskStartedAt, setTaskStartedAt] = useState<string | null>(null)
  const [completedBundles, setCompletedBundles] = useState<WritingSimulationTaskBundle[]>([])
  const [sessionReport, setSessionReport] = useState<WritingSimulationSummaryUi | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitBusy, setSubmitBusy] = useState(false)
  const [globalRemainingSec, setGlobalRemainingSec] = useState<number | null>(null)
  const [sessionEndedByGlobalTimer, setSessionEndedByGlobalTimer] = useState(false)
  const [writingResumeOffer, setWritingResumeOffer] = useState<WritingSimulationAutosaveBodyV1 | null>(null)
  const [initialWritingAutosaveChecked, setInitialWritingAutosaveChecked] = useState(false)
  const [writingInputSeedDraft, setWritingInputSeedDraft] = useState<WritingExamDraftSnapshot | null>(null)
  const [writingInputSeedSessionKey, setWritingInputSeedSessionKey] = useState<string | null>(null)

  const activeTaskKeyRef = useRef<string | null>(null)
  const reportIntegrationRef = useRef(false)
  const bundlesRef = useRef<WritingSimulationTaskBundle[]>([])
  const globalDeadlineMsRef = useRef<number | null>(null)
  const globalTimerFiredRef = useRef(false)
  const flushInProgressRef = useRef(false)
  const submitBusyRef = useRef(false)
  const examDraftRef = useRef<WritingExamDraftSnapshot>(emptyDraft())

  const planRef = useRef(plan)
  const taskIndexRef = useRef(taskIndex)
  const taskStartedAtRef = useRef(taskStartedAt)
  const phaseRef = useRef(phase)
  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  const currentPlanTask = plan?.tasks[taskIndex] ?? null
  const item = currentPlanTask?.item ?? null

  useEffect(() => {
    bundlesRef.current = completedBundles
  }, [completedBundles])

  useEffect(() => {
    planRef.current = plan
  }, [plan])
  useEffect(() => {
    taskIndexRef.current = taskIndex
  }, [taskIndex])
  useEffect(() => {
    taskStartedAtRef.current = taskStartedAt
  }, [taskStartedAt])
  useEffect(() => {
    submitBusyRef.current = submitBusy
  }, [submitBusy])

  useLayoutEffect(() => {
    const uid = getRetentionUserId()
    const raw = readAutosaveBody(uid, autosaveKey)
    const parsed = parseWritingSimulationAutosave(raw)
    if (parsed && canResumeWritingSimulation(parsed, { practiceExamSetId })) {
      setWritingResumeOffer(parsed)
    } else {
      setWritingResumeOffer(null)
    }
    setInitialWritingAutosaveChecked(true)
  }, [autosaveKey, practiceExamSetId])

  const clearWritingSimulationAutosave = useCallback(() => {
    const uid = getRetentionUserId()
    removeAutosaveDraft(uid, autosaveKey, 'simulation', autosaveEntityId, 'complete')
  }, [autosaveKey, autosaveEntityId])

  const discardWritingSimulationResume = useCallback(() => {
    const uid = getRetentionUserId()
    removeAutosaveDraft(uid, autosaveKey, 'simulation', autosaveEntityId, 'discard')
    setWritingResumeOffer(null)
  }, [autosaveKey, autosaveEntityId])

  const applyWritingSimulationResume = useCallback(() => {
    const s = writingResumeOffer
    const t = s?.plan.tasks[s.taskIndex]
    if (!s || !t) return
    const itemNow = t.item
    const resumeKey = `${s.plan.sessionId}-${s.taskIndex}-${itemNow.id}`
    trackAutosaveRestored('simulation', autosaveEntityId)
    activeTaskKeyRef.current = resumeKey
    setPlan(s.plan)
    setTaskIndex(s.taskIndex)
    setCompletedBundles(s.completedBundles)
    bundlesRef.current = s.completedBundles
    examDraftRef.current = { ...s.currentDraft }
    globalDeadlineMsRef.current = s.globalDeadlineMs
    globalTimerFiredRef.current = false
    flushInProgressRef.current = false
    reportIntegrationRef.current = false
    setSessionReport(null)
    setSubmitError(null)
    setSubmitBusy(false)
    setSessionEndedByGlobalTimer(false)
    setTaskStartedAt(s.taskStartedAtIso ?? new Date().toISOString())
    setWritingInputSeedDraft(s.currentDraft)
    setWritingInputSeedSessionKey(resumeKey)
    const remSec =
      s.globalDeadlineMs != null ? Math.max(0, Math.ceil((s.globalDeadlineMs - Date.now()) / 1000)) : s.plan.totalDurationSec
    setGlobalRemainingSec(remSec)
    setPhase('task')
    setWritingResumeOffer(null)
  }, [writingResumeOffer, autosaveEntityId])

  const finalizeWithBundles = useCallback(
    (nextBundles: WritingSimulationTaskBundle[], endedByTimer: boolean) => {
      clearWritingSimulationAutosave()
      const pl = planRef.current
      if (!pl) return
      globalDeadlineMsRef.current = null
      globalTimerFiredRef.current = true
      bundlesRef.current = nextBundles
      setCompletedBundles(nextBundles)
      const summary = buildWritingSimulationSummaryUi({ plan: pl, bundles: nextBundles })
      setSessionReport(summary)
      setSessionEndedByGlobalTimer(endedByTimer)
      setPhase('report')
      track(ANALYTICS_EVENTS.writing_exam_simulation_completed, {
        session_id: pl.sessionId,
        task_count: pl.taskCount,
        writing_subtype_sequence: nextBundles.map((b) => b.item.subtype),
        average_normalized_percent: summary.averageNormalizedPercent,
        passes_count: summary.passesCount,
        timed_out_count: summary.timedOutCount,
        readiness_outcome: summary.simulationReadiness.outcomeKey,
        score_band: summary.simulationReadiness.readinessSignal.band,
        exam_mode: 'simulation',
        global_timer_expired: endedByTimer,
      })
    },
    [clearWritingSimulationAutosave]
  )

  const runGlobalTimeFlush = useCallback(() => {
    if (globalTimerFiredRef.current || flushInProgressRef.current || submitBusyRef.current) return
    const pl = planRef.current
    if (!pl || phaseRef.current !== 'task') return
    globalTimerFiredRef.current = true
    flushInProgressRef.current = true
    const ti = taskIndexRef.current
    const startIso = taskStartedAtRef.current ?? new Date().toISOString()
    const submittedAt = new Date().toISOString()
    const prior = bundlesRef.current
    const flushBundles = flushWritingSimulationFromTaskIndex({
      plan: pl,
      fromTaskIndex: ti,
      draft: {
        bodyText: examDraftRef.current.bodyText,
        fieldValues: examDraftRef.current.fieldValues,
        isForm: examDraftRef.current.isForm,
      },
      taskStartedAtIso: startIso,
      submittedAtIso: submittedAt,
    })
    const merged = [...prior, ...flushBundles]
    flushBundles.forEach((b, i) => {
      const taskIndex1 = prior.length + i + 1
      track(ANALYTICS_EVENTS.writing_exam_scored, {
        task_id: b.item.id,
        writing_subtype: b.item.subtype,
        normalized_percent: b.engine.normalizedPercent,
        pass: b.engine.pass,
        readiness_label: b.engine.readinessLabel,
        weak_tags: b.engine.weakTags,
        rubric_total: b.engine.totalScore,
        rubric_max: b.engine.maxScore,
        execution_gated: b.engine.executionGatingApplied,
        exam_mode: 'simulation',
        timed_out: true,
        global_timer: true,
      })
      track(ANALYTICS_EVENTS.writing_exam_simulation_task_completed, {
        session_id: pl.sessionId,
        task_id: b.item.id,
        writing_subtype: b.item.subtype,
        task_index: taskIndex1,
        task_total: pl.taskCount,
        timed_out: true,
        normalized_percent: b.engine.normalizedPercent,
        pass: b.engine.pass,
        exam_mode: 'simulation',
        global_timer: true,
      })
      applyExamLearningLoopClient({ kind: 'writing_simulation', bundle: b })
    })
    finalizeWithBundles(merged, true)
    flushInProgressRef.current = false
  }, [finalizeWithBundles])

  useEffect(() => {
    if (phase !== 'task' || !plan) {
      setGlobalRemainingSec(null)
      return
    }
    const tick = () => {
      const d = globalDeadlineMsRef.current
      if (d == null) return
      const r = remainingSecondsFromDeadline(d)
      setGlobalRemainingSec(r)
      if (r <= 0 && !globalTimerFiredRef.current && phaseRef.current === 'task') {
        runGlobalTimeFlush()
      }
    }
    tick()
    const id = window.setInterval(tick, 400)
    return () => window.clearInterval(id)
  }, [phase, plan?.sessionId, runGlobalTimeFlush])

  useLayoutEffect(() => {
    if (phase !== 'task' || !plan || !item || !currentPlanTask) return
    const key = `${plan.sessionId}-${taskIndex}-${item.id}`
    if (activeTaskKeyRef.current === key) return
    activeTaskKeyRef.current = key
    const started = new Date().toISOString()
    setTaskStartedAt(started)
    track(ANALYTICS_EVENTS.writing_exam_simulation_task_started, {
      session_id: plan.sessionId,
      task_id: item.id,
      writing_subtype: item.subtype,
      task_index: taskIndex + 1,
      task_total: plan.taskCount,
      part_label: currentPlanTask.partLabelNl,
      exam_mode: 'simulation',
      timer_mode: 'global',
      total_duration_sec: plan.totalDurationSec,
    })
  }, [phase, plan, taskIndex, item, currentPlanTask])

  useEffect(() => {
    if (phase !== 'task') return
    const tick = () => {
      const uid = getRetentionUserId()
      if (!uid) return
      const pl = planRef.current
      if (!pl || phaseRef.current !== 'task') return
      const body: WritingSimulationAutosaveBodyV1 = {
        v: 1,
        scope: practiceExamSetId ? { practiceExamSetId } : 'free',
        practiceContentVersion: practiceExamSetId ? PRACTICE_EXAM_CONTENT_VERSION : undefined,
        plan: pl,
        taskIndex: taskIndexRef.current,
        completedBundles: bundlesRef.current,
        currentDraft: { ...examDraftRef.current },
        globalDeadlineMs: globalDeadlineMsRef.current,
        taskStartedAtIso: taskStartedAtRef.current,
      }
      writeAutosaveDraft(uid, autosaveKey, 'simulation', autosaveEntityId, body, { save_mode: 'interval' })
    }
    const id = window.setInterval(tick, AUTOSAVE_INTERVAL_SESSION_MS)
    tick()
    return () => window.clearInterval(id)
  }, [phase, autosaveKey, autosaveEntityId, practiceExamSetId])

  useEffect(() => {
    const flush = () => {
      if (document.visibilityState !== 'hidden') return
      if (phaseRef.current !== 'task') return
      const pl = planRef.current
      if (!pl) return
      const uid = getRetentionUserId()
      if (!uid) return
      const body: WritingSimulationAutosaveBodyV1 = {
        v: 1,
        scope: practiceExamSetId ? { practiceExamSetId } : 'free',
        practiceContentVersion: practiceExamSetId ? PRACTICE_EXAM_CONTENT_VERSION : undefined,
        plan: pl,
        taskIndex: taskIndexRef.current,
        completedBundles: bundlesRef.current,
        currentDraft: { ...examDraftRef.current },
        globalDeadlineMs: globalDeadlineMsRef.current,
        taskStartedAtIso: taskStartedAtRef.current,
      }
      writeAutosaveDraft(uid, autosaveKey, 'simulation', autosaveEntityId, body, { save_mode: 'flush' })
    }
    document.addEventListener('visibilitychange', flush)
    return () => document.removeEventListener('visibilitychange', flush)
  }, [autosaveKey, autosaveEntityId, practiceExamSetId])

  const startWithPlan = useCallback((p: WritingSimulationSessionPlan) => {
    const uid = getRetentionUserId()
    removeAutosaveDraft(uid, autosaveKey, 'simulation', autosaveEntityId, 'restart')
    setWritingInputSeedDraft(null)
    setWritingInputSeedSessionKey(null)
    setPlan(p)
    setTaskIndex(0)
    setTaskStartedAt(null)
    setCompletedBundles([])
    setSessionReport(null)
    setSubmitError(null)
    setSubmitBusy(false)
    setSessionEndedByGlobalTimer(false)
    activeTaskKeyRef.current = null
    reportIntegrationRef.current = false
    bundlesRef.current = []
    globalTimerFiredRef.current = false
    flushInProgressRef.current = false
    globalDeadlineMsRef.current = Date.now() + p.totalDurationSec * 1000
    examDraftRef.current = emptyDraft()
    setGlobalRemainingSec(p.totalDurationSec)
    setPhase('task')
    track(ANALYTICS_EVENTS.writing_exam_simulation_started, {
      session_id: p.sessionId,
      task_count: p.taskCount,
      task_ids: p.tasks.map((t) => t.item.id),
      exam_mode: 'simulation',
      timer_mode: 'global',
      total_duration_sec: p.totalDurationSec,
    })
  }, [autosaveEntityId, autosaveKey])

  const startSimulation = useCallback(() => {
    startWithPlan(buildWritingSimulationSessionPlan(Date.now()))
  }, [startWithPlan])

  const handleSubmitTask = useCallback(
    (payload: { bodyText: string; fieldValues?: Record<string, string>; timedOut: boolean }) => {
      if (!item || !plan || !taskStartedAt || !currentPlanTask || submitBusy) return
      if (globalTimerFiredRef.current) return

      const composed =
        payload.bodyText.trim() ||
        Object.values(payload.fieldValues ?? {})
          .join(' ')
          .trim()

      if (!payload.timedOut && composed.length < 1) {
        setSubmitError('Vul het antwoord in om in te leveren.')
        return
      }

      setSubmitError(null)
      setSubmitBusy(true)
      const submittedAt = new Date().toISOString()

      if (payload.timedOut) {
        track(ANALYTICS_EVENTS.writing_exam_simulation_task_timed_out, {
          session_id: plan.sessionId,
          task_id: item.id,
          task_index: taskIndex + 1,
          writing_subtype: item.subtype,
          had_text: composed.length > 0,
          exam_mode: 'simulation',
        })
      }

      let bundle: WritingSimulationTaskBundle
      try {
        bundle = evaluateWritingSimulationSubmission({
          item,
          bodyText: payload.bodyText,
          fieldValues: payload.fieldValues,
          startedAtIso: taskStartedAt,
          submittedAtIso: submittedAt,
          timedOut: payload.timedOut,
        })
      } catch {
        setSubmitError('Kon uw tekst niet verwerken. Probeer opnieuw.')
        setSubmitBusy(false)
        return
      }

      track(ANALYTICS_EVENTS.writing_exam_scored, {
        task_id: item.id,
        writing_subtype: item.subtype,
        normalized_percent: bundle.engine.normalizedPercent,
        pass: bundle.engine.pass,
        readiness_label: bundle.engine.readinessLabel,
        weak_tags: bundle.engine.weakTags,
        rubric_total: bundle.engine.totalScore,
        rubric_max: bundle.engine.maxScore,
        execution_gated: bundle.engine.executionGatingApplied,
        exam_mode: 'simulation',
        timed_out: payload.timedOut,
      })

      track(ANALYTICS_EVENTS.writing_exam_simulation_task_completed, {
        session_id: plan.sessionId,
        task_id: item.id,
        writing_subtype: item.subtype,
        task_index: taskIndex + 1,
        task_total: plan.taskCount,
        timed_out: payload.timedOut,
        normalized_percent: bundle.engine.normalizedPercent,
        pass: bundle.engine.pass,
        exam_mode: 'simulation',
      })

      applyExamLearningLoopClient({ kind: 'writing_simulation', bundle })

      const nextBundles = [...bundlesRef.current, bundle]
      bundlesRef.current = nextBundles
      setCompletedBundles(nextBundles)

      const advance = afterWritingTaskStored(taskIndex, plan.taskCount)
      if (advance === 'session_report') {
        finalizeWithBundles(nextBundles, false)
      } else {
        setTaskIndex((i) => i + 1)
      }
      setWritingInputSeedDraft(null)
      setWritingInputSeedSessionKey(null)
      setSubmitBusy(false)
    },
    [item, plan, taskIndex, taskStartedAt, currentPlanTask, submitBusy, finalizeWithBundles]
  )

  useEffect(() => {
    if (phase !== 'report' || !sessionReport || reportIntegrationRef.current) return
    reportIntegrationRef.current = true
    track(ANALYTICS_EVENTS.writing_exam_simulation_result_viewed, {
      session_id: sessionReport.plan.sessionId,
      task_count: sessionReport.plan.taskCount,
      average_normalized_percent: sessionReport.averageNormalizedPercent,
      timed_out_count: sessionReport.timedOutCount,
      readiness_outcome: sessionReport.simulationReadiness.outcomeKey,
      score_band: sessionReport.simulationReadiness.readinessSignal.band,
      exam_mode: 'simulation',
    })
    const userId = getRetentionUserId()
    const outcome = outcomeFromSummary(sessionReport)
    const meta = recordExamPrepActivityComplete({
      userId,
      kind: 'writing_simulation_session',
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
      track(ANALYTICS_EVENTS.writing_exam_simulation_retry_clicked, {
        session_id: sessionReport.plan.sessionId,
        exam_mode: 'simulation',
      })
    }
    startSimulation()
  }, [sessionReport, startSimulation])

  const retryWithSamePlan = useCallback(() => {
    if (sessionReport) {
      track(ANALYTICS_EVENTS.writing_exam_simulation_retry_clicked, {
        session_id: sessionReport.plan.sessionId,
        exam_mode: 'simulation',
      })
      const sid =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `w-sim-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      startWithPlan({ ...sessionReport.plan, sessionId: sid })
    }
  }, [sessionReport, startWithPlan])

  const backToIntro = useCallback(() => {
    setRetentionReward(null)
    setPhase('intro')
    setPlan(null)
    setTaskIndex(0)
    setCompletedBundles([])
    setSessionReport(null)
    setTaskStartedAt(null)
    setSubmitError(null)
    setSubmitBusy(false)
    setGlobalRemainingSec(null)
    setSessionEndedByGlobalTimer(false)
    globalDeadlineMsRef.current = null
    globalTimerFiredRef.current = false
    activeTaskKeyRef.current = null
    reportIntegrationRef.current = false
    bundlesRef.current = []
    examDraftRef.current = emptyDraft()
  }, [])

  const sessionKey = useMemo(
    () => `${plan?.sessionId ?? 'na'}-${taskIndex}-${item?.id ?? 'x'}`,
    [plan?.sessionId, taskIndex, item?.id]
  )

  return {
    phase,
    plan,
    currentPlanTask,
    item,
    taskIndex,
    sessionReport,
    submitError,
    setSubmitError,
    submitBusy,
    sessionKey,
    globalRemainingSec,
    sessionEndedByGlobalTimer,
    examDraftRef,
    startSimulation,
    startWithPlan,
    handleSubmitTask,
    retrySimulation,
    retryWithSamePlan,
    backToIntro,
    retentionReward,
    initialWritingAutosaveChecked,
    writingResumeOffer,
    applyWritingSimulationResume,
    discardWritingSimulationResume,
    writingInputSeedDraft,
    writingInputSeedSessionKey,
  }
}
