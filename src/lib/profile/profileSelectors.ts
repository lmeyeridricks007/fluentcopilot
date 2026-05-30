import type { UserProfileDocumentV1 } from '@/lib/storage/storageTypes'
import type { OnboardingData } from '@/store/onboardingStore'
import { normalizeProductPlan, type BetaPlanId } from '@/lib/entitlements'
import { isSelectedPathwayId, type SelectedPathwayId } from './profileTypes'

function personalizationObject(
  profile: Pick<UserProfileDocumentV1, 'preferences'>
): Partial<OnboardingData> | null {
  const p = profile.preferences?.personalization
  if (p && typeof p === 'object' && !Array.isArray(p)) return p as Partial<OnboardingData>
  return null
}

/** Primary goal id: explicit field → legacy blobs. */
export function getUserPrimaryGoal(profile: UserProfileDocumentV1): string | undefined {
  const id = profile.primaryGoalId ?? profile.learnerGoals?.[0]
  if (typeof id === 'string' && id.trim() !== '') return id
  const fromData = profile.onboardingData?.primaryGoal
  if (typeof fromData === 'string' && fromData.trim() !== '') return fromData
  const g = personalizationObject(profile)?.primaryGoal
  return typeof g === 'string' && g.trim() !== '' ? g : undefined
}

/**
 * Effective product plan: prefer durable profile plan, then session/registry plan string.
 */
export function getCurrentPlan(
  profile: UserProfileDocumentV1 | null | undefined,
  sessionPlan?: string | undefined
): BetaPlanId {
  if (profile?.plan != null && profile.plan !== '') return normalizeProductPlan(profile.plan)
  return normalizeProductPlan(sessionPlan)
}

/**
 * Selected / target pathway when it matches a known pathway id (see `SelectedPathwayId`).
 * `getUserTargetPathId` remains the lenient reader (includes onboarding draft fields).
 */
export function getSelectedPathway(profile: UserProfileDocumentV1): SelectedPathwayId | undefined {
  const raw = getUserTargetPathId(profile)
  return isSelectedPathwayId(raw) ? raw : undefined
}

/** Goal ids: explicit list or single primary goal. */
export function getUserGoals(profile: UserProfileDocumentV1): string[] {
  if (profile.learnerGoals && profile.learnerGoals.length > 0) return [...profile.learnerGoals]
  const g = getUserPrimaryGoal(profile)
  return g ? [g] : []
}

/** Target pathway id (stable). */
export function getUserTargetPathId(profile: UserProfileDocumentV1): string | undefined {
  const path = profile.selectedPath
  if (typeof path === 'string' && path.trim() !== '') return path
  const fromData = profile.onboardingData?.targetPath
  if (typeof fromData === 'string' && fromData.trim() !== '') return fromData
  const t = personalizationObject(profile)?.targetPath
  return typeof t === 'string' && t.trim() !== '' ? t : undefined
}

/** Focus skill / area ids. */
export function getUserFocusAreaIds(profile: UserProfileDocumentV1): string[] {
  if (profile.focusAreas && profile.focusAreas.length > 0) return [...profile.focusAreas]
  const fromData = profile.onboardingData?.focusSkills
  if (Array.isArray(fromData) && fromData.length > 0) return [...fromData]
  const f = personalizationObject(profile)?.focusSkills
  return Array.isArray(f) ? f.filter((x): x is string => typeof x === 'string') : []
}

/** Self-reported level option id (pre-CEFR). */
export function getUserCurrentLevelSelfReportId(profile: UserProfileDocumentV1): string | undefined {
  const id = profile.currentLevelSelfReportId
  if (typeof id === 'string' && id.trim() !== '') return id
  const fromData = profile.onboardingData?.currentLevelSelfReport
  if (typeof fromData === 'string' && fromData.trim() !== '') return fromData
  const c = personalizationObject(profile)?.currentLevelSelfReport
  return typeof c === 'string' && c.trim() !== '' ? c : undefined
}

/** Routine: prefer structured blob, fall back to flat `studyRhythm`. */
export function getUserRoutinePreferences(profile: UserProfileDocumentV1): {
  studyRhythmId: string
  dailyMinutesCommitted?: number
} | undefined {
  const rp = profile.routinePreferences
  if (rp?.studyRhythmId) return { ...rp }
  const rhythm = profile.studyRhythm
  if (typeof rhythm === 'string' && rhythm.trim() !== '') return { studyRhythmId: rhythm }
  const s = personalizationObject(profile)?.studyRhythm
  if (typeof s === 'string' && s.trim() !== '') return { studyRhythmId: s }
  return undefined
}

export function getUserLearningReasonId(profile: UserProfileDocumentV1): string | undefined {
  const id = profile.learningReasonId
  if (typeof id === 'string' && id.trim() !== '') return id
  const fromData = profile.onboardingData?.learningReason
  if (typeof fromData === 'string' && fromData.trim() !== '') return fromData
  const l = personalizationObject(profile)?.learningReason
  return typeof l === 'string' && l.trim() !== '' ? l : undefined
}

/** True when explicit completion flag is set — do not infer from partial answers. */
export function isOnboardingExplicitlyComplete(profile: UserProfileDocumentV1): boolean {
  return profile.onboardingComplete === true
}

/** Alias for routing and UI that should trust only the durable flag. */
export const isOnboardingComplete = isOnboardingExplicitlyComplete

/**
 * Short list of which durable signal fields are populated (for analytics / debugging).
 */
export function listPopulatedOnboardingSignalFields(profile: UserProfileDocumentV1): string[] {
  const keys: string[] = []
  if (getUserPrimaryGoal(profile)) keys.push('primary_goal')
  if (getUserCurrentLevelSelfReportId(profile)) keys.push('current_level_self_report')
  if (getUserTargetPathId(profile)) keys.push('target_path')
  if (getUserFocusAreaIds(profile).length > 0) keys.push('focus_areas')
  if (getUserRoutinePreferences(profile)) keys.push('routine')
  if (getUserLearningReasonId(profile)) keys.push('learning_reason')
  return keys
}

const SIGNAL_COMPARISON_KEYS = [
  ['primaryGoalId', 'primary_goal'],
  ['currentLevelSelfReportId', 'current_level_self_report'],
  ['learningReasonId', 'learning_reason'],
  ['selectedPath', 'target_path'],
  ['currentLevel', 'current_level_cefr'],
  ['desiredLevel', 'desired_level_cefr'],
  ['focusAreas', 'focus_areas'],
  ['studyRhythm', 'study_rhythm'],
  ['routinePreferences', 'routine_preferences'],
  ['onboardingStep', 'onboarding_step'],
] as const

/** Which durable signal keys changed between two profile snapshots (analytics). */
export function diffOnboardingProfileSignals(
  before: UserProfileDocumentV1,
  after: UserProfileDocumentV1
): string[] {
  const changed: string[] = []
  const b = before as Record<string, unknown>
  const a = after as Record<string, unknown>
  for (const [docKey, eventKey] of SIGNAL_COMPARISON_KEYS) {
    if (JSON.stringify(b[docKey]) !== JSON.stringify(a[docKey])) changed.push(eventKey)
  }
  return changed
}
