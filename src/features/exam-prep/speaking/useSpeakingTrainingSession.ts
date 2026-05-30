'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  buildSpeakingTrainingSessionPlan,
  DEFAULT_SPEAKING_TRAINING_SESSION_SIZE,
  type SpeakingTrainingSessionPlan,
} from '@/lib/exam-prep/speaking/speakingSessionBuilder'
import { evaluateSpeakingTrainingSubmission } from '@/lib/exam-prep/speaking/speakingEvaluationService'
import { buildSpeakingSessionSummaryUi, type SpeakingSessionSummaryUi } from '@/lib/exam-prep/speaking/speakingSessionSummaryBuilder'
import type { SpeakingScenarioGroupId } from '@/lib/schemas/exam/speakingTrainingItem.schema'
import type { SpeakingTrainingItem } from '@/lib/schemas/exam/speakingTrainingItem.schema'
import type {
  SpeakingInputMode,
  SpeakingTrainingEvaluationBundle,
  SpeakingTrainingPhase,
} from '@/lib/exam-prep/speaking/types'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { applyExamLearningLoopClient } from '@/lib/exam-learning-loop/examMistakeExtractor'
import { categoryAveragesToScores } from '@/lib/missions/examPrepMissionHelpers'
import type { ExamPrepRetentionSummary } from '@/lib/exam-rewards/types'
import { getRetentionUserId, recordExamPrepActivityComplete } from '@/lib/retention/retentionService'
import type { SessionOutcome } from '@/lib/practice-feedback/types'
import { recordAbilityScenarioSignal } from '@/lib/mastery/recordAbilitySignals'

const SCENARIO_ID = 'exam_speaking_training'

function sessionOutcomeFromSummary(summary: SpeakingSessionSummaryUi): SessionOutcome {
  const n = summary.plan.questionCount
  if (summary.passesCount >= Math.ceil(n * 0.66)) return 'success'
  if (summary.averageNormalizedPercent >= 48) return 'partial'
  return 'needs_practice'
}

