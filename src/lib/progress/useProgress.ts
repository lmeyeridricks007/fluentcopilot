'use client'

import { useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useLearnerProgressStore } from './progressStore'
import {
  mergeLearningUiPreferences,
  markLessonComplete,
  notifyProgressDomainChanged,
  recordPracticeExamAttemptAndRefresh,
  refreshLearnerProgressSnapshot,
} from './progressActions'
import type { LearningUiPreferencesV1 } from '@/lib/storage/storageTypes'
import type { PracticeExamAttemptStored } from '@/lib/exam-prep/practice-exams/types'

/**
 * Consumer API for the mutable per-user progress layer (lessons, practice, review, exams, missions, engagement, learning UI prefs).
 * Disk remains canonical per domain; this hook exposes the hydrated aggregate + safe update entry points.
 */
export function useProgress() {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const status = useLearnerProgressStore((s) => s.status)
  const snapshot = useLearnerProgressStore((s) => s.snapshot)
  const storeUserId = useLearnerProgressStore((s) => s.userId)
  const error = useLearnerProgressStore((s) => s.error)
  const lastHydratedAt = useLearnerProgressStore((s) => s.lastHydratedAt)

  const aligned = Boolean(user?.id && storeUserId === user.id)
  const isProgressReady = aligned && status === 'ready' && snapshot != null
  const isProgressError = status === 'error'
  const isProgressLoading =
    isAuthenticated && !isProgressError && (!aligned || status === 'loading' || snapshot == null)

  const refresh = useCallback(() => {
    if (!user?.id) return
    refreshLearnerProgressSnapshot(user.id)
  }, [user?.id])

  const mergeLearningSettings = useCallback(
    (patch: Partial<LearningUiPreferencesV1>) => {
      if (!user?.id) return null
      return mergeLearningUiPreferences(user.id, patch)
    },
    [user?.id]
  )

  const completeLesson = useCallback(
    (input: { lessonId: string; moduleId: string; lessonTitle: string }) => {
      return markLessonComplete({ ...input, userId: user?.id })
    },
    [user?.id]
  )

  const recordExamAttempt = useCallback((row: Omit<PracticeExamAttemptStored, 'id'>) => {
    return recordPracticeExamAttemptAndRefresh(row)
  }, [])

  const notifyDomainChanged = useCallback(() => {
    notifyProgressDomainChanged(user?.id)
  }, [user?.id])

  return {
    progress: aligned ? snapshot : null,
    manifest: aligned ? snapshot?.manifest ?? null : null,
    isProgressReady,
    isProgressLoading,
    isProgressError,
    progressError: error,
    lastHydratedAt,
    refresh,
    mergeLearningSettings,
    markLessonComplete: completeLesson,
    recordPracticeExamAttempt: recordExamAttempt,
    notifyDomainChanged,
  }
}
