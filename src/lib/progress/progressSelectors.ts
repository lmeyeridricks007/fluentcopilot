import type { LearnerProgressSnapshotV1 } from './progressTypes'

export function getLessonCompletionCount(snapshot: LearnerProgressSnapshotV1 | null): number {
  return snapshot?.lessons.completedLessonIds.length ?? 0
}

export function getTotalXp(snapshot: LearnerProgressSnapshotV1 | null): number {
  return snapshot?.engagement.totalXp ?? 0
}

export function getStreakCurrent(snapshot: LearnerProgressSnapshotV1 | null): number {
  return snapshot?.engagement.streakCurrent ?? 0
}

export function getReviewBankSize(snapshot: LearnerProgressSnapshotV1 | null): number {
  return snapshot?.review.bankItemCount ?? 0
}

export function isLessonCompleted(snapshot: LearnerProgressSnapshotV1 | null, lessonId: string): boolean {
  return snapshot?.lessons.completedLessonIds.includes(lessonId) ?? false
}

export function getMissionRuntime(snapshot: LearnerProgressSnapshotV1 | null) {
  return snapshot?.missions.runtime ?? null
}

export function getLearningUiPreferences(snapshot: LearnerProgressSnapshotV1 | null) {
  return snapshot?.learningSettings.learningUi
}
