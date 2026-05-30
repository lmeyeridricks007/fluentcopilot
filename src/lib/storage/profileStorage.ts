import type { UserProfile } from '@/store/authStore'
import type { OnboardingData } from '@/store/onboardingStore'
import { removeLegacyProfileKey } from './storageMigrations'
import { safeGetItem, safeWriteJson } from './safeStorage'
import {
  legacyLearnerProfileStorageKey,
  userProfileStorageKey,
} from './storageKeys'
import { userProfileDocumentV1Schema } from './storageSchemas'
import {
  USER_PROFILE_SCHEMA_VERSION,
  type OnboardingStartExperiencePersistedV1,
  type RoutinePreferencesV1,
  type UserProfileDocumentV1,
} from './storageTypes'

function nowIso(): string {
  return new Date().toISOString()
}

export function createDefaultUserProfile(userId: string): UserProfileDocumentV1 {
  const t = nowIso()
  return {
    schemaVersion: USER_PROFILE_SCHEMA_VERSION,
    userId,
    createdAt: t,
    updatedAt: t,
    onboardingComplete: false,
    onboardingStep: 0,
    onboardingData: {},
  }
}

/** First-login profile: registry identity + explicit new-user markers; no learning content. */
export function createNewBetaUserProfile(user: UserProfile): UserProfileDocumentV1 {
  const t = nowIso()
  return {
    schemaVersion: USER_PROFILE_SCHEMA_VERSION,
    userId: user.id,
    createdAt: t,
    updatedAt: t,
    onboardingComplete: false,
    onboardingStep: 0,
    onboardingData: {},
    displayName: user.name,
    email: user.email,
    plan: user.plan,
    betaAccessAllowed: user.betaAccessAllowed !== false,
    authProviderType: user.authProviderType,
    /** Registry/session placement defaults — not onboarding questionnaire answers. */
    currentLevel: user.currentLevel,
    desiredLevel: user.targetLevel,
    preferences: { defaultsVersion: 1 as const },
    isNewUser: true,
    firstLoginAt: t,
  }
}

export function applyRegistryIdentityToProfile(
  base: UserProfileDocumentV1,
  user: UserProfile
): UserProfileDocumentV1 {
  return {
    ...base,
    userId: user.id,
    displayName: user.name,
    email: user.email,
    plan: user.plan,
    betaAccessAllowed: user.betaAccessAllowed !== false,
    authProviderType: user.authProviderType ?? base.authProviderType,
    currentLevel: user.currentLevel,
    desiredLevel: user.targetLevel,
    updatedAt: nowIso(),
  }
}

/** For UX: completed onboarding ⇒ not new; else honour `isNewUser` or treat legacy as still in first journey. */
export function effectiveIsNewUser(profile: UserProfileDocumentV1): boolean {
  if (profile.onboardingComplete) return false
  if (typeof profile.isNewUser === 'boolean') return profile.isNewUser
  return true
}

function sanitizeOnboardingData(data: Partial<OnboardingData>): Partial<OnboardingData> {
  const out: Partial<OnboardingData> = {}
  const copyKeys: (keyof OnboardingData)[] = [
    'nativeLanguage',
    'countryOfOrigin',
    'timeInNetherlands',
    'familyStatus',
    'ageRange',
    'workRole',
    'industry',
    'currentLevel',
    'targetLevel',
    'targetObjective',
    'dailyLearningGoalMinutes',
    'primaryGoal',
    'currentLevelSelfReport',
    'targetPath',
    'studyRhythm',
    'learningReason',
  ]
  for (const k of copyKeys) {
    const v = data[k]
    if (v !== undefined && v !== null) {
      ;(out as Record<string, unknown>)[k] = v
    }
  }
  if (Array.isArray(data.hobbies)) out.hobbies = data.hobbies.filter((x) => typeof x === 'string')
  if (Array.isArray(data.knownLanguages))
    out.knownLanguages = data.knownLanguages.filter((x) => typeof x === 'string')
  if (Array.isArray(data.focusSkills)) out.focusSkills = data.focusSkills.filter((x) => typeof x === 'string')
  if (typeof data.notificationsEmail === 'boolean') out.notificationsEmail = data.notificationsEmail
  if (typeof data.notificationsPush === 'boolean') out.notificationsPush = data.notificationsPush
  return out
}

