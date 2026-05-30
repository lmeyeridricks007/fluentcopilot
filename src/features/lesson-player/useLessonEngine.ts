'use client'

import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import type { SchemaLessonBundle } from '@/lib/lesson-engine/engine'
import { extractAndEnqueueReview } from '@/lib/lesson-engine/reviewExtractor'
import type { LessonStep } from '@/lib/schemas/lessonStep.schema'
import { recordLessonComplete } from '@/lib/retention/retentionService'
import type { LessonCompleteMeta } from '@/lib/retention/retentionService'
import { refreshProgressAfterDomainWrite } from '@/lib/persistence'
import {
  clearSchemaLessonCheckpoint,
  loadSchemaLessonCheckpoint,
  saveSchemaLessonCheckpoint,
} from '@/lib/storage/schemaLessonCheckpoint'
import { useAuthStore } from '@/store/authStore'
import { getRetentionUserId } from '@/lib/retention/retentionService'

export function useLessonEngine(bundle: SchemaLessonBundle) {
  const { lesson, moduleCatalog } = bundle
  const userId = useAuthStore((s) => s.user?.id ?? '')
  const [stepIndex, setStepIndex] = useState(0)
  const [finished, setFinished] = useState(false)
  const [completionMeta, setCompletionMeta] = useState<LessonCompleteMeta | null>(null)

  useEffect(() => {
    setStepIndex(0)
    setFinished(false)
    setCompletionMeta(null)
  }, [lesson.id])

  useLayoutEffect(() => {
    if (!userId) return
    const restored = loadSchemaLessonCheckpoint(userId, lesson.id)
    if (restored != null && restored < lesson.steps.length) {
      setStepIndex(restored)
    }
  }, [userId, lesson.id, lesson.steps.length])

  const totalSteps = lesson.steps.length
  const step = lesson.steps[stepIndex] as LessonStep

  useEffect(() => {
    if (finished) return
    track(ANALYTICS_EVENTS.schema_lesson_step_started, {
      lessonId: lesson.id,
      stepId: step.id,
      stepType: step.type,
      stepIndex,
    })
  }, [finished, lesson.id, step.id, step.type, stepIndex])

  useEffect(() => {
    if (!userId || finished) return
    saveSchemaLessonCheckpoint(userId, lesson.id, stepIndex)
  }, [userId, lesson.id, stepIndex, finished])

  const goNext = useCallback(() => {
    setStepIndex((i) => {
      if (i >= totalSteps - 1) return i
      const sid = lesson.steps[i]?.id ?? 'unknown'
      track(ANALYTICS_EVENTS.schema_lesson_step_completed, {
        lessonId: lesson.id,
        stepId: sid,
        stepIndex: i,
      })
      return i + 1
    })
  }, [lesson.id, lesson.steps, totalSteps])

  const goBack = useCallback(() => {
    setStepIndex((i) => (i <= 0 ? i : i - 1))
  }, [])

  const completeLesson = useCallback(async () => {
    track(ANALYTICS_EVENTS.schema_lesson_step_completed, {
      lessonId: lesson.id,
      stepId: step.id,
      stepIndex,
    })
    track(ANALYTICS_EVENTS.schema_lesson_completed, {
      lessonId: lesson.id,
      durationEstimate: lesson.durationEstimate,
    })
    extractAndEnqueueReview(lesson, moduleCatalog)
    if (userId) clearSchemaLessonCheckpoint(userId, lesson.id)
    const meta = recordLessonComplete({
      lessonId: lesson.id,
      moduleId: lesson.moduleId,
      lessonTitle: lesson.title,
    })
    refreshProgressAfterDomainWrite(getRetentionUserId())
    setCompletionMeta(meta)
    setFinished(true)
  }, [lesson, moduleCatalog, step.id, stepIndex, userId])

  const scheduleAdvance = useCallback(
    (ms: number) => {
      window.setTimeout(() => {
        setStepIndex((i) => {
          if (i >= totalSteps - 1) return i
          const sid = lesson.steps[i]?.id ?? 'unknown'
          track(ANALYTICS_EVENTS.schema_lesson_step_completed, {
            lessonId: lesson.id,
            stepId: sid,
            stepIndex: i,
          })
          return i + 1
        })
      }, ms)
    },
    [lesson.id, lesson.steps, totalSteps]
  )

  return {
    lesson,
    moduleCatalog,
    step,
    stepIndex,
    totalSteps,
    finished,
    completionMeta,
    goNext,
    goBack,
    completeLesson,
    scheduleAdvance,
  }
}
