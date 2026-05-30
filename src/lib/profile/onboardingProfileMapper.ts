/**
 * Maps merged onboarding answers → durable profile fields + preferences patch.
 * Values are stable option ids from `onboardingOptions`, not UI labels.
 */
import type { UserProfileDocumentV1 } from '@/lib/storage/storageTypes'
import type { OnboardingData } from '@/store/onboardingStore'
import {
  cefrFromLevelSelfReport,
  dailyMinutesFromRhythm,
} from '@/features/onboarding/onboardingOptions'

export type OnboardingProfileFieldPatch = Partial<
  Pick<
    UserProfileDocumentV1,
    | 'primaryGoalId'
    | 'learnerGoals'
    | 'currentLevelSelfReportId'
    | 'learningReasonId'
    | 'selectedPath'
    | 'currentLevel'
    | 'desiredLevel'
    | 'focusAreas'
    | 'studyRhythm'
    | 'routinePreferences'
  >
>

/** Derive desired CEFR target from pathway id. */
export function desiredLevelFromTargetPath(targetPath: string): string | undefined {
  if (targetPath === 'b1') return 'B1'
  if (targetPath === 'a2' || targetPath === 'a2_mastery' || targetPath === 'exam_prep') return 'A2'
  return undefined
}

/**
 * Explicit top-level profile fields from the full merged onboarding snapshot.
 * Only sets keys when the merged answer is present (non-empty), so callers can merge without wiping.
 */
export function mapMergedOnboardingToExplicitProfileFields(
  data: Partial<OnboardingData>
): OnboardingProfileFieldPatch {
  const out: OnboardingProfileFieldPatch = {}

  if (typeof data.primaryGoal === 'string' && data.primaryGoal.trim() !== '') {
    out.primaryGoalId = data.primaryGoal
    out.learnerGoals = [data.primaryGoal]
  }

  if (typeof data.currentLevelSelfReport === 'string' && data.currentLevelSelfReport.trim() !== '') {
    out.currentLevelSelfReportId = data.currentLevelSelfReport
    const level = cefrFromLevelSelfReport(data.currentLevelSelfReport)
    if (level) out.currentLevel = level
  }

  if (typeof data.targetPath === 'string' && data.targetPath.trim() !== '') {
    out.selectedPath = data.targetPath
    const d = desiredLevelFromTargetPath(data.targetPath)
    if (d) out.desiredLevel = d
  }

  if (Array.isArray(data.focusSkills) && data.focusSkills.length > 0) {
    out.focusAreas = [...data.focusSkills]
  }

  if (typeof data.studyRhythm === 'string' && data.studyRhythm.trim() !== '') {
    out.studyRhythm = data.studyRhythm
    const mins = dailyMinutesFromRhythm(data.studyRhythm)
    out.routinePreferences = {
      studyRhythmId: data.studyRhythm,
      ...(mins != null ? { dailyMinutesCommitted: mins } : {}),
    }
  }

  if (typeof data.learningReason === 'string' && data.learningReason.trim() !== '') {
    out.learningReasonId = data.learningReason
  }

  return out
}

/** Preferences subtree aligned with historical `preferences.personalization` + minutes. */
export function buildPreferencesPatchFromMergedOnboarding(
  data: Partial<OnboardingData>
): Record<string, unknown> {
  const prefs: Record<string, unknown> = {
    onboardingFlowVersion: 2,
    personalization: {
      primaryGoal: data.primaryGoal ?? '',
      currentLevelSelfReport: data.currentLevelSelfReport ?? '',
      targetPath: data.targetPath ?? '',
      focusSkills: data.focusSkills ?? [],
      studyRhythm: data.studyRhythm ?? '',
      learningReason: data.learningReason ?? '',
    },
  }
  const mins = data.studyRhythm ? dailyMinutesFromRhythm(data.studyRhythm) : undefined
  if (mins != null) prefs.dailyLearningGoalMinutes = mins
  return prefs
}

/**
 * Legacy-shaped patch for callers that only need routing fields + preferences
 * (e.g. completion path). Prefer `mapMergedOnboardingToExplicitProfileFields` for full signals.
 */
export function mapOnboardingAnswersToProfilePatch(data: Partial<OnboardingData>): {
  selectedPath?: string
  focusAreas?: string[]
  studyRhythm?: string
  currentLevel?: string
  desiredLevel?: string
  preferences: Record<string, unknown>
} {
  const explicit = mapMergedOnboardingToExplicitProfileFields(data)
  return {
    selectedPath: explicit.selectedPath,
    focusAreas: explicit.focusAreas,
    studyRhythm: explicit.studyRhythm,
    currentLevel: explicit.currentLevel,
    desiredLevel: explicit.desiredLevel,
    preferences: buildPreferencesPatchFromMergedOnboarding(data),
  }
}