/**
 * Lenient parse for bootstrap paths that predate Zod validation (same rules as legacy module).
 */
export function parseUserProfileLenient(raw: unknown, userId: string): UserProfileDocumentV1 | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (o.schemaVersion !== USER_PROFILE_SCHEMA_VERSION) return null
  if (typeof o.userId !== 'string' || o.userId !== userId) return null
  if (typeof o.onboardingComplete !== 'boolean') return null
  const step = typeof o.onboardingStep === 'number' && Number.isFinite(o.onboardingStep) ? o.onboardingStep : 0
  const data =
    o.onboardingData && typeof o.onboardingData === 'object'
      ? (o.onboardingData as Partial<OnboardingData>)
      : {}
  return {
    schemaVersion: USER_PROFILE_SCHEMA_VERSION,
    userId,
    createdAt: typeof o.createdAt === 'string' ? o.createdAt : nowIso(),
    updatedAt: typeof o.updatedAt === 'string' ? o.updatedAt : nowIso(),
    onboardingComplete: o.onboardingComplete,
    onboardingStep: Math.max(0, Math.min(99, Math.floor(step))),
    onboardingData: sanitizeOnboardingData(data),
    displayName: typeof o.displayName === 'string' ? o.displayName : undefined,
    email: typeof o.email === 'string' ? o.email : undefined,
    plan: typeof o.plan === 'string' ? o.plan : undefined,
    betaAccessAllowed: typeof o.betaAccessAllowed === 'boolean' ? o.betaAccessAllowed : undefined,
    selectedPath: typeof o.selectedPath === 'string' ? o.selectedPath : undefined,
    currentLevel: typeof o.currentLevel === 'string' ? o.currentLevel : undefined,
    desiredLevel: typeof o.desiredLevel === 'string' ? o.desiredLevel : undefined,
    focusAreas: Array.isArray(o.focusAreas)
      ? o.focusAreas.filter((x): x is string => typeof x === 'string')
      : undefined,
    studyRhythm: typeof o.studyRhythm === 'string' ? o.studyRhythm : undefined,
    onboardingCompletedAt:
      typeof o.onboardingCompletedAt === 'string' ? o.onboardingCompletedAt : undefined,
    primaryGoalId: typeof o.primaryGoalId === 'string' ? o.primaryGoalId : undefined,
    learnerGoals: Array.isArray(o.learnerGoals)
      ? o.learnerGoals.filter((x): x is string => typeof x === 'string')
      : undefined,
    currentLevelSelfReportId:
      typeof o.currentLevelSelfReportId === 'string' ? o.currentLevelSelfReportId : undefined,
    learningReasonId: typeof o.learningReasonId === 'string' ? o.learningReasonId : undefined,
    routinePreferences:
      o.routinePreferences && typeof o.routinePreferences === 'object'
        ? parseRoutinePreferencesLenient(o.routinePreferences)
        : undefined,
    preferences:
      o.preferences && typeof o.preferences === 'object'
        ? (o.preferences as Record<string, unknown>)
        : undefined,
    isNewUser: typeof o.isNewUser === 'boolean' ? o.isNewUser : undefined,
    firstLoginAt: typeof o.firstLoginAt === 'string' ? o.firstLoginAt : undefined,
    onboardingStartExperienceV1: parseOnboardingStartExperienceLenient(o.onboardingStartExperienceV1),
    firstPersonalizedHandoffShownAt:
      typeof o.firstPersonalizedHandoffShownAt === 'string' ? o.firstPersonalizedHandoffShownAt : undefined,
  }
}

