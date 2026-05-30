'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  buildListeningTrainingSessionPlan,
  type ListeningTrainingSessionPlan,
} from '@/lib/exam-prep/listening/listeningTaskBuilder'
import {
  maxTotalAudioStarts,
  speechRateForPreset,
  type ListeningDifficultyPreset,
} from '@/lib/exam-prep/listening/listeningDifficultyPolicy'
import {
  canStartAudio,
  initialReplayState,
  markListenCompleted,
  registerAudioStart,
  replaysUsed,
  type ListeningReplayState,
} from '@/lib/exam-prep/listening/listeningReplayPolicy'
import { remainingSecondsFromDeadline } from '@/lib/exam-session/examTimerService'
import { evaluateListeningMcq } from '@/lib/exam-prep/listening/listeningEvaluationService'
import type { ListeningEvaluationResult } from '@/lib/exam-prep/listening/types'
import type { ListeningTrainingItem } from '@/lib/schemas/exam/listeningTrainingItem.schema'
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
import type { ExamPrepRetentionSummary } from '@/lib/exam-rewards/types'
import { getRetentionUserId, recordExamPrepActivityComplete } from '@/lib/retention/retentionService'
import type { SessionOutcome } from '@/lib/practice-feedback/types'
import { recordAbilityScenarioSignal } from '@/lib/mastery/recordAbilitySignals'
import { PRACTICE_EXAM_CONTENT_VERSION } from '@/lib/exam-prep/practice-exams/types'
import {
  AUTOSAVE_INTERVAL_SESSION_MS,
  listeningPracticeExamDraftKey,
  removeAutosaveDraft,
  trackAutosaveRestored,
  writeAutosaveDraft,
  type ListeningPracticeExamAutosaveBodyV1,
} from '@/lib/autosave'

const SCENARIO_ID = 'exam_listening_training'

function maxStartsForListeningPlan(pl: ListeningTrainingSessionPlan): number {
  return pl.maxAudioStartsPerTask ?? maxTotalAudioStarts(pl.preset)
}

type Phase = 'intro' | 'task' | 'result' | 'session_complete'

