import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { appendPracticeExamAttempt } from '@/lib/exam-prep/practice-exams/practiceExamAttemptService'
import type { PracticeExamAttemptStored } from '@/lib/exam-prep/practice-exams/types'
import { buildLearnerProgressSnapshot } from './buildLearnerProgressSnapshot'
import { useLearnerProgressStore } from './progressStore'
import { loadOrInitializeProgressForUser, getUserProgress, setUserProgress } from '@/lib/storage/progressStorage'
import type { LearningUiPreferencesV1, ProgressManifestV1 } from '@/lib/storage/storageTypes'
import { useAuthStore } from '@/store/authStore'
import { recordLessonComplete, type LessonCompleteMeta } from '@/lib/retention/retentionService'

/** Last userId for which we finalized progress (kept across sign-out so the next login can emit `user_progress_switched`). */
let lastFinalizedProgressUserId: string | null = null

export function beginLearnerProgressHydration(userId: string): void {
  useLearnerProgressStore.getState().beginHydration(userId)
}

export function clearLearnerProgressStore(): void {
  useLearnerProgressStore.getState().clear()
}

/**
 * Re-read all domain stores and refresh the in-memory snapshot for `userId` (default: current session user).
 */
export function refreshLearnerProgressSnapshot(userId?: string): void {
  const uid = userId ?? useAuthStore.getState().user?.id
  if (!uid) return
  const store = useLearnerProgressStore.getState()
  if (store.userId !== null && store.userId !== uid) return

  const manifest = getUserProgress(uid) ?? loadOrInitializeProgressForUser(uid).root
  const snapshot = buildLearnerProgressSnapshot(uid, manifest)
  store.hydrate(uid, snapshot)
}

export function finalizeLearnerProgressHydration(userId: string, manifest: ProgressManifestV1): void {
  const prev = lastFinalizedProgressUserId
  const snapshot = buildLearnerProgressSnapshot(userId, manifest)
  useLearnerProgressStore.getState().hydrate(userId, snapshot)

  if (typeof window !== 'undefined') {
    if (prev !== null && prev !== userId) {
      track(ANALYTICS_EVENTS.user_progress_switched, {
        previous_user_id: prev,
        user_id: userId,
      })
    }
    lastFinalizedProgressUserId = userId
    track(ANALYTICS_EVENTS.user_progress_hydrated, { user_id: userId })
  }
}

export function mergeLearningUiPreferences(
  userId: string,
  patch: Partial<LearningUiPreferencesV1>
): ProgressManifestV1 | null {
  const base = getUserProgress(userId) ?? loadOrInitializeProgressForUser(userId).root
  const next: ProgressManifestV1 = {
    ...base,
    learningUi: { ...base.learningUi, ...patch },
  }
  setUserProgress(next)
  refreshLearnerProgressSnapshot(userId)
  if (typeof window !== 'undefined') {
    track(ANALYTICS_EVENTS.progress_updated, { user_id: userId, domain: 'learning_ui' })
  }
  return next
}

export function markLessonComplete(input: {
  lessonId: string
  moduleId: string
  lessonTitle: string
  userId?: string
}): LessonCompleteMeta | null {
  const userId = input.userId ?? useAuthStore.getState().user?.id
  if (!userId) return null
  const meta = recordLessonComplete({
    userId,
    lessonId: input.lessonId,
    moduleId: input.moduleId,
    lessonTitle: input.lessonTitle,
  })
  refreshLearnerProgressSnapshot(userId)
  if (typeof window !== 'undefined') {
    track(ANALYTICS_EVENTS.progress_updated, { user_id: userId, domain: 'lessons' })
  }
  return meta
}

export function recordPracticeExamAttemptAndRefresh(
  row: Omit<PracticeExamAttemptStored, 'id'>
): PracticeExamAttemptStored {
  const full = appendPracticeExamAttempt(row)
  refreshLearnerProgressSnapshot()
  const uid = useAuthStore.getState().user?.id
  if (typeof window !== 'undefined' && uid) {
    track(ANALYTICS_EVENTS.progress_updated, { user_id: uid, domain: 'exams' })
  }
  return full
}

/** After any domain module writes progress (review, missions, scenarios, etc.), call this to keep the store fresh. */
export function notifyProgressDomainChanged(userId?: string): void {
  refreshLearnerProgressSnapshot(userId)
}
