import type {
  OnboardingStartExperiencePersistedV1,
  UserProfileDocumentV1,
} from '@/lib/storage/storageTypes'
import type { OnboardingData } from '@/store/onboardingStore'
import {
  getUserCurrentLevelSelfReportId,
  getUserFocusAreaIds,
  getUserLearningReasonId,
  getUserPrimaryGoal,
  getUserRoutinePreferences,
  getUserTargetPathId,
} from '@/lib/profile/profileSelectors'
import {
  mapOnboardingSignalsToPathway,
  pathwayKeyToRoute,
} from './onboardingPathwayMapper'
import { buildEmphasis, buildWelcomeCopy } from './onboardingWelcomeBuilder'
import type { OnboardingStartExperienceResolved } from './types'

export function resolveOnboardingStartExperience(
  data: Partial<OnboardingData>
): OnboardingStartExperienceResolved {
  const { pathwayKey, decisionTrace } = mapOnboardingSignalsToPathway(data)
  const route = pathwayKeyToRoute(pathwayKey)
  const emphasis = buildEmphasis(pathwayKey)
  const { welcomeHeadline, welcomeSubline, summaryCtaLabel } = buildWelcomeCopy(pathwayKey, data)

  return {
    pathwayKey,
    route,
    emphasis,
    decisionTrace,
    welcomeHeadline,
    welcomeSubline,
    summaryCtaLabel,
  }
}

/** Resolve from durable profile (e.g. analytics, future deep links). Uses profile selectors only — no personalization barrel import. */
export function resolveOnboardingStartExperienceFromProfile(
  profile: UserProfileDocumentV1
): OnboardingStartExperienceResolved {
  const rhythm = getUserRoutinePreferences(profile)
  const data: Partial<OnboardingData> = {
    primaryGoal: getUserPrimaryGoal(profile) ?? '',
    currentLevelSelfReport: getUserCurrentLevelSelfReportId(profile) ?? '',
    targetPath: getUserTargetPathId(profile) ?? '',
    focusSkills: getUserFocusAreaIds(profile),
    studyRhythm: rhythm?.studyRhythmId ?? '',
    learningReason: getUserLearningReasonId(profile) ?? '',
  }
  return resolveOnboardingStartExperience(data)
}

export function toPersistedStartExperience(
  resolved: OnboardingStartExperienceResolved,
  data: Partial<OnboardingData>
): OnboardingStartExperiencePersistedV1 {
  return {
    pathwayKey: resolved.pathwayKey,
    route: resolved.route,
    emphasis: resolved.emphasis,
    decisionTrace: resolved.decisionTrace,
    welcomeHeadline: resolved.welcomeHeadline,
    welcomeSubline: resolved.welcomeSubline,
    resolvedAt: new Date().toISOString(),
    targetPath: typeof data.targetPath === 'string' ? data.targetPath : undefined,
    primaryGoal: typeof data.primaryGoal === 'string' ? data.primaryGoal : undefined,
    learningReason: typeof data.learningReason === 'string' ? data.learningReason : undefined,
  }
}
