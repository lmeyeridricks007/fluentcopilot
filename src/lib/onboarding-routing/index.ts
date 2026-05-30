export type { OnboardingStartExperienceResolved, StartExperienceEmphasis, StartPathwayKey } from './types'
export type { OnboardingStartExperiencePersistedV1 } from '@/lib/storage/storageTypes'
export { ONBOARDING_START_HANDOFF_STORAGE_KEY } from './constants'
export {
  clearOnboardingStartHandoff,
  readPendingOnboardingHandoff,
  writeOnboardingStartHandoff,
  type OnboardingHandoffPayload,
} from './sessionHandoff'
export {
  mapOnboardingSignalsToPathway,
  pathwayKeyToRoute,
} from './onboardingPathwayMapper'
export { buildEmphasis, buildWelcomeCopy } from './onboardingWelcomeBuilder'
export {
  resolveOnboardingStartExperience,
  resolveOnboardingStartExperienceFromProfile,
  toPersistedStartExperience,
} from './onboardingStartExperience'
export { resolvePostOnboardingEntryPath } from './onboardingStartRouteResolver'
