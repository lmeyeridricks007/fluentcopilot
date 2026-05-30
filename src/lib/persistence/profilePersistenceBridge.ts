import { persistOnboardingDraft } from '@/lib/bootstrap/bootstrapProfileLoader'
import { mergeLearnerProfilePatch } from '@/lib/profile/profileActions'
import type { UserProfileDocumentV1 } from '@/lib/storage/storageTypes'
import type { OnboardingData } from '@/store/onboardingStore'
import type { UserProfile } from '@/store/authStore'
import { runIncrementalSave } from './saveStrategies'

/** Flush onboarding to disk immediately (e.g. after advancing a step). */
export function persistOnboardingStepImmediate(
  userId: string,
  step: number,
  data: Partial<OnboardingData>
): void {
  runIncrementalSave({
    domain: 'onboarding',
    mode: 'immediate',
    eventType: 'onboarding_step_advance',
    persist: () => {
      persistOnboardingDraft(userId, step, data)
      return true
    },
  })
}

/**
 * Mirror selected session fields into the durable learner profile (user-scoped).
 * Call after explicit settings save or when learning-relevant session fields change.
 */
export function syncSessionUserToLearnerProfile(userId: string, user: UserProfile): void {
  runIncrementalSave({
    domain: 'profile',
    mode: 'immediate',
    eventType: 'session_to_learner_profile',
    persist: () => {
      const patch: Partial<UserProfileDocumentV1> = {
        displayName: user.name,
        email: user.email,
        currentLevel: user.currentLevel,
        desiredLevel: user.targetLevel,
      }
      if (user.plan !== undefined) patch.plan = user.plan
      if (user.betaAccessAllowed !== undefined) patch.betaAccessAllowed = user.betaAccessAllowed
      if (user.authProviderType !== undefined) patch.authProviderType = user.authProviderType
      mergeLearnerProfilePatch(userId, patch)
      return true
    },
  })
}
