'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { pickWritingTrainingTask } from '@/lib/exam-prep/writing/writingTaskBuilder'
import { evaluateWritingTrainingSubmission } from '@/lib/exam-prep/writing/writingEvaluationService'
import type { WritingExerciseSubtype } from '@/lib/schemas/exam/writingExam.schema'
import type { WritingTrainingItem } from '@/lib/schemas/exam/writingTrainingItem.schema'
import type { WritingTrainingEvaluationBundle, WritingTrainingPhase } from '@/lib/exam-prep/writing/types'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { applyExamLearningLoopClient } from '@/lib/exam-learning-loop/examMistakeExtractor'
import { rubricRowsToCategoryScores } from '@/lib/missions/examPrepMissionHelpers'
import type { ExamPrepRetentionSummary } from '@/lib/exam-rewards/types'
import { getRetentionUserId, recordExamPrepActivityComplete } from '@/lib/retention/retentionService'
import type { SessionOutcome } from '@/lib/practice-feedback/types'
import { recordAbilityScenarioSignal } from '@/lib/mastery/recordAbilitySignals'
import { removeAutosaveDraft, writingTrainingTaskDraftKey } from '@/lib/autosave'

const SCENARIO_ID = 'exam_writing_training'

function outcomeFromEngine(pass: boolean, band: string): SessionOutcome {
  if (pass) return 'success'
  if (band === 'close') return 'partial'
  return 'needs_practice'
}

