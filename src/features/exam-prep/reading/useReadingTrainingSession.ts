'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  buildReadingTrainingSessionPlan,
  type ReadingTrainingSessionPlan,
} from '@/lib/exam-prep/reading/readingTaskBuilder'
import type { ReadingDifficultyPreset } from '@/lib/exam-prep/reading/readingDifficultyPolicy'
import { evaluateReadingMcq } from '@/lib/exam-prep/reading/readingEvaluationService'
import type { ReadingEvaluationResult } from '@/lib/exam-prep/reading/types'
import { readingSkillAnalyticsValue } from '@/lib/exam-prep/reading/readingSkillClassifier'
import type { ReadingTrainingItem } from '@/lib/schemas/exam/readingTrainingItem.schema'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { applyExamLearningLoopClient } from '@/lib/exam-learning-loop/examMistakeExtractor'
import type { ExamPrepRetentionSummary } from '@/lib/exam-rewards/types'
import { getRetentionUserId, recordExamPrepActivityComplete } from '@/lib/retention/retentionService'
import type { SessionOutcome } from '@/lib/practice-feedback/types'
import { recordAbilityScenarioSignal } from '@/lib/mastery/recordAbilitySignals'
import { remainingSecondsFromDeadline } from '@/lib/exam-session/examTimerService'
import { PRACTICE_EXAM_CONTENT_VERSION } from '@/lib/exam-prep/practice-exams/types'
import {
  AUTOSAVE_INTERVAL_SESSION_MS,
  readingPracticeExamDraftKey,
  removeAutosaveDraft,
  trackAutosaveRestored,
  writeAutosaveDraft,
  type ReadingPracticeExamAutosaveBodyV1,
} from '@/lib/autosave'

const SCENARIO_ID = 'exam_reading_training'

type Phase = 'intro' | 'task' | 'result' | 'session_complete'

