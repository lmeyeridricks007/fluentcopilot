/**
 * Maps durable onboarding answers → profile fields and product entry routes.
 * Downstream features (dashboard, missions, recommendations) should read from
 * `UserProfileDocumentV1` via `@/lib/profile` selectors rather than ad hoc key checks.
 */
import type { UserProfileDocumentV1 } from '@/lib/storage/storageTypes'
import type { OnboardingData } from '@/store/onboardingStore'
import {
  CURRENT_LEVEL_OPTIONS,
  FOCUS_SKILL_OPTIONS,
  LEARNING_REASON_OPTIONS,
  optionLabel,
  PRIMARY_GOAL_OPTIONS,
  STUDY_RHYTHM_OPTIONS,
  TARGET_PATH_OPTIONS,
} from '@/features/onboarding/onboardingOptions'
import { mapOnboardingAnswersToProfilePatch } from '@/lib/profile'
import { resolveOnboardingStartExperience } from '@/lib/onboarding-routing'
import {
  getUserCurrentLevelSelfReportId,
  getUserFocusAreaIds,
  getUserLearningReasonId,
  getUserPrimaryGoal,
  getUserRoutinePreferences,
  getUserTargetPathId,
} from '@/lib/profile/profileSelectors'

export type PersonalizationHints = {
  primaryGoalLabel: string
  targetPathId: string
  recommendedEntryPath: string
  dashboardHeroHint: 'exam' | 'mastery' | 'speaking' | 'general'
}

export { mapOnboardingAnswersToProfilePatch }

export function getPostOnboardingEntryPath(data: Partial<OnboardingData>): string {
  return resolveOnboardingStartExperience(data).route
}

export function getPersonalizationHints(data: Partial<OnboardingData>): PersonalizationHints {
  const start = resolveOnboardingStartExperience(data)
  const primaryGoalLabel = data.primaryGoal
    ? optionLabel(PRIMARY_GOAL_OPTIONS, data.primaryGoal)
    : ''
  const targetPathId = data.targetPath ?? 'a2'

  let dashboardHeroHint: PersonalizationHints['dashboardHeroHint'] = 'general'
  if (start.pathwayKey === 'exam_prep') dashboardHeroHint = 'exam'
  else if (start.pathwayKey === 'practice_confidence') {
    dashboardHeroHint =
      data.focusSkills?.includes('speaking') || data.primaryGoal === 'speaking_more' ? 'speaking' : 'mastery'
  }

  return {
    primaryGoalLabel,
    targetPathId,
    recommendedEntryPath: start.route,
    dashboardHeroHint,
  }
}

export function primaryGoalSummaryLine(data: Partial<OnboardingData>): string {
  if (!data.primaryGoal) return 'Your Dutch journey'
  return optionLabel(PRIMARY_GOAL_OPTIONS, data.primaryGoal)
}

export function targetPathSummaryLine(data: Partial<OnboardingData>): string {
  if (!data.targetPath) return 'your goals'
  return optionLabel(TARGET_PATH_OPTIONS, data.targetPath)
}

export function focusSkillsSummaryLine(data: Partial<OnboardingData>): string {
  const ids = data.focusSkills ?? []
  if (ids.length === 0) return '—'
  return ids.map((id) => optionLabel(FOCUS_SKILL_OPTIONS, id)).join(' · ')
}

export function studyRhythmSummaryLine(data: Partial<OnboardingData>): string {
  if (!data.studyRhythm) return '—'
  return optionLabel(STUDY_RHYTHM_OPTIONS, data.studyRhythm)
}

export function learningReasonSummaryLine(data: Partial<OnboardingData>): string {
  if (!data.learningReason) return '—'
  return optionLabel(LEARNING_REASON_OPTIONS, data.learningReason)
}

export function currentLevelSummaryLine(data: Partial<OnboardingData>): string {
  if (!data.currentLevelSelfReport) return '—'
  return optionLabel(CURRENT_LEVEL_OPTIONS, data.currentLevelSelfReport)
}

/**
 * Reconstruct v2 onboarding-shaped answers for UI / hints.
 * Precedence: explicit profile signal fields → `onboardingData` → `preferences.personalization` (legacy).
 */
export function readPersonalizationSnapshot(profile: UserProfileDocumentV1): Partial<OnboardingData> {
  const fromExplicit: Partial<OnboardingData> = {}
  const pg = getUserPrimaryGoal(profile)
  if (pg) fromExplicit.primaryGoal = pg
  const cl = getUserCurrentLevelSelfReportId(profile)
  if (cl) fromExplicit.currentLevelSelfReport = cl
  const tp = getUserTargetPathId(profile)
  if (tp) fromExplicit.targetPath = tp
  const fa = getUserFocusAreaIds(profile)
  if (fa.length > 0) fromExplicit.focusSkills = fa
  const r = getUserRoutinePreferences(profile)
  if (r?.studyRhythmId) fromExplicit.studyRhythm = r.studyRhythmId
  const lr = getUserLearningReasonId(profile)
  if (lr) fromExplicit.learningReason = lr

  const legacyP = profile.preferences?.personalization
  const fromPersonalization =
    legacyP && typeof legacyP === 'object' && !Array.isArray(legacyP)
      ? (legacyP as Partial<OnboardingData>)
      : {}
  const fromOnboarding = profile.onboardingData ?? {}

  return { ...fromPersonalization, ...fromOnboarding, ...fromExplicit }
}