export function useListeningTrainingSession() {
  const [retentionReward, setRetentionReward] = useState<ExamPrepRetentionSummary | null>(null)
  const [phase, setPhase] = useState<Phase>('intro')
  const [preset, setPreset] = useState<ListeningDifficultyPreset | null>(null)
  const [plan, setPlan] = useState<ListeningTrainingSessionPlan | null>(null)
  const [taskIndex, setTaskIndex] = useState(0)
  const [replayState, setReplayState] = useState<ListeningReplayState>(() => initialReplayState(8))
  const [hasCompletedListen, setHasCompletedListen] = useState(false)
  const [evalResult, setEvalResult] = useState<ListeningEvaluationResult | null>(null)
  const [correctCount, setCorrectCount] = useState(0)
  const correctCountRef = useRef(0)
  const [sessionStartedAtIso, setSessionStartedAtIso] = useState<string | null>(null)
  const [globalRemainingSec, setGlobalRemainingSec] = useState<number | null>(null)
  const [sessionEndedByTimer, setSessionEndedByTimer] = useState(false)
  const sessionDeadlineMsRef = useRef<number | null>(null)
  const listeningTimerFiredRef = useRef(false)

  const replayRef = useRef(replayState)
  replayRef.current = replayState

  const taskMetaRef = useRef<string | null>(null)
  const resultViewedRef = useRef(false)
  const integrationRef = useRef(false)
  const sessionCompletedRef = useRef(false)
  const listeningExamModeRef = useRef<'training' | 'practice_exam'>('training')
  const practiceExamSetIdRef = useRef<string | null>(null)
  const hasCompletedListenRef = useRef(false)
  const planRef = useRef(plan)
  const phaseRef = useRef(phase)
  const taskIndexRef = useRef(taskIndex)
  const sessionStartedAtIsoRef = useRef(sessionStartedAtIso)

  const item: ListeningTrainingItem | null = plan?.tasks[taskIndex] ?? null

  useEffect(() => {
    hasCompletedListenRef.current = hasCompletedListen
  }, [hasCompletedListen])

  useEffect(() => {
    planRef.current = plan
    phaseRef.current = phase
    taskIndexRef.current = taskIndex
    sessionStartedAtIsoRef.current = sessionStartedAtIso
  }, [plan, phase, taskIndex, sessionStartedAtIso])

  const emitListeningAbandon = useCallback(
    (abandonReason: 'navigation_unmount' | 'user_exit') => {
      if (sessionCompletedRef.current) return
      if (phaseRef.current === 'session_complete') return
      const pl = planRef.current
      const startedIso = sessionStartedAtIsoRef.current
      if (!pl || !startedIso) return
      const startedMs = Date.parse(startedIso)
      const durationMs = Number.isFinite(startedMs) ? Date.now() - startedMs : undefined
      const ph = phaseRef.current
      const ti = taskIndexRef.current
      const tItem = pl.tasks[ti]
      const mode = listeningExamModeRef.current
      if (ph === 'task' && tItem) {
        trackLearningStepAbandoned({
          unit_kind: 'listening_training_session',
          unit_id: pl.sessionId,
          module: 'listening',
          surface: 'exam_prep_training',
          exam_mode: mode,
          step_key: tItem.id,
          step_index: ti + 1,
          step_total: pl.taskCount,
          question_type: tItem.questionType,
          abandon_reason: abandonReason,
        })
      }
      trackLearningUnitAbandoned({
        unit_kind: 'listening_training_session',
        unit_id: pl.sessionId,
        module: 'listening',
        surface: 'exam_prep_training',
        exam_mode: mode,
        duration_ms: durationMs,
        step_index: ti + 1,
        step_total: pl.taskCount,
        progress_ratio: pl.taskCount > 0 ? ti / pl.taskCount : 0,
        exit_phase: ph,
        abandon_reason: abandonReason,
      })
    },
    []
  )

  useEffect(() => {
    return () => {
      emitListeningAbandon('navigation_unmount')
    }
  }, [emitListeningAbandon])
  const maxStarts = plan && preset ? maxStartsForListeningPlan(plan) : preset ? maxTotalAudioStarts(preset) : 8
  const speechRate = preset ? speechRateForPreset(preset) : 0.92

  useEffect(() => {
    if (phase !== 'task' || !item || !plan || !preset) return
    const key = `${plan.sessionId}-${taskIndex}-${item.id}`
    if (taskMetaRef.current === key) return
    taskMetaRef.current = key
    track(ANALYTICS_EVENTS.listening_exam_task_viewed, {
      session_id: plan.sessionId,
      task_id: item.id,
      question_type: item.questionType,
      difficulty_band: item.difficultyBand,
      difficulty_preset: preset,
      task_index: taskIndex + 1,
      task_total: plan.taskCount,
      exam_mode: 'training',
    })
    trackLearningStepStarted({
      unit_kind: 'listening_training_session',
      unit_id: plan.sessionId,
      module: 'listening',
      surface: 'exam_prep_training',
      exam_mode: listeningExamModeRef.current,
      difficulty: preset,
      step_key: item.id,
      step_index: taskIndex + 1,
      step_total: plan.taskCount,
      question_type: item.questionType,
    })
  }, [phase, item, plan, preset, taskIndex])

  const clearListeningPracticeExamAutosave = useCallback(() => {
    const sid = practiceExamSetIdRef.current
    if (!sid) return
    const uid = getRetentionUserId()
    removeAutosaveDraft(uid, listeningPracticeExamDraftKey(sid), 'exam', sid, 'complete')
    practiceExamSetIdRef.current = null
  }, [])

  const hydrateListeningPracticeExamSnapshot = useCallback(
    (snap: ListeningPracticeExamAutosaveBodyV1, pl: ListeningTrainingSessionPlan) => {
      trackAutosaveRestored('exam', snap.setId)
      practiceExamSetIdRef.current = snap.setId
      listeningExamModeRef.current = 'practice_exam'
      setPreset(pl.preset)
      setPlan(pl)
      setTaskIndex(snap.taskIndex)
      setReplayState(snap.replayState)
      setHasCompletedListen(snap.hasCompletedListen)
      setCorrectCount(snap.correctCount)
      correctCountRef.current = snap.correctCount
      setSessionStartedAtIso(snap.sessionStartedAtIso ?? new Date().toISOString())
      setEvalResult(null)
      setPhase('task')
      taskMetaRef.current = null
      resultViewedRef.current = false
      integrationRef.current = false
      sessionCompletedRef.current = false
      listeningTimerFiredRef.current = false
      if (pl.flowMode === 'duo_practice_exam' && pl.totalTimeLimitSec != null) {
        sessionDeadlineMsRef.current =
          snap.sessionDeadlineMs != null && snap.sessionDeadlineMs > Date.now()
            ? snap.sessionDeadlineMs
            : Date.now() + pl.totalTimeLimitSec * 1000
        setSessionEndedByTimer(false)
      } else {
        sessionDeadlineMsRef.current = null
      }
      track(ANALYTICS_EVENTS.listening_exam_training_started, {
        session_id: pl.sessionId,
        difficulty_preset: pl.preset,
        task_count: pl.taskCount,
        exam_mode: 'practice_exam',
      })
      const curItem = pl.tasks[snap.taskIndex]
      if (curItem) {
        const resumeKey = `${pl.sessionId}-${snap.taskIndex}-${curItem.id}`
        taskMetaRef.current = resumeKey
      }
      trackExamPrepUnitStarted({
        unit_kind: 'listening_training_session',
        unit_id: pl.sessionId,
        module: 'listening',
        surface: 'exam_prep_training',
        exam_mode: 'practice_exam',
        difficulty: pl.preset,
        step_total: pl.taskCount,
      })
    },
    []
  )

  const startWithFixedPlan = useCallback((pl: ListeningTrainingSessionPlan, opts?: { practiceExamSetId?: string }) => {
    const uid = getRetentionUserId()
    if (opts?.practiceExamSetId) {
      removeAutosaveDraft(uid, listeningPracticeExamDraftKey(opts.practiceExamSetId), 'exam', opts.practiceExamSetId, 'restart')
      practiceExamSetIdRef.current = opts.practiceExamSetId
    } else {
      practiceExamSetIdRef.current = null
    }
    setPreset(pl.preset)
    setPlan(pl)
    setTaskIndex(0)
    setReplayState(initialReplayState(maxStartsForListeningPlan(pl)))
    setHasCompletedListen(false)
    setEvalResult(null)
    setCorrectCount(0)
    correctCountRef.current = 0
    setSessionStartedAtIso(new Date().toISOString())
    setPhase('task')
    taskMetaRef.current = null
    resultViewedRef.current = false
    integrationRef.current = false
    sessionCompletedRef.current = false
    listeningExamModeRef.current = 'practice_exam'
    if (pl.flowMode === 'duo_practice_exam' && pl.totalTimeLimitSec != null) {
      sessionDeadlineMsRef.current = Date.now() + pl.totalTimeLimitSec * 1000
      listeningTimerFiredRef.current = false
      setSessionEndedByTimer(false)
    } else {
      sessionDeadlineMsRef.current = null
    }
    track(ANALYTICS_EVENTS.listening_exam_training_started, {
      session_id: pl.sessionId,
      difficulty_preset: pl.preset,
      task_count: pl.taskCount,
      exam_mode: 'practice_exam',
    })
    trackExamPrepUnitStarted({
      unit_kind: 'listening_training_session',
      unit_id: pl.sessionId,
      module: 'listening',
      surface: 'exam_prep_training',
      exam_mode: 'practice_exam',
      difficulty: pl.preset,
      step_total: pl.taskCount,
    })
  }, [])

  const startSession = useCallback((p: ListeningDifficultyPreset) => {
    const pl = buildListeningTrainingSessionPlan({ preset: p, seed: Date.now() })
    setPreset(p)
    setPlan(pl)
    setTaskIndex(0)
    setReplayState(initialReplayState(maxTotalAudioStarts(p)))
    setHasCompletedListen(false)
    setEvalResult(null)
    setCorrectCount(0)
    correctCountRef.current = 0
    setSessionStartedAtIso(new Date().toISOString())
    setPhase('task')
    taskMetaRef.current = null
    resultViewedRef.current = false
    integrationRef.current = false
    sessionCompletedRef.current = false
    listeningExamModeRef.current = 'training'
    practiceExamSetIdRef.current = null
    track(ANALYTICS_EVENTS.listening_exam_training_started, {
      session_id: pl.sessionId,
      difficulty_preset: p,
      task_count: pl.taskCount,
      exam_mode: 'training',
    })
    trackExamPrepUnitStarted({
      unit_kind: 'listening_training_session',
      unit_id: pl.sessionId,
      module: 'listening',
      surface: 'exam_prep_training',
      exam_mode: 'training',
      difficulty: p,
      step_total: pl.taskCount,
    })
  }, [])

  const onBeforePlay = useCallback((): boolean => {
    const s = replayRef.current
    if (!canStartAudio(s)) return false
    const next = registerAudioStart(s)
    if (next.startsUsed === 1) {
      track(ANALYTICS_EVENTS.listening_exam_audio_played, {
        task_id: item?.id,
        question_type: item?.questionType,
        difficulty_preset: preset,
        starts_after: next.startsUsed,
        exam_mode: 'training',
      })
    } else {
      track(ANALYTICS_EVENTS.listening_exam_audio_replayed, {
        task_id: item?.id,
        question_type: item?.questionType,
        difficulty_preset: preset,
        replay_count: replaysUsed(next),
        starts_after: next.startsUsed,
        exam_mode: 'training',
      })
    }
    setReplayState(next)
    return true
  }, [item?.id, item?.questionType, preset])

  const onPlaybackComplete = useCallback(() => {
    setReplayState((s) => markListenCompleted(s))
    setHasCompletedListen(true)
  }, [])

  const canAnswer = hasCompletedListen || !canStartAudio(replayState)

  const advanceListeningStep = useCallback(() => {
    if (!plan) return
    track(ANALYTICS_EVENTS.listening_exam_next_clicked, {
      session_id: plan.sessionId,
      task_index: taskIndex + 1,
      exam_mode: 'training',
    })

    if (taskIndex + 1 >= plan.taskCount) {
      sessionCompletedRef.current = true
      const startedIso = sessionStartedAtIso
      const startedMs = startedIso ? Date.parse(startedIso) : NaN
      const durationMs = Number.isFinite(startedMs) ? Date.now() - startedMs : undefined
      const accPct = plan.taskCount > 0 ? (correctCountRef.current / plan.taskCount) * 100 : 0
      const mode = listeningExamModeRef.current
      track(ANALYTICS_EVENTS.listening_exam_training_session_completed, {
        session_id: plan.sessionId,
        task_count: plan.taskCount,
        correct_count: correctCountRef.current,
        difficulty_preset: preset,
        exam_mode: 'training',
      })
      trackExamPrepUnitCompleted({
        unit_kind: 'listening_training_session',
        unit_id: plan.sessionId,
        module: 'listening',
        surface: 'exam_prep_training',
        exam_mode: mode,
        duration_ms: durationMs,
        step_total: plan.taskCount,
        step_completed_count: plan.taskCount,
        score_summary: accPct,
        outcome: correctCountRef.current >= Math.ceil(plan.taskCount * 0.66) ? 'success' : 'partial',
      })
      trackLearningScoreProgress({
        module: 'listening',
        metric_key: 'listening_training_session_accuracy_pct',
        value: accPct,
        unit_id: plan.sessionId,
        exam_mode: mode,
        pass: correctCountRef.current >= Math.ceil(plan.taskCount * 0.66),
      })
      clearListeningPracticeExamAutosave()
      setPhase('session_complete')
      return
    }

    setRetentionReward(null)
    setTaskIndex((i) => i + 1)
    setReplayState(initialReplayState(maxStartsForListeningPlan(plan)))
    setHasCompletedListen(false)
    setEvalResult(null)
    setPhase('task')
    taskMetaRef.current = null
  }, [plan, taskIndex, preset, sessionStartedAtIso, clearListeningPracticeExamAutosave])

  useEffect(() => {
    const sid = practiceExamSetIdRef.current
    if (!sid || listeningExamModeRef.current !== 'practice_exam') return
    if (phase !== 'task' || !plan) return
    const tick = () => {
      const pl = planRef.current
      if (!pl || phaseRef.current !== 'task' || !practiceExamSetIdRef.current) return
      const uid = getRetentionUserId()
      const body: ListeningPracticeExamAutosaveBodyV1 = {
        v: 1,
        setId: sid,
        contentVersion: PRACTICE_EXAM_CONTENT_VERSION,
        taskIds: pl.tasks.map((t) => t.id),
        taskIndex: taskIndexRef.current,
        replayState: replayRef.current,
        hasCompletedListen: hasCompletedListenRef.current,
        correctCount: correctCountRef.current,
        sessionStartedAtIso: sessionStartedAtIsoRef.current,
        sessionDeadlineMs: sessionDeadlineMsRef.current,
      }
      writeAutosaveDraft(uid, listeningPracticeExamDraftKey(sid), 'exam', sid, body, { save_mode: 'interval' })
    }
    const id = window.setInterval(tick, AUTOSAVE_INTERVAL_SESSION_MS)
    tick()
    return () => window.clearInterval(id)
  }, [phase, plan?.sessionId])

  useEffect(() => {
    if (plan?.flowMode !== 'duo_practice_exam' || plan.totalTimeLimitSec == null) {
      setGlobalRemainingSec(null)
      return
    }
    if (phase === 'session_complete') {
      setGlobalRemainingSec(null)
      return
    }
    const tick = () => {
      const d = sessionDeadlineMsRef.current
      if (d == null) return
      const r = remainingSecondsFromDeadline(d)
      setGlobalRemainingSec(r)
      if (r <= 0 && !listeningTimerFiredRef.current && phaseRef.current !== 'session_complete') {
        listeningTimerFiredRef.current = true
        setSessionEndedByTimer(true)
        sessionCompletedRef.current = true
        const sid = practiceExamSetIdRef.current
        if (sid) {
          const uid = getRetentionUserId()
          removeAutosaveDraft(uid, listeningPracticeExamDraftKey(sid), 'exam', sid, 'complete')
          practiceExamSetIdRef.current = null
        }
        setPhase('session_complete')
      }
    }
    tick()
    const id = window.setInterval(tick, 400)
    return () => window.clearInterval(id)
  }, [plan?.sessionId, plan?.flowMode, plan?.totalTimeLimitSec, phase])

  const submitAnswer = useCallback(
    (optionId: string) => {
      if (!item || !plan || !preset) return
      if (!canAnswer) return

      track(ANALYTICS_EVENTS.listening_exam_answer_selected, {
        task_id: item.id,
        question_type: item.questionType,
        option_id: optionId,
        difficulty_preset: preset,
        replay_count: replaysUsed(replayState),
        exam_mode: 'training',
      })

      const res = evaluateListeningMcq({ item, selectedOptionId: optionId })

      track(ANALYTICS_EVENTS.listening_exam_answer_submitted, {
        task_id: item.id,
        question_type: item.questionType,
        correct: res.correct,
        difficulty_preset: preset,
        replay_count: replaysUsed(replayState),
        exam_mode: 'training',
      })

      trackLearningStepCompleted({
        unit_kind: 'listening_training_session',
        unit_id: plan.sessionId,
        module: 'listening',
        surface: 'exam_prep_training',
        exam_mode: listeningExamModeRef.current,
        difficulty: preset,
        step_key: item.id,
        step_index: taskIndex + 1,
        step_total: plan.taskCount,
        correct: res.correct,
        score: res.correct ? 100 : 0,
        replay_count: replaysUsed(replayState),
      })

      const submittedAt = new Date().toISOString()
      applyExamLearningLoopClient({
        kind: 'listening',
        itemId: item.id,
        attemptId: `${plan.sessionId}-${item.id}-${submittedAt}`,
        questionType: item.questionType,
        correct: res.correct,
        replayCount: replaysUsed(replayState),
        maxReplay: maxStarts,
      })

      setCorrectCount((c) => c + (res.correct ? 1 : 0))
      if (res.correct) correctCountRef.current += 1

      if (plan.flowMode === 'duo_practice_exam') {
        advanceListeningStep()
        return
      }

      setEvalResult(res)
      setPhase('result')
      resultViewedRef.current = false
      integrationRef.current = false
    },
    [item, plan, preset, canAnswer, replayState, maxStarts, advanceListeningStep]
  )

  useEffect(() => {
    if (phase !== 'result' || !evalResult || !item || !plan || resultViewedRef.current) return
    resultViewedRef.current = true
    track(ANALYTICS_EVENTS.listening_exam_result_viewed, {
      task_id: item.id,
      question_type: item.questionType,
      correct: evalResult.correct,
      difficulty_preset: preset,
      replay_count: replaysUsed(replayState),
      exam_mode: 'training',
    })
  }, [phase, evalResult, item, plan, preset, replayState])

  useEffect(() => {
    if (phase !== 'result' || !evalResult || !item || integrationRef.current) return
    integrationRef.current = true
    const userId = getRetentionUserId()
    const outcome: SessionOutcome = evalResult.correct ? 'success' : 'partial'
    const meta = recordExamPrepActivityComplete({
      userId,
      kind: 'listening_training_task',
      scenarioId: SCENARIO_ID,
      outcome,
      taskId: item.id,
      correct: evalResult.correct,
    })
    setRetentionReward(meta.examPrep ?? null)
    recordAbilityScenarioSignal({
      userId,
      scenarioId: SCENARIO_ID,
      outcome,
    })
  }, [phase, evalResult, item])

  const goNextFixed = useCallback(() => {
    advanceListeningStep()
  }, [advanceListeningStep])

  const resetToIntro = useCallback(() => {
    emitListeningAbandon('user_exit')
    setRetentionReward(null)
    setPhase('intro')
    setPreset(null)
    setPlan(null)
    setTaskIndex(0)
    setEvalResult(null)
    setCorrectCount(0)
    correctCountRef.current = 0
    setSessionStartedAtIso(null)
    taskMetaRef.current = null
    sessionCompletedRef.current = false
    practiceExamSetIdRef.current = null
  }, [emitListeningAbandon])

  const discardListeningPracticeExamDraft = useCallback((setId: string) => {
    const uid = getRetentionUserId()
    removeAutosaveDraft(uid, listeningPracticeExamDraftKey(setId), 'exam', setId, 'discard')
  }, [])

  const sessionKey = useMemo(() => `${plan?.sessionId ?? 'na'}-${taskIndex}-${item?.id ?? 'x'}`, [plan?.sessionId, taskIndex, item?.id])

  return {
    phase,
    preset,
    plan,
    item,
    taskIndex,
    replayState,
    hasCompletedListen,
    canAnswer,
    evalResult,
    maxStarts,
    speechRate,
    correctCount,
    sessionStartedAtIso,
    sessionKey,
    startSession,
    startWithFixedPlan,
    hydrateListeningPracticeExamSnapshot,
    discardListeningPracticeExamDraft,
    onBeforePlay,
    onPlaybackComplete,
    submitAnswer,
    goNext: goNextFixed,
    resetToIntro,
    retentionReward,
    globalRemainingSec,
    sessionEndedByTimer,
  }
}