export function useReadingTrainingSession() {
  const [retentionReward, setRetentionReward] = useState<ExamPrepRetentionSummary | null>(null)
  const [phase, setPhase] = useState<Phase>('intro')
  const [preset, setPreset] = useState<ReadingDifficultyPreset | null>(null)
  const [plan, setPlan] = useState<ReadingTrainingSessionPlan | null>(null)
  const [taskIndex, setTaskIndex] = useState(0)
  const [answerUnlocked, setAnswerUnlocked] = useState(false)
  const [evalResult, setEvalResult] = useState<ReadingEvaluationResult | null>(null)
  const [correctCount, setCorrectCount] = useState(0)
  const correctCountRef = useRef(0)
  const [sessionStartedAtIso, setSessionStartedAtIso] = useState<string | null>(null)
  const [globalRemainingSec, setGlobalRemainingSec] = useState<number | null>(null)
  const [sessionEndedByTimer, setSessionEndedByTimer] = useState(false)
  /** Duo oefenexamen: gekozen optie vóór bevestigen met Volgende. */
  const [duoSelectedOptionId, setDuoSelectedOptionId] = useState<string | null>(null)
  /** Laatst bevestigde antwoord per vraag (voor terug + opnieuw bevestigen zonder dubbele score). */
  const duoCommittedOptionByTaskIndexRef = useRef<Map<number, string>>(new Map())
  const practiceExamSetIdRef = useRef<string | null>(null)
  const taskIndexRef = useRef(taskIndex)
  const answerUnlockedRef = useRef(answerUnlocked)
  const duoSelectedOptionIdRef = useRef<string | null>(duoSelectedOptionId)
  const sessionStartedAtIsoRef = useRef<string | null>(sessionStartedAtIso)

  const sessionDeadlineMsRef = useRef<number | null>(null)
  const readingTimerFiredRef = useRef(false)
  const phaseRef = useRef(phase)
  const planRef = useRef(plan)

  const taskViewedAtRef = useRef<number | null>(null)
  const taskMetaRef = useRef<string | null>(null)
  const resultViewedRef = useRef(false)
  const integrationRef = useRef(false)

  const item: ReadingTrainingItem | null = plan?.tasks[taskIndex] ?? null

  useEffect(() => {
    phaseRef.current = phase
    planRef.current = plan
  }, [phase, plan])

  useEffect(() => {
    taskIndexRef.current = taskIndex
  }, [taskIndex])
  useEffect(() => {
    answerUnlockedRef.current = answerUnlocked
  }, [answerUnlocked])
  useEffect(() => {
    duoSelectedOptionIdRef.current = duoSelectedOptionId
  }, [duoSelectedOptionId])
  useEffect(() => {
    sessionStartedAtIsoRef.current = sessionStartedAtIso
  }, [sessionStartedAtIso])

  useEffect(() => {
    const lim = plan?.totalTimeLimitSec
    if (lim == null || phase === 'session_complete' || phase === 'intro') {
      setGlobalRemainingSec(null)
      return
    }
    const tick = () => {
      const d = sessionDeadlineMsRef.current
      if (d == null) return
      const r = remainingSecondsFromDeadline(d)
      setGlobalRemainingSec(r)
      if (r <= 0 && !readingTimerFiredRef.current && phaseRef.current !== 'session_complete') {
        readingTimerFiredRef.current = true
        setSessionEndedByTimer(true)
        const sid = practiceExamSetIdRef.current
        if (sid) {
          const uid = getRetentionUserId()
          removeAutosaveDraft(uid, readingPracticeExamDraftKey(sid), 'exam', sid, 'complete')
          practiceExamSetIdRef.current = null
        }
        setPhase('session_complete')
      }
    }
    tick()
    const id = window.setInterval(tick, 400)
    return () => window.clearInterval(id)
  }, [plan?.sessionId, plan?.totalTimeLimitSec, phase])

  useEffect(() => {
    const sid = practiceExamSetIdRef.current
    if (!sid) return
    if (phase !== 'task' || !plan) return
    const tick = () => {
      const pl = planRef.current
      if (!pl || phaseRef.current !== 'task' || !practiceExamSetIdRef.current) return
      const uid = getRetentionUserId()
      const body: ReadingPracticeExamAutosaveBodyV1 = {
        v: 1,
        setId: sid,
        contentVersion: PRACTICE_EXAM_CONTENT_VERSION,
        taskIds: pl.tasks.map((t) => t.id),
        phase: 'task',
        taskIndex: taskIndexRef.current,
        answerUnlocked: answerUnlockedRef.current,
        duoSelectedOptionId: duoSelectedOptionIdRef.current,
        duoCommitted: Array.from(duoCommittedOptionByTaskIndexRef.current.entries()),
        correctCount: correctCountRef.current,
        sessionStartedAtIso: sessionStartedAtIsoRef.current,
        evalResult: null,
        sessionDeadlineMs: sessionDeadlineMsRef.current,
      }
      writeAutosaveDraft(uid, readingPracticeExamDraftKey(sid), 'exam', sid, body, { save_mode: 'interval' })
    }
    const id = window.setInterval(tick, AUTOSAVE_INTERVAL_SESSION_MS)
    tick()
    return () => window.clearInterval(id)
  }, [phase, plan?.sessionId])

  useEffect(() => {
    if (phase !== 'task' || !item || !plan || !preset) return
    const key = `${plan.sessionId}-${taskIndex}-${item.id}`
    if (taskMetaRef.current === key) return
    taskMetaRef.current = key
    taskViewedAtRef.current = Date.now()
    setDuoSelectedOptionId(null)
    // Duo oefenexamen: geen aparte "tekst eerst" stap — antwoorden moeten direct werken.
    setAnswerUnlocked(plan.flowMode === 'duo_practice_exam')
    track(ANALYTICS_EVENTS.reading_exam_task_viewed, {
      session_id: plan.sessionId,
      task_id: item.id,
      reading_skill: readingSkillAnalyticsValue(item.readingSkill),
      difficulty_band: item.difficultyBand,
      difficulty_preset: preset,
      task_index: taskIndex + 1,
      task_total: plan.taskCount,
      exam_mode: 'training',
    })
  }, [phase, item, plan, preset, taskIndex])

  const clearReadingPracticeExamAutosave = useCallback(() => {
    const sid = practiceExamSetIdRef.current
    if (!sid) return
    const uid = getRetentionUserId()
    removeAutosaveDraft(uid, readingPracticeExamDraftKey(sid), 'exam', sid, 'complete')
    practiceExamSetIdRef.current = null
  }, [])

  const hydrateReadingPracticeExamSnapshot = useCallback(
    (snap: ReadingPracticeExamAutosaveBodyV1, pl: ReadingTrainingSessionPlan) => {
      trackAutosaveRestored('exam', snap.setId)
      practiceExamSetIdRef.current = snap.setId
      setPreset(pl.preset)
      setPlan(pl)
      setTaskIndex(snap.taskIndex)
      setAnswerUnlocked(snap.answerUnlocked)
      setDuoSelectedOptionId(snap.duoSelectedOptionId)
      duoCommittedOptionByTaskIndexRef.current = new Map(snap.duoCommitted)
      setCorrectCount(snap.correctCount)
      correctCountRef.current = snap.correctCount
      setSessionStartedAtIso(snap.sessionStartedAtIso ?? new Date().toISOString())
      setEvalResult(null)
      setPhase('task')
      taskMetaRef.current = null
      resultViewedRef.current = false
      integrationRef.current = false
      readingTimerFiredRef.current = false
      if (pl.totalTimeLimitSec != null) {
        sessionDeadlineMsRef.current =
          snap.sessionDeadlineMs != null && snap.sessionDeadlineMs > Date.now()
            ? snap.sessionDeadlineMs
            : Date.now() + pl.totalTimeLimitSec * 1000
        setSessionEndedByTimer(false)
      } else {
        sessionDeadlineMsRef.current = null
      }
      const curItem = pl.tasks[snap.taskIndex]
      if (curItem) {
        const resumeKey = `${pl.sessionId}-${snap.taskIndex}-${curItem.id}`
        taskMetaRef.current = resumeKey
        taskViewedAtRef.current = Date.now()
      }
      track(ANALYTICS_EVENTS.reading_exam_training_started, {
        session_id: pl.sessionId,
        difficulty_preset: pl.preset,
        task_count: pl.taskCount,
        exam_mode: 'practice_exam',
      })
    },
    []
  )

  const startWithFixedPlan = useCallback((pl: ReadingTrainingSessionPlan, opts?: { practiceExamSetId?: string }) => {
    const uid = getRetentionUserId()
    if (opts?.practiceExamSetId) {
      removeAutosaveDraft(uid, readingPracticeExamDraftKey(opts.practiceExamSetId), 'exam', opts.practiceExamSetId, 'restart')
      practiceExamSetIdRef.current = opts.practiceExamSetId
    } else {
      practiceExamSetIdRef.current = null
    }
    setPreset(pl.preset)
    setPlan(pl)
    setTaskIndex(0)
    setAnswerUnlocked(pl.flowMode === 'duo_practice_exam')
    setEvalResult(null)
    setCorrectCount(0)
    correctCountRef.current = 0
    setSessionStartedAtIso(new Date().toISOString())
    readingTimerFiredRef.current = false
    setSessionEndedByTimer(false)
    if (pl.totalTimeLimitSec != null) {
      sessionDeadlineMsRef.current = Date.now() + pl.totalTimeLimitSec * 1000
    } else {
      sessionDeadlineMsRef.current = null
    }
    setPhase('task')
    taskMetaRef.current = null
    duoCommittedOptionByTaskIndexRef.current.clear()
    setDuoSelectedOptionId(null)
    resultViewedRef.current = false
    integrationRef.current = false
    track(ANALYTICS_EVENTS.reading_exam_training_started, {
      session_id: pl.sessionId,
      difficulty_preset: pl.preset,
      task_count: pl.taskCount,
      exam_mode: 'practice_exam',
    })
  }, [])

  const startSession = useCallback((p: ReadingDifficultyPreset) => {
    practiceExamSetIdRef.current = null
    const pl = buildReadingTrainingSessionPlan({ preset: p, seed: Date.now() })
    setPreset(p)
    setPlan(pl)
    setTaskIndex(0)
    setAnswerUnlocked(false)
    setEvalResult(null)
    setCorrectCount(0)
    correctCountRef.current = 0
    setSessionStartedAtIso(new Date().toISOString())
    setPhase('task')
    taskMetaRef.current = null
    duoCommittedOptionByTaskIndexRef.current.clear()
    setDuoSelectedOptionId(null)
    resultViewedRef.current = false
    integrationRef.current = false
    track(ANALYTICS_EVENTS.reading_exam_training_started, {
      session_id: pl.sessionId,
      difficulty_preset: p,
      task_count: pl.taskCount,
      exam_mode: 'training',
    })
  }, [])

  const unlockAnswers = useCallback(() => {
    setAnswerUnlocked(true)
  }, [])

  const advanceAfterReadingResponse = useCallback(() => {
    if (!plan || !preset) return
    track(ANALYTICS_EVENTS.reading_exam_next_clicked, {
      session_id: plan.sessionId,
      task_index: taskIndex + 1,
      exam_mode: 'training',
    })

    if (taskIndex + 1 >= plan.taskCount) {
      track(ANALYTICS_EVENTS.reading_exam_training_session_completed, {
        session_id: plan.sessionId,
        task_count: plan.taskCount,
        correct_count: correctCountRef.current,
        difficulty_preset: preset,
        exam_mode: 'training',
      })
      clearReadingPracticeExamAutosave()
      setPhase('session_complete')
      setDuoSelectedOptionId(null)
      return
    }

    setRetentionReward(null)
    setTaskIndex((i) => i + 1)
    setAnswerUnlocked(plan.flowMode === 'duo_practice_exam')
    setDuoSelectedOptionId(null)
    setEvalResult(null)
    setPhase('task')
    taskMetaRef.current = null
  }, [plan, taskIndex, preset, clearReadingPracticeExamAutosave])

  const processReadingMcqForCurrentTask = useCallback(
    (optionId: string, outcome: 'show_result' | 'advance') => {
      if (!item || !plan || !preset) return

      if (outcome === 'advance' && plan.flowMode === 'duo_practice_exam') {
        const prevId = duoCommittedOptionByTaskIndexRef.current.get(taskIndex)
        if (prevId != null) {
          const prevRes = evaluateReadingMcq({ item, selectedOptionId: prevId })
          if (prevRes.correct) {
            setCorrectCount((c) => c - 1)
            correctCountRef.current -= 1
          }
        }
      }

      const viewedAt = taskViewedAtRef.current
      const durationMs = viewedAt != null ? Math.max(0, Date.now() - viewedAt) : undefined

      track(ANALYTICS_EVENTS.reading_exam_answer_selected, {
        task_id: item.id,
        reading_skill: readingSkillAnalyticsValue(item.readingSkill),
        option_id: optionId,
        difficulty_preset: preset,
        exam_mode: 'training',
      })

      const res = evaluateReadingMcq({ item, selectedOptionId: optionId })

      track(ANALYTICS_EVENTS.reading_exam_answer_submitted, {
        task_id: item.id,
        reading_skill: readingSkillAnalyticsValue(item.readingSkill),
        correct: res.correct,
        difficulty_preset: preset,
        exam_mode: 'training',
        ...(durationMs != null ? { duration_ms: durationMs } : {}),
      })

      const submittedAt = new Date().toISOString()
      applyExamLearningLoopClient({
        kind: 'reading',
        itemId: item.id,
        attemptId: `${plan.sessionId}-${item.id}-${submittedAt}`,
        readingSkill: item.readingSkill,
        correct: res.correct,
      })

      setCorrectCount((c) => c + (res.correct ? 1 : 0))
      if (res.correct) correctCountRef.current += 1

      if (outcome === 'advance' && plan.flowMode === 'duo_practice_exam') {
        duoCommittedOptionByTaskIndexRef.current.set(taskIndex, optionId)
      }

      if (outcome === 'advance') {
        advanceAfterReadingResponse()
        return
      }
      setEvalResult(res)
      setPhase('result')
      resultViewedRef.current = false
      integrationRef.current = false
    },
    [item, plan, preset, taskIndex, advanceAfterReadingResponse]
  )

  const submitAnswer = useCallback(
    (optionId: string) => {
      if (!plan || plan.flowMode === 'duo_practice_exam') return
      if (!answerUnlocked) return
      processReadingMcqForCurrentTask(optionId, 'show_result')
    },
    [plan, answerUnlocked, processReadingMcqForCurrentTask]
  )

  const selectDuoReadingOption = useCallback((optionId: string) => {
    if (plan?.flowMode !== 'duo_practice_exam') return
    setDuoSelectedOptionId(optionId)
  }, [plan?.flowMode])

  const confirmDuoReadingAnswer = useCallback(() => {
    if (!plan || plan.flowMode !== 'duo_practice_exam' || !duoSelectedOptionId) return
    processReadingMcqForCurrentTask(duoSelectedOptionId, 'advance')
  }, [plan, duoSelectedOptionId, processReadingMcqForCurrentTask])

  const goToPreviousDuoReadingTask = useCallback(() => {
    if (!plan || plan.flowMode !== 'duo_practice_exam' || phase !== 'task') return
    if (taskIndex <= 0) return
    setTaskIndex((i) => i - 1)
  }, [plan, phase, taskIndex])

  useEffect(() => {
    if (phase !== 'result' || !evalResult || !item || !plan || resultViewedRef.current) return
    resultViewedRef.current = true
    track(ANALYTICS_EVENTS.reading_exam_result_viewed, {
      task_id: item.id,
      reading_skill: readingSkillAnalyticsValue(item.readingSkill),
      correct: evalResult.correct,
      difficulty_preset: preset,
      exam_mode: 'training',
    })
  }, [phase, evalResult, item, plan, preset])

  useEffect(() => {
    if (phase !== 'result' || !evalResult || !item || integrationRef.current) return
    integrationRef.current = true
    const userId = getRetentionUserId()
    const outcome: SessionOutcome = evalResult.correct ? 'success' : 'partial'
    const meta = recordExamPrepActivityComplete({
      userId,
      kind: 'reading_training_task',
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

  const goNext = useCallback(() => {
    advanceAfterReadingResponse()
  }, [advanceAfterReadingResponse])

  const resetToIntro = useCallback(() => {
    setRetentionReward(null)
    setPhase('intro')
    setPreset(null)
    setPlan(null)
    setTaskIndex(0)
    setEvalResult(null)
    setCorrectCount(0)
    correctCountRef.current = 0
    taskMetaRef.current = null
    duoCommittedOptionByTaskIndexRef.current.clear()
    setDuoSelectedOptionId(null)
    practiceExamSetIdRef.current = null
  }, [])

  const discardReadingPracticeExamDraft = useCallback((examSetId: string) => {
    const uid = getRetentionUserId()
    removeAutosaveDraft(uid, readingPracticeExamDraftKey(examSetId), 'exam', examSetId, 'discard')
  }, [])

  const sessionKey = useMemo(() => `${plan?.sessionId ?? 'na'}-${taskIndex}-${item?.id ?? 'x'}`, [plan?.sessionId, taskIndex, item?.id])

  return {
    phase,
    preset,
    plan,
    item,
    taskIndex,
    answerUnlocked,
    duoSelectedOptionId,
    evalResult,
    correctCount,
    sessionStartedAtIso,
    sessionKey,
    startSession,
    startWithFixedPlan,
    hydrateReadingPracticeExamSnapshot,
    discardReadingPracticeExamDraft,
    unlockAnswers,
    submitAnswer,
    selectDuoReadingOption,
    confirmDuoReadingAnswer,
    goToPreviousDuoReadingTask,
    goNext,
    resetToIntro,
    retentionReward,
    globalRemainingSec,
    sessionEndedByTimer,
  }
}
