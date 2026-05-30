/**
 * In-memory aggregate view of mutable learner progress (see `buildLearnerProgressSnapshot`).
 * Domain payloads remain in their existing user-scoped localStorage keys; this shape is the app-level contract.
 */

import type { MissionRuntimeState } from '@/lib/schemas/practice/missionRuntimeState.schema'
import type {
  LearningUiPreferencesV1,
  ProgressManifestV1,
} from '@/lib/storage/storageTypes'

export const LEARNER_PROGRESS_SNAPSHOT_VERSION = 1 as const

export type LessonsProgressSliceV1 = {
  completedLessonIds: string[]
  completedModuleIds: string[]
  abilityUnlockCount: number
  milestonesSeenCount: number
}

export type PracticeProgressSliceV1 = {
  scenariosWithAnyProgress: number
  qualifyingSuccessScenarioCount: number
  practiceUnlockedScenarioCount: number
  skillTracksWithProgress: number
  skillTrackSessionsCompletedTotal: number
  abilityMasteryTrackedCount: number
}

export type ReviewProgressSliceV1 = {
  bankItemCount: number
  srsItemCount: number
  mistakeEventCount: number
  masteryVocabCount: number
  masteryGrammarCount: number
}

export type ExamsProgressSliceV1 = {
  practiceExamAttemptCount: number
  kmnTopicsWithActivity: number
  readinessAttemptCount: number
}

export type MissionsProgressSliceV1 = {
  runtime: MissionRuntimeState | null
}

export type EngagementProgressSliceV1 = {
  totalXp: number
  streakCurrent: number
  streakLongest: number
  lastActiveLocalDate: string | null
  weeklyXp: number
  weekKey: string
}

export type LearningSettingsProgressSliceV1 = {
  /** From progress manifest (`learningUi`). */
  learningUi: LearningUiPreferencesV1 | undefined
  /** Post-A2 routing hints stored on retention metadata (mutable journey). */
  postA2PathwayChoice: string | null
  postA2PathwayChosenAt: string | null
}

export type ReadinessProgressSliceV1 = {
  schemaMistakePatternKeysEstimate: number
}

export type ActiveLearningSliceV1 = {
  hasActiveExamSession: boolean
  activeLessonStateKeys: number
  writingDraftCount: number
}

/**
 * Full in-memory snapshot for the active user after bootstrap or refresh.
 */
export type LearnerProgressSnapshotV1 = {
  snapshotVersion: typeof LEARNER_PROGRESS_SNAPSHOT_VERSION
  userId: string
  builtAt: string
  manifest: ProgressManifestV1
  lessons: LessonsProgressSliceV1
  practice: PracticeProgressSliceV1
  review: ReviewProgressSliceV1
  exams: ExamsProgressSliceV1
  missions: MissionsProgressSliceV1
  engagement: EngagementProgressSliceV1
  learningSettings: LearningSettingsProgressSliceV1
  readiness: ReadinessProgressSliceV1
  active: ActiveLearningSliceV1
}

export type { LearningUiPreferencesV1 } from '@/lib/storage/storageTypes'
