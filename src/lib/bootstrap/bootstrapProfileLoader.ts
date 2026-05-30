import type { LearnerProfileRecord } from './types'
import {
  createDefaultUserProfile,
  createNewBetaUserProfile,
  getUserProfile,
} from '@/lib/storage/profileStorage'
import { persistLearnerProfileDocument } from '@/lib/profile/profileActions'
import {
  legacyLearnerProfileStorageKey,
  userProfileStorageKey,
} from '@/lib/storage/storageKeys'
import { dailyMinutesFromRhythm, optionLabel, PRIMARY_GOAL_OPTIONS } from '@/features/onboarding/onboardingOptions'
import { mergeOnboardingAnswersIntoProfileDocument } from '@/lib/profile/profileUpdates'
import {
  diffOnboardingProfileSignals,
  listPopulatedOnboardingSignalFields,
} from '@/lib/profile/profileSelectors'
import { useAuthStore, type UserProfile } from '@/store/authStore'
import { ONBOARDING_LAST_STEP_INDEX, type OnboardingData } from '@/store/onboardingStore'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import {
  resolveOnboardingStartExperience,
  toPersistedStartExperience,
} from '@/lib/onboarding-routing'
import type { OnboardingStartExperienceResolved } from '@/lib/onboarding-routing'

export type ProfileLoadResult = {
  profile: LearnerProfileRecord
  wasCreated: boolean
  recovery: boolean
}

function nowIso(): string {
  return new Date().toISOString()
}

/**
 * Load persisted learner profile or create a clean document for this user.
 * Session `UserProfile` supplies registry identity only — not durable profile source.
 */
export function loadOrInitializeLearnerProfile(user: UserProfile): ProfileLoadResult {
  const userId = user.id
  if (typeof window === 'undefined') {
    const offline = createNewBetaUserProfile(user)
    return { profile: offline, wasCreated: true, recovery: false }
  }

  const existing = getUserProfile(userId)
  if (existing) {
    return { profile: existing, wasCreated: false, recovery: false }
  }

  const hadRaw =
    typeof window !== 'undefined' &&
    (!!window.localStorage.getItem(userProfileStorageKey(userId)) ||
      !!window.localStorage.getItem(legacyLearnerProfileStorageKey(userId)))

  if (hadRaw) {
    const recovered = createNewBetaUserProfile(user)
    persistLearnerProfileDocument(recovered)
    return { profile: recovered, wasCreated: false, recovery: true }
  }

  const created = createNewBetaUserProfile(user)
  persistLearnerProfileDocument(created)
  return { profile: created, wasCreated: true, recovery: false }
}

/** Recover from corrupt storage: replace with fresh profile (keeps userId). */
export function recoverLearnerProfile(userId: string): LearnerProfileRecord {
  const fresh = createDefaultUserProfile(userId)
  persistLearnerProfileDocument(fresh)
  return fresh
}

/** Persist onboarding draft (step + partial data) and merge durable learner signals onto the profile. */
export function persistOnboardingDraft(userId: string, step: number, data: Partial<OnboardingData>): void {
  const base = getUserProfile(userId) ?? createDefaultUserProfile(userId)
  const mergedOnboarding: Partial<OnboardingData> = { ...base.onboardingData, ...data }
  const rhythmMins = mergedOnboarding.studyRhythm
    ? dailyMinutesFromRhythm(mergedOnboarding.studyRhythm)
    : undefined
  const mergedWithRhythm: Partial<OnboardingData> = {
    ...mergedOnboarding,
    ...(rhythmMins != null ? { dailyLearningGoalMinutes: rhythmMins } : {}),
  }
  const clampedStep = Math.max(0, Math.min(ONBOARDING_LAST_STEP_INDEX, Math.floor(step)))
  const mergedDoc = mergeOnboardingAnswersIntoProfileDocument(base, mergedWithRhythm, clampedStep)
  const next: LearnerProfileRecord = { ...mergedDoc, onboardingComplete: false }

  const changed = diffOnboardingProfileSignals(base, next)
  persistLearnerProfileDocument(next)

  if (typeof window !== 'undefined') {
    track(ANALYTICS_EVENTS.onboarding_profile_updated, {
      user_id: userId,
      onboarding_step: clampedStep,
      partial: true,
      fields_present: listPopulatedOnboardingSignalFields(next),
    })
    if (changed.length > 0) {
      track(ANALYTICS_EVENTS.onboarding_answer_saved, {
        user_id: userId,
        onboarding_step: clampedStep,
        changed_fields: changed,
      })
    }
  }
}

/**
 * Mark onboarding finished. Pass `answers` with the full v2 snapshot so durable profile + personalization
 * fields stay populated. Omit `answers` (or pass empty) for repair-only sync from auth (keeps existing `onboardingData`).
 */
export function markLearnerProfileOnboardingComplete(
  userId: string,
  answers?: Partial<OnboardingData>
): OnboardingStartExperienceResolved | null {
  const base = getUserProfile(userId) ?? createDefaultUserProfile(userId)
  const noSnapshot = !answers || Object.keys(answers).length === 0
  if (noSnapshot) {
    persistLearnerProfileDocument({
      ...base,
      onboardingComplete: true,
      onboardingStep: 0,
      isNewUser: false,
      onboardingCompletedAt: base.onboardingCompletedAt ?? nowIso(),
    })
    return null
  }

  const rhythmMins = answers.studyRhythm ? dailyMinutesFromRhythm(answers.studyRhythm) : undefined
  const mergedData: Partial<OnboardingData> = {
    ...base.onboardingData,
    ...answers,
    ...(rhythmMins != null ? { dailyLearningGoalMinutes: rhythmMins } : {}),
  }
  const mergedDoc = mergeOnboardingAnswersIntoProfileDocument(base, mergedData, 0)
  const resolved = resolveOnboardingStartExperience(mergedData)
  const next: LearnerProfileRecord = {
    ...mergedDoc,
    onboardingComplete: true,
    isNewUser: false,
    onboardingCompletedAt: nowIso(),
    onboardingStartExperienceV1: toPersistedStartExperience(resolved, mergedData),
  }
  persistLearnerProfileDocument(next)

  const goalLine =
    mergedData.primaryGoal != null && mergedData.primaryGoal !== ''
      ? optionLabel(PRIMARY_GOAL_OPTIONS, mergedData.primaryGoal)
      : undefined
  useAuthStore.getState().updateProfile({
    ...(next.currentLevel ? { currentLevel: next.currentLevel } : {}),
    ...(next.desiredLevel ? { targetLevel: next.desiredLevel } : {}),
    ...(goalLine ? { targetObjective: goalLine } : {}),
    ...(rhythmMins != null ? { dailyLearningGoalMinutes: rhythmMins } : {}),
  })
  return resolved
}
