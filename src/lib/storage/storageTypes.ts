import type { OnboardingData } from '@/store/onboardingStore'

export const USER_PROFILE_SCHEMA_VERSION = 1 as const
export const PROGRESS_MANIFEST_SCHEMA_VERSION = 1 as const
export const DRAFTS_DOCUMENT_SCHEMA_VERSION = 1 as const
export const SESSION_DOCUMENT_SCHEMA_VERSION = 1 as const

/** Optional sync metadata — placeholders for future server reconciliation. */
export type StorageSyncMetaV1 = {
  documentVersion: 1
  lastSyncedAt?: string
  serverRevision?: string
  dirty?: boolean
}

/**
 * Structured study rhythm / commitment — stable ids for recommendations (not display copy).
 * @see docs/product/onboarding-profile-persistence.md
 */
export type RoutinePreferencesV1 = {
  studyRhythmId: string
  dailyMinutesCommitted?: number
}

/** Last resolved first in-app experience after onboarding (analytics + future overrides). */
export type OnboardingStartExperiencePersistedV1 = {
  pathwayKey: string
  route: string
  emphasis: string
  decisionTrace: string
  welcomeHeadline: string
  welcomeSubline: string
  resolvedAt: string
  targetPath?: string
  primaryGoal?: string
  learningReason?: string
}

/**
 * Durable per-user profile: stable identity, onboarding, and learning preferences.
 * Heavy activity history belongs in progress domains, not here.
 */
export type UserProfileDocumentV1 = {
  schemaVersion: typeof USER_PROFILE_SCHEMA_VERSION
  userId: string
  createdAt: string
  updatedAt: string
  /** Explicit lifecycle flag — never infer from “some onboarding fields exist”. */
  onboardingComplete: boolean
  onboardingStep: number
  /** Raw step answers (v2 + legacy). Prefer top-level signal ids + `readPersonalizationSnapshot` for reads. */
  onboardingData: Partial<OnboardingData>
  /** ISO timestamp when onboarding was finished; absent while incomplete or legacy profiles. */
  onboardingCompletedAt?: string
  /** Primary goal option id (e.g. everyday_dutch). */
  primaryGoalId?: string
  /** Selected goals — today one id from primary goal; extensible for multi-select. */
  learnerGoals?: string[]
  /** Self-reported level option id before CEFR normalization (e.g. a2, not_sure). */
  currentLevelSelfReportId?: string
  /** Motivation / reason option id from onboarding. */
  learningReasonId?: string
  /** Target pathway id (a2 | a2_mastery | exam_prep | b1); alias concept: targetPath. */
  selectedPath?: string
  /** Normalized CEFR band for routing (derived from self-report when present). */
  currentLevel?: string
  desiredLevel?: string
  /** Focus skill / area ids (stable). */
  focusAreas?: string[]
  studyRhythm?: string
  routinePreferences?: RoutinePreferencesV1
  /** Snapshot of personalized entry right after onboarding (not a navigation lock). */
  onboardingStartExperienceV1?: OnboardingStartExperiencePersistedV1
  /** When the user first saw the post-onboarding handoff banner (optional future use). */
  firstPersonalizedHandoffShownAt?: string
  displayName?: string
  email?: string
  plan?: string
  betaAccessAllowed?: boolean
  /** Mirrors session auth source; persisted for reconciliation with server auth later. */
  authProviderType?: string
  preferences?: Record<string, unknown>
  /**
   * True from first durable init until onboarding completes. Used for first-time UX;
   * when absent on legacy profiles, derive `!onboardingComplete`.
   */
  isNewUser?: boolean
  /** ISO time of first successful cold-start init for this account on this device. */
  firstLoginAt?: string
  syncMeta?: StorageSyncMetaV1
}

/** Registry of logical keys where domain-specific progress payloads live. */
export type ProgressDomainsRegistryV1 = {
  retentionProfile: string
  reviewBank: string
  reviewSrs: string
  reviewMistakes: string
  reviewMastery: string
  abilityMastery: string
  missionRuntime: string
  schemaMistakesPattern: string
}

/**
 * Mutable learning/usage preferences stored on the progress manifest (not stable profile).
 * See `docs/product/progress-state-layer.md`.
 */
export type LearningUiPreferencesV1 = {
  preferredPracticeInputMode?: 'typing' | 'speaking'
  preferredScenarioMode?: string
  lessonContinuation?: 'resume' | 'restart'
  audioReplayEnabled?: boolean
  lastActiveFocusSurface?: string
  dismissedRecommendationIds?: string[]
}

/**
 * Top-level progress manifest per user: metadata + domain key registry.
 * Individual domains (retention, SRS, etc.) remain separate blobs for incremental updates.
 */
export type ProgressManifestV1 = {
  schemaVersion: typeof PROGRESS_MANIFEST_SCHEMA_VERSION
  userId: string
  createdAt: string
  updatedAt: string
  domains: ProgressDomainsRegistryV1
  /** Learning-facing UI preferences (device-local, mutable). */
  learningUi?: LearningUiPreferencesV1
  syncMeta?: StorageSyncMetaV1
}

/**
 * Drafts and resumable UI state — disposable; must not be the only copy of completed work.
 * Onboarding step/data draft remains on `UserProfileDocumentV1` until migrated.
 */
export type DraftsDocumentV1 = {
  schemaVersion: typeof DRAFTS_DOCUMENT_SCHEMA_VERSION
  userId: string
  updatedAt: string
  writingDrafts?: Record<string, { updatedAt: string; payload: unknown }>
  activeExamSession?: unknown
  activeLessonState?: Record<string, unknown>
  /** Intentionally empty — onboarding draft lives on the profile document in v1. */
  onboardingDraftLocation?: 'profile'
  syncMeta?: StorageSyncMetaV1
}

/**
 * Logical session view derived from the Zustand auth persist envelope (`auth-storage`).
 * Not a second on-disk document — see `authPersistStorage.ts`.
 */
export type SessionDocumentV1 = {
  schemaVersion: typeof SESSION_DOCUMENT_SCHEMA_VERSION
  updatedAt: string
  userId: string
  email: string
  displayName: string
  plan?: string
  authProviderType?: string
  loginAt?: string
  betaAccessAllowed: boolean
  onboardingComplete: boolean
  zustandPersistVersion?: number
}
