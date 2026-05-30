import type { LearnerProfileRecord } from './types'
import type { OnboardingResolution } from './types'
import { ONBOARDING_LAST_STEP_INDEX } from '@/store/onboardingStore'

/** Max step index for the v2 flow (0-based). Export for guards / copy. */
export const ONBOARDING_STEP_MAX = ONBOARDING_LAST_STEP_INDEX

function isLegacyV1OnboardingDraft(data: Record<string, unknown>): boolean {
  const hasV1 =
    (typeof data.nativeLanguage === 'string' && data.nativeLanguage.length > 0) ||
    (typeof data.countryOfOrigin === 'string' && data.countryOfOrigin.length > 0) ||
    (typeof data.familyStatus === 'string' && data.familyStatus.length > 0)
  const hasV2 = typeof data.primaryGoal === 'string' && data.primaryGoal.length > 0
  return hasV1 && !hasV2
}

export function resolveOnboardingState(profile: LearnerProfileRecord): OnboardingResolution {
  if (profile.onboardingComplete) {
    return { kind: 'complete' }
  }

  const raw = profile.onboardingData as Record<string, unknown> | undefined
  if (raw && isLegacyV1OnboardingDraft(raw)) {
    return { kind: 'fresh' }
  }

  const step = Math.max(0, Math.min(ONBOARDING_STEP_MAX, Math.floor(profile.onboardingStep)))
  const hasDraft =
    step > 0 ||
    (profile.onboardingData &&
      typeof profile.onboardingData === 'object' &&
      Object.keys(profile.onboardingData).length > 0)

  if (hasDraft) {
    return { kind: 'resume', step, data: profile.onboardingData }
  }

  return { kind: 'fresh' }
}
