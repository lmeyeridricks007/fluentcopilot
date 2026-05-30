import { getUserDrafts } from '@/lib/storage/draftStorage'
import { getUserProfile } from '@/lib/storage/profileStorage'
import { getUserProgress } from '@/lib/storage/progressStorage'
import { coldStartWipeKeysForUser } from '@/lib/storage/storageKeys'
import { useAuthStore } from '@/store/authStore'
import { safeGetItem } from '@/lib/storage/safeStorage'
import { getRetentionProfile } from '@/lib/retention/retentionService'
import { collectResumableFlows, type ResumeUserContext } from '@/lib/resume'

export type DevStorageSnapshot = {
  userId: string | null
  authSession: Record<string, unknown> | null
  profileJson: string | null
  progressJson: string | null
  draftsJson: string | null
  wipeKeysForUser: string[]
  /** Keys from wipe list that currently have a non-empty localStorage value */
  populatedWipeKeys: { key: string; byteLength: number }[]
  resumableSummary: string | null
}

function safeStringify(label: string, value: unknown): string | null {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return `/* ${label}: not JSON-serializable */`
  }
}

export function buildDevStorageSnapshot(): DevStorageSnapshot {
  if (typeof window === 'undefined') {
    return {
      userId: null,
      authSession: null,
      profileJson: null,
      progressJson: null,
      draftsJson: null,
      wipeKeysForUser: [],
      populatedWipeKeys: [],
      resumableSummary: null,
    }
  }

  const s = useAuthStore.getState()
  const userId = s.user?.id ?? null
  const authSession =
    s.user != null
      ? {
          isAuthenticated: s.isAuthenticated,
          hasCompletedOnboarding: s.hasCompletedOnboarding,
          user: s.user,
          sessionUpdatedAt: s.sessionUpdatedAt,
        }
      : null

  const profile = userId ? getUserProfile(userId) : null
  const progress = userId ? getUserProgress(userId) : null
  const drafts = userId ? getUserDrafts(userId) : null

  const wipeKeysForUser = userId ? coldStartWipeKeysForUser(userId) : []
  const populatedWipeKeys = wipeKeysForUser
    .map((key) => {
      const raw = safeGetItem(key)
      const len = raw ? raw.length : 0
      return { key, byteLength: len }
    })
    .filter((x) => x.byteLength > 0)

  let resumableSummary: string | null = null
  if (userId && s.user) {
    const ctx: ResumeUserContext = {
      userId,
      onboardingComplete: s.hasCompletedOnboarding,
      completedLessonIds: getRetentionProfile(userId).completedLessonIds,
    }
    try {
      const flows = collectResumableFlows(ctx)
      resumableSummary =
        flows.length === 0
          ? 'None'
          : flows.map((f) => `${f.kind} (${f.title})`).join(' → ')
    } catch {
      resumableSummary = '(resolver error)'
    }
  }

  return {
    userId,
    authSession,
    profileJson: profile ? safeStringify('profile', profile) : null,
    progressJson: progress ? safeStringify('progress', progress) : null,
    draftsJson: drafts ? safeStringify('drafts', drafts) : null,
    wipeKeysForUser,
    populatedWipeKeys,
    resumableSummary,
  }
}