export function useSpeakingTrainingSession() {
  const [retentionReward, setRetentionReward] = useState<ExamPrepRetentionSummary | null>(null)
  const [phase, setPhase] = useState<SpeakingTrainingPhase>('intro')
  const [plan, setPlan] = useState<SpeakingTrainingSessionPlan | null>(null)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [questionStartedAt, setQuestionStartedAt] = useState<string | null>(null)
  const [completedBundles, setCompletedBundles] = useState<SpeakingTrainingEvaluationBundle[]>([])
  const [lastBundle, setLastBundle] = useState<SpeakingTrainingEvaluationBundle | null>(null)
  const [sessionSummary, setSessionSummary] = useState<SpeakingSessionSummaryUi | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const lastQuestionViewedRef = useRef<string | null>(null)
  const sessionAnalyticsRef = useRef({ started: false, completed: false })
  const summaryIntegrationRef = useRef(false)

  const item: SpeakingTrainingItem | null = plan?.questions[questionIndex] ?? null

  useEffect(() => {
    if (phase !== 'prompt' && phase !== 'input') return
    if (!item || !plan) return
    const key = `${plan.sessionId}-${questionIndex}-${item.id}`
    if (lastQuestionViewedRef.current === key) return
    lastQuestionViewedRef.current = key
    track(ANALYTICS_EVENTS.speaking_exam_question_viewed, {
      question_id: item.id,
      question_subtype: item.subtype,
      question_index: questionIndex + 1,
      question_total: plan.questionCount,
      scenario_group: plan.scenarioGroupId,
      difficulty_band: item.difficultyBand,
      exam_mode: 'training',
    })
  }, [phase, item, plan, questionIndex])

  const startSession = useCallback((groupId: SpeakingScenarioGroupId) => {
    const p = buildSpeakingTrainingSessionPlan({
      scenarioGroupId: groupId,
      questionCount: DEFAULT_SPEAKING_TRAINING_SESSION_SIZE,
      seed: Date.now(),
    })
    setPlan(p)
    setQuestionIndex(0)
    setQuestionStartedAt(null)
    setCompletedBundles([])
    setLastBundle(null)
    setSessionSummary(null)
    setSubmitError(null)
    setPhase('prompt')
    sessionAnalyticsRef.current = { started: true, completed: false }
    summaryIntegrationRef.current = false
    lastQuestionViewedRef.current = null
    track(ANALYTICS_EVENTS.speaking_exam_session_started, {
      session_id: p.sessionId,
      scenario_group: p.scenarioGroupId,
      question_count: p.questionCount,
      exercise_refs: p.exerciseRefs,
      exam_mode: 'training',
    })
  }, [])

  const beginAnswering = useCallback(() => {
    if (!item) return
    setQuestionStartedAt(new Date().toISOString())
    setPhase('input')
    track(ANALYTICS_EVENTS.speaking_exam_started, {
      question_id: item.id,
      question_subtype: item.subtype,
      question_index: questionIndex + 1,
      scenario_group: plan?.scenarioGroupId,
      exam_mode: 'training',
    })
  }, [item, plan?.scenarioGroupId, questionIndex])

  const submitAnswer = useCallback(
    (input: { text: string; inputMode: SpeakingInputMode; transcriptConfidence?: number }) => {
      if (!item || !plan || !questionStartedAt) {
        setSubmitError('Sessiefout — begin opnieuw.')
        return
      }
      const t = input.text.trim()
      if (!t) {
        setSubmitError('Schrijf of spreek eerst een antwoord in het Nederlands.')
        return
      }
      setSubmitError(null)
      const submittedAt = new Date().toISOString()
      track(ANALYTICS_EVENTS.speaking_exam_answer_submitted, {
        question_id: item.id,
        question_subtype: item.subtype,
        question_index: questionIndex + 1,
        question_total: plan.questionCount,
        input_mode: input.inputMode,
        scenario_group: plan.scenarioGroupId,
        difficulty_band: item.difficultyBand,
        exam_mode: 'training',
        word_count: t.split(/\s+/).filter(Boolean).length,
      })
      let bundle: SpeakingTrainingEvaluationBundle
      try {
        bundle = evaluateSpeakingTrainingSubmission({
          item,
          responseText: t,
          inputMode: input.inputMode,
          transcriptConfidence: input.transcriptConfidence,
          startedAtIso: questionStartedAt,
          submittedAtIso: submittedAt,
        })
      } catch {
        setSubmitError('Kon je antwoord niet beoordelen. Probeer opnieuw.')
        return
      }
      setLastBundle(bundle)
      setPhase('question_compact')
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
        coach_corrections_count: bundle.coach.corrections.length,
        scenario_group: plan.scenarioGroupId,
        difficulty_band: item.difficultyBand,
        exam_mode: 'training',
      })
      applyExamLearningLoopClient({ kind: 'speaking_training', bundle })

      track(ANALYTICS_EVENTS.speaking_exam_question_completed, {
        session_id: plan.sessionId,
        question_id: item.id,
        question_index: questionIndex + 1,
        question_total: plan.questionCount,
        normalized_percent: bundle.engine.normalizedPercent,
        pass: bundle.engine.pass,
        input_mode: input.inputMode,
        scenario_group: plan.scenarioGroupId,
        difficulty_band: item.difficultyBand,
        exam_mode: 'training',
      })
    },
    [item, plan, questionIndex, questionStartedAt]
  )

  const continueAfterCompact = useCallback(() => {
    if (!lastBundle || !plan) return
    const nextCompleted = [...completedBundles, lastBundle]
    setCompletedBundles(nextCompleted)
    setLastBundle(null)
    setQuestionStartedAt(null)

    if (questionIndex + 1 >= plan.questionCount) {
      const summary = buildSpeakingSessionSummaryUi({ plan, bundles: nextCompleted })
      setSessionSummary(summary)
      setPhase('session_summary')
      track(ANALYTICS_EVENTS.speaking_exam_session_completed, {
        session_id: plan.sessionId,
        scenario_group: plan.scenarioGroupId,
        question_count: plan.questionCount,
        average_normalized_percent: summary.averageNormalizedPercent,
        passes_count: summary.passesCount,
        confidence_percent: summary.confidence.percent,
        exam_mode: 'training',
      })
    } else {
      setQuestionIndex((i) => i + 1)
      setPhase('prompt')
    }
  }, [completedBundles, lastBundle, plan, questionIndex])

  const retryCurrentQuestion = useCallback(() => {
    if (!item) return
    track(ANALYTICS_EVENTS.speaking_exam_retry_clicked, {
      question_id: item.id,
      question_index: questionIndex + 1,
      session_id: plan?.sessionId,
      exam_mode: 'training',
    })
    setLastBundle(null)
    setQuestionStartedAt(null)
    setPhase('prompt')
    setSubmitError(null)
  }, [item, plan?.sessionId, questionIndex])

  const cancelAnswering = useCallback(() => {
    setPhase('prompt')
    setQuestionStartedAt(null)
    setSubmitError(null)
  }, [])

  useEffect(() => {
    if (phase !== 'session_summary' || !sessionSummary || summaryIntegrationRef.current) return
    summaryIntegrationRef.current = true
    track(ANALYTICS_EVENTS.speaking_exam_session_summary_viewed, {
      session_id: sessionSummary.plan.sessionId,
      scenario_group: sessionSummary.plan.scenarioGroupId,
      average_normalized_percent: sessionSummary.averageNormalizedPercent,
      confidence_percent: sessionSummary.confidence.percent,
      exam_mode: 'training',
    })
    const userId = getRetentionUserId()
    const outcome = sessionOutcomeFromSummary(sessionSummary)
    const meta = recordExamPrepActivityComplete({
      userId,
      kind: 'speaking_training_session',
      scenarioId: SCENARIO_ID,
      outcome,
      averageNormalizedPercent: sessionSummary.averageNormalizedPercent,
      passesCount: sessionSummary.passesCount,
      questionCount: sessionSummary.plan.questionCount,
      categoryScores: categoryAveragesToScores(sessionSummary.categoryAverages),
    })
    setRetentionReward(meta.examPrep ?? null)
    recordAbilityScenarioSignal({
      userId,
      scenarioId: SCENARIO_ID,
      outcome,
    })
  }, [phase, sessionSummary])

  const backToIntro = useCallback(() => {
    setPhase('intro')
    setPlan(null)
    setQuestionIndex(0)
    setCompletedBundles([])
    setLastBundle(null)
    setSessionSummary(null)
    setQuestionStartedAt(null)
    setSubmitError(null)
    sessionAnalyticsRef.current = { started: false, completed: false }
    summaryIntegrationRef.current = false
    lastQuestionViewedRef.current = null
  }, [])

  const sessionKey = useMemo(
    () => `${plan?.sessionId ?? 'na'}-${questionIndex}-${item?.id ?? 'x'}-${phase}`,
    [plan?.sessionId, questionIndex, item?.id, phase]
  )

  return {
    phase,
    plan,
    item,
    questionIndex,
    questionStartedAt,
    lastBundle,
    sessionSummary,
    submitError,
    setSubmitError,
    sessionKey,
    startSession,
    beginAnswering,
    submitAnswer,
    continueAfterCompact,
    retryCurrentQuestion,
    cancelAnswering,
    backToIntro,
    retentionReward,
  }
}