function parseOnboardingStartExperienceLenient(
  raw: unknown
): OnboardingStartExperiencePersistedV1 | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const x = raw as Record<string, unknown>
  const pathwayKey = typeof x.pathwayKey === 'string' ? x.pathwayKey : ''
  const route = typeof x.route === 'string' ? x.route : ''
  const emphasis = typeof x.emphasis === 'string' ? x.emphasis : ''
  const decisionTrace = typeof x.decisionTrace === 'string' ? x.decisionTrace : ''
  const welcomeHeadline = typeof x.welcomeHeadline === 'string' ? x.welcomeHeadline : ''
  const welcomeSubline = typeof x.welcomeSubline === 'string' ? x.welcomeSubline : ''
  const resolvedAt = typeof x.resolvedAt === 'string' ? x.resolvedAt : ''
  if (!pathwayKey || !route || !resolvedAt) return undefined
  return {
    pathwayKey,
    route,
    emphasis: emphasis || 'a2_path',
    decisionTrace: decisionTrace || 'legacy_parse',
    welcomeHeadline: welcomeHeadline || '',
    welcomeSubline: welcomeSubline || '',
    resolvedAt,
    ...(typeof x.targetPath === 'string' ? { targetPath: x.targetPath } : {}),
    ...(typeof x.primaryGoal === 'string' ? { primaryGoal: x.primaryGoal } : {}),
    ...(typeof x.learningReason === 'string' ? { learningReason: x.learningReason } : {}),
  }
}

function parseRoutinePreferencesLenient(raw: unknown): RoutinePreferencesV1 | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>
  const studyRhythmId = typeof r.studyRhythmId === 'string' ? r.studyRhythmId : undefined
  if (!studyRhythmId) return undefined
  const daily =
    typeof r.dailyMinutesCommitted === 'number' && Number.isFinite(r.dailyMinutesCommitted)
      ? Math.max(0, Math.floor(r.dailyMinutesCommitted))
      : undefined
  return daily != null ? { studyRhythmId, dailyMinutesCommitted: daily } : { studyRhythmId }
}

function parseWithZod(raw: unknown): UserProfileDocumentV1 | null {
  const r = userProfileDocumentV1Schema.safeParse(raw)
  if (!r.success) return null
  const d = r.data
  return {
    ...d,
    onboardingData: sanitizeOnboardingData(d.onboardingData as Partial<OnboardingData>),
  } as UserProfileDocumentV1
}

function readRawProfileJson(userId: string): { key: string; raw: string } | null {
  const canonical = userProfileStorageKey(userId)
  const c = safeGetItem(canonical)
  if (c) return { key: canonical, raw: c }
  const leg = safeGetItem(legacyLearnerProfileStorageKey(userId))
  if (leg) return { key: legacyLearnerProfileStorageKey(userId), raw: leg }
  return null
}

/** Canonical key for the profile document (new writes always use this). */
export function userProfileKey(userId: string): string {
  return userProfileStorageKey(userId)
}

/** @deprecated Use `userProfileStorageKey` — kept for bootstrap barrel compatibility. */
export const learnerProfileStorageKey = userProfileStorageKey

export function getUserProfile(userId: string): UserProfileDocumentV1 | null {
  const hit = readRawProfileJson(userId)
  if (!hit) return null
  let parsed: UserProfileDocumentV1 | null = null
  try {
    const json = JSON.parse(hit.raw) as unknown
    parsed = parseWithZod(json) ?? parseUserProfileLenient(json, userId)
  } catch {
    parsed = null
  }
  if (!parsed) return null
  if (hit.key === legacyLearnerProfileStorageKey(userId)) {
    if (safeWriteJson(userProfileStorageKey(userId), parsed)) {
      removeLegacyProfileKey(userId)
    }
  }
  return parsed
}

export function setUserProfile(profile: UserProfileDocumentV1): void {
  const next: UserProfileDocumentV1 = { ...profile, updatedAt: nowIso() }
  safeWriteJson(userProfileStorageKey(next.userId), next)
  removeLegacyProfileKey(next.userId)
}

export function readUserProfileFromStorage(userId: string): UserProfileDocumentV1 | null {
  return getUserProfile(userId)
}

export function writeUserProfileToStorage(profile: UserProfileDocumentV1): void {
  setUserProfile(profile)
}
