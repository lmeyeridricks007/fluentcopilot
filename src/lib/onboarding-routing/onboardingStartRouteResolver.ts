/**
 * Route-only helper — same decision stack as full start experience.
 */
import type { OnboardingData } from '@/store/onboardingStore'
import { resolveOnboardingStartExperience } from './onboardingStartExperience'

export function resolvePostOnboardingEntryPath(data: Partial<OnboardingData>): string {
  return resolveOnboardingStartExperience(data).route
}