export function useWritingTrainingSession() {
  const [retentionReward, setRetentionReward] = useState<ExamPrepRetentionSummary | null>(null)
  const [phase, setPhase] = useState<WritingTrainingPhase>('category')
  const [category, setCategory] = useState<WritingExerciseSubtype | null>(null)
  const [item, setItem] = useState<WritingTrainingItem | null>(null)
  const [startedAt, setStartedAt] = useState<string | null>(null)
  const [result, setResult] = useState<WritingTrainingEvaluationBundle | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  /** Survives Strict Mode remounts so `startedAt` and analytics stay consistent per task. */
  const promptMetaRef = useRef<{ id: string; started: string } | null>(null)
  const feedbackTrackedRef = useRef(false)
  const integrationRef = useRef(false)

  const sessionKey = useMemo(() => `${item?.id ?? 'na'}-${phase}`, [item?.id, phase])

  const selectCategory = useCallback((subtype: WritingExerciseSubtype) => {
    track(ANALYTICS_EVENTS.writing_exam_category_selected, {
      writing_subtype: subtype,
      exam_mode: 'training',
    })
    setCategory(subtype)
    setItem(pickWritingTrainingTask(subtype, Date.now()))
    setStartedAt(null)
    setResult(null)
    setSubmitError(null)
    setPhase('prompt')
    promptMetaRef.current = null
    feedbackTrackedRef.current = false
    integrationRef.current = false
  }, [])

  useEffect(() => {
    if (phase !== 'prompt' || !item) return
    if (promptMetaRef.current?.id === item.id) {
      setStartedAt((s) => s ?? promptMetaRef.current!.started)
      return
    }
    const t0 = new Date().toISOString()
    promptMetaRef.current = { id: item.id, started: t0 }
    setStartedAt(t0)
    track(ANALYTICS_EVENTS.writing_exam_task_viewed, {
      task_id: item.id,
      writing_subtype: item.subtype,
      exam_mode: 'training',
    })
    track(ANALYTICS_EVENTS.writing_exam_started, {
      task_id: item.id,
      writing_subtype: item.subtype,
      exam_mode: 'training',
    })
  }, [phase, item])

  const submitAnswer = useCallback(
    (payload: { bodyText: string; fieldValues?: Record<string, string> }) => {
      if (!item || !startedAt) {
        setSubmitError('Sessiefout — kies opnieuw een opdracht.')
        return
      }
      setSubmitError(null)
      const submittedAt = new Date().toISOString()
      const composed = payload.bodyText.trim() || Object.values(payload.fieldValues ?? {}).join(' ').trim()
      if (composed.length < 1) {
        setSubmitError('Schrijf eerst een antwoord of vul de velden in.')
        return
      }

      track(ANALYTICS_EVENTS.writing_exam_answer_submitted, {
        task_id: item.id,
        writing_subtype: item.subtype,
        exam_mode: 'training',
        has_form: Boolean(item.formFields?.length),
        word_count: composed.split(/\s+/).filter(Boolean).length,
      })

      let bundle: WritingTrainingEvaluationBundle
      try {
        bundle = evaluateWritingTrainingSubmission({
          item,
          bodyText: payload.bodyText,
          fieldValues: payload.fieldValues,
          startedAtIso: startedAt,
          submittedAtIso: submittedAt,
        })
      } catch {
        setSubmitError('Kon uw tekst niet beoordelen. Probeer opnieuw.')
        return
      }

      setResult(bundle)
      setPhase('feedback')
      feedbackTrackedRef.current = false
      integrationRef.current = false

      const uid = getRetentionUserId()
      removeAutosaveDraft(uid, writingTrainingTaskDraftKey(item.id), 'writing', item.id, 'submit')

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
        exam_mode: 'training',
      })

      applyExamLearningLoopClient({ kind: 'writing_training', bundle })
    },
    [item, startedAt]
  )

  useEffect(() => {
    if (phase !== 'feedback' || !result) return
    if (feedbackTrackedRef.current) return
    feedbackTrackedRef.current = true
    track(ANALYTICS_EVENTS.writing_exam_feedback_viewed, {
      task_id: result.item.id,
      writing_subtype: result.item.subtype,
      normalized_percent: result.engine.normalizedPercent,
      exam_mode: 'training',
    })
  }, [phase, result])

  useEffect(() => {
    if (phase !== 'feedback' || !result || integrationRef.current) return
    integrationRef.current = true
    const userId = getRetentionUserId()
    const outcome = outcomeFromEngine(result.engine.pass, result.engine.exerciseOutcomeBand)
    const meta = recordExamPrepActivityComplete({
      userId,
      kind: 'writing_training_task',
      scenarioId: SCENARIO_ID,
      outcome,
      normalizedPercent: result.engine.normalizedPercent,
      pass: result.engine.pass,
      categoryScores: rubricRowsToCategoryScores(result.engine.rubricScores),
    })
    setRetentionReward(meta.examPrep ?? null)
    recordAbilityScenarioSignal({
      userId,
      scenarioId: SCENARIO_ID,
      outcome,
    })
  }, [phase, result])

  const retrySameTask = useCallback(() => {
    setRetentionReward(null)
    if (!item) return
    track(ANALYTICS_EVENTS.writing_exam_retry_clicked, {
      task_id: item.id,
      writing_subtype: item.subtype,
      exam_mode: 'training',
    })
    setResult(null)
    setStartedAt(null)
    setPhase('prompt')
    promptMetaRef.current = null
    feedbackTrackedRef.current = false
    integrationRef.current = false
  }, [item])

  const nextTaskSameCategory = useCallback(() => {
    setRetentionReward(null)
    if (!category) return
    if (item?.id) {
      const uid = getRetentionUserId()
      removeAutosaveDraft(uid, writingTrainingTaskDraftKey(item.id), 'writing', item.id, 'discard')
    }
    track(ANALYTICS_EVENTS.writing_exam_next_clicked, {
      writing_subtype: category,
      exam_mode: 'training',
    })
    setItem(pickWritingTrainingTask(category, Date.now()))
    setResult(null)
    setStartedAt(null)
    setPhase('prompt')
    promptMetaRef.current = null
    feedbackTrackedRef.current = false
    integrationRef.current = false
  }, [category, item?.id])

  const backToCategories = useCallback(() => {
    setRetentionReward(null)
    if (item?.id) {
      const uid = getRetentionUserId()
      removeAutosaveDraft(uid, writingTrainingTaskDraftKey(item.id), 'writing', item.id, 'discard')
    }
    setPhase('category')
    setCategory(null)
    setItem(null)
    setResult(null)
    setStartedAt(null)
    setSubmitError(null)
    promptMetaRef.current = null
    feedbackTrackedRef.current = false
    integrationRef.current = false
  }, [item?.id])

  return {
    phase,
    category,
    item,
    result,
    submitError,
    setSubmitError,
    sessionKey,
    selectCategory,
    submitAnswer,
    retrySameTask,
    nextTaskSameCategory,
    backToCategories,
    retentionReward,
  }
}
