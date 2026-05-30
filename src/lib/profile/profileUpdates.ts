import type { UserProfileDocumentV1 } from '@/lib/storage/storageTypes'
import type { OnboardingData } from '@/store/onboardingStore'
import {
  buildPreferencesPatchFromMergedOnboarding,
  mapMergedOnboardingToExplicitProfileFields,
} from './onboardingProfileMapper'

function mergePreferencesLayer(
  base: Record<string, unknown> | undefined,
  patch: Record<string, unknown>
): Record<string, unknown> {
  const next = { ...(base ?? {}) }
  for (const [k, v] of Object.entries(patch)) {
    if (k === 'personalization' && v && typeof v === 'object' && !Array.isArray(v)) {
      const prev =
        next.personalization && typeof next.personalization === 'object' && !Array.isArray(next.personalization)
          ? (next.personalization as Record<string, unknown>)
          : {}
      next.personalization = { ...prev, ...(v as Record<string, unknown>) }
    } else {
      next[k] = v
    }
  }
  return next
}

/**
 * Merge onboarding answers into the profile document: explicit signal fields + preferences.
 * Safe for partial onboarding (`onboardingComplete` unchanged unless caller sets it).
 */
export function mergeOnboardingAnswersIntoProfileDocument(
  base: UserProfileDocumentV1,
  mergedOnboarding: Partial<OnboardingData>,
  step: number
): UserProfileDocumentV1 {
  const explicit = mapMergedOnboardingToExplicitProfileFields(mergedOnboarding)
  const prefsPatch = buildPreferencesPatchFromMergedOnboarding(mergedOnboarding)
  const preferences = mergePreferencesLayer(base.preferences, prefsPatch)

  return {
    ...base,
    ...explicit,
    preferences,
    onboardingStep: step,
    onboardingData: mergedOnboarding,
  }
}
