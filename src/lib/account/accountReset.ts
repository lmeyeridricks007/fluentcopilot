import { wipeLocalStorageKeysForColdStart } from '@/lib/bootstrap/wipeUserProgressDomains'
import { mergeLearnerProfilePatch } from '@/lib/profile/profileActions'
import { useAuthStore } from '@/store/authStore'
import { useOnboardingStore } from '@/store/onboardingStore'

/**
 * Wipes all durable learner data for the signed-in user on this device.
 * Also clears the auth session so the user must log in again.
 */
export function resetAllLocalLearningDataOnDevice(): boolean {
  if (typeof window === 'undefined') return false
  const { user, isAuthenticated } = useAuthStore.getState()
  if (!isAuthenticated || !user?.id) return false

  wipeLocalStorageKeysForColdStart(user.id)
  useAuthStore.getState().logout()
  return true
}

/**
 * Clears onboarding completion and draft answers; keeps progress, plan, and other profile fields.
 * Caller should route to `/onboarding`.
 */
export function resetOnboardingProgressOnly(): boolean {
  const userId = useAuthStore.getState().user?.id
  if (!userId) return false

  mergeLearnerProfilePatch(userId, {
    onboardingComplete: false,
    onboardingStep: 0,
    onboardingData: {},
    onboardingCompletedAt: undefined,
  })
  useOnboardingStore.getState().reset()
  useAuthStore.getState().setOnboardingComplete(false)
  return true
}
