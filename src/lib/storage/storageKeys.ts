/**
 * Canonical localStorage key builders. Prefer these over string literals so keys stay
 * deterministic, namespaced, and safe for multi-user isolation.
 */
import { RETENTION_STORAGE_KEY } from '@/lib/retention/constants'

/** Primary namespace for Language Tutor durable documents (devtools-friendly). */
export const STORAGE_NS = 'lt.v1' as const

/**
 * Zustand `persist` name for auth — kept as `auth-storage` for backward compatibility.
 * Do not rename without a keyed migration.
 */
export const AUTH_PERSIST_STORAGE_KEY = 'auth-storage' as const

/** @deprecated Use AUTH_PERSIST_STORAGE_KEY — alias for auth module exports. */
export const AUTH_STORAGE_KEY = AUTH_PERSIST_STORAGE_KEY

/** Per-user profile document (stable identity + onboarding + prefs). */
export function userProfileStorageKey(userId: string): string {
  return `${STORAGE_NS}.profile.${userId}`
}

/** Legacy profile key — read fallback only; canonical writes use `userProfileStorageKey`. */
export function legacyLearnerProfileStorageKey(userId: string): string {
  return `${STORAGE_NS}.learner-profile.${userId}`
}

/** Per-user progress manifest (registry + metadata; domain payloads live under their own keys). */
export function userProgressManifestStorageKey(userId: string): string {
  return `${STORAGE_NS}.progress.${userId}`
}

/** Legacy progress marker — read fallback only. */
export function legacyProgressRootStorageKey(userId: string): string {
  return `${STORAGE_NS}.progress-root.${userId}`
}

/** Disposable drafts / active session snapshots (never the SoT for completed progress). */
export function userDraftsStorageKey(userId: string): string {
  return `${STORAGE_NS}.drafts.${userId}`
}

/** Review engine v4 — per-user shards (existing production keys; centralized here). */
export const reviewStorageKeys = {
  bank: (userId: string) => `language-tutor-v4-review-bank-${userId}`,
  srs: (userId: string) => `language-tutor-v4-srs-${userId}`,
  mistakes: (userId: string) => `language-tutor-v4-mistakes-${userId}`,
  mastery: (userId: string) => `language-tutor-v4-mastery-${userId}`,
} as const

export function retentionProfileStorageKey(userId: string): string {
  return `${RETENTION_STORAGE_KEY}:${userId}`
}

export const abilityMasteryStorageKeys = {
  forUser: (userId: string) => `language-tutor-v4-ability-mastery-${userId}`,
} as const

export const missionStorageKeys = {
  runtimeForUser: (userId: string) => `language-tutor-mission-runtime-v1-${userId}`,
} as const

/** Documented in progress manifest `domains`; actual key uses current retention user id at runtime. */
export const SCHEMA_MISTAKES_KEY_PREFIX = 'language-tutor-schema-mistakes-v1:' as const

/**
 * Pre-auth / anonymous learner id — must match `DEFAULT_REVIEW_USER_ID` in `reviewPersistence.ts`.
 * Global (unsuffixed) localStorage keys use the base key only for this id.
 */
export const LOCAL_ANONYMOUS_LEARNER_ID = 'local-demo-user' as const

/** Authenticated users get an isolated key; anonymous demo keeps legacy unsuffixed keys. */
export function userScopedLocalKey(baseLocalStorageKey: string, userId: string): string {
  return userId === LOCAL_ANONYMOUS_LEARNER_ID ? baseLocalStorageKey : `${baseLocalStorageKey}:${userId}`
}

/** Base keys for practice / exam client state — paired with `userScopedLocalKey` for beta accounts. */
export const PRACTICE_DOMAIN_BASE_KEYS = {
  scenarioProgress: 'language-tutor-scenario-progress-v2',
  practiceExamAttempts: 'language-tutor-practice-exam-attempts-v1',
  kmnProgress: 'language-tutor-kmn-progress-v1',
  /** KNM exam simulation items saved from report for later MCQ practice (not words/phrases). */
  kmnSavedExamQuestions: 'language-tutor-kmn-saved-exam-questions-v1',
  examReadinessAttempts: 'language-tutor-exam-readiness-attempts-v1',
  skillTrackProgress: 'language-tutor-skill-track-progress-v1',
  practiceMilestoneSeen: 'language-tutor-practice-milestone-seen-v1',
  lastPracticeWeakSignals: 'language-tutor-last-practice-weak-signals-v1',
  practiceContinue: 'language-tutor-practice-continue-v1',
  a2ReviewQueue: 'language-tutor-a2-review-v1',
  a2WeakTags: 'language-tutor-a2-weak-tags-v1',
} as const

/**
 * All localStorage keys removed on first-login cold start for a beta `userId`.
 * Does not include `auth-storage` or device-level demo prefs.
 */
/**
 * Progress, retention, review, missions, practice-domain keys — **not** profile or drafts.
 * Used when clearing learning state while keeping learner profile document intact.
 */
export function progressRetentionWipeKeysForUser(userId: string): string[] {
  if (userId === LOCAL_ANONYMOUS_LEARNER_ID) return []
  const skip = new Set([
    userProfileStorageKey(userId),
    legacyLearnerProfileStorageKey(userId),
    userDraftsStorageKey(userId),
  ])
  return coldStartWipeKeysForUser(userId).filter((k) => !skip.has(k))
}

export function coldStartWipeKeysForUser(userId: string): string[] {
  if (userId === LOCAL_ANONYMOUS_LEARNER_ID) return []
  const b = PRACTICE_DOMAIN_BASE_KEYS
  return [
    userProfileStorageKey(userId),
    legacyLearnerProfileStorageKey(userId),
    userProgressManifestStorageKey(userId),
    legacyProgressRootStorageKey(userId),
    userDraftsStorageKey(userId),
    retentionProfileStorageKey(userId),
    reviewStorageKeys.bank(userId),
    reviewStorageKeys.srs(userId),
    reviewStorageKeys.mistakes(userId),
    reviewStorageKeys.mastery(userId),
    abilityMasteryStorageKeys.forUser(userId),
    missionStorageKeys.runtimeForUser(userId),
    `${SCHEMA_MISTAKES_KEY_PREFIX}${userId}`,
    userScopedLocalKey(b.scenarioProgress, userId),
    userScopedLocalKey(b.practiceExamAttempts, userId),
    userScopedLocalKey(b.kmnProgress, userId),
    userScopedLocalKey(b.kmnSavedExamQuestions, userId),
    userScopedLocalKey(b.examReadinessAttempts, userId),
    userScopedLocalKey(b.skillTrackProgress, userId),
    userScopedLocalKey(b.practiceMilestoneSeen, userId),
    userScopedLocalKey(b.lastPracticeWeakSignals, userId),
    userScopedLocalKey(b.practiceContinue, userId),
    userScopedLocalKey(b.a2ReviewQueue, userId),
    userScopedLocalKey(b.a2WeakTags, userId),
  ]
}
