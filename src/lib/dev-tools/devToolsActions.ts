/**
 * Dev/QA actions — mutate local state through the same paths as product features.
 * Call only when `isDevToolsRouteEnabled()`; never from end-user UI.
 */
import { runAccountBootstrap } from '@/lib/bootstrap/accountBootstrap'
import {
  persistEmptyRetentionProfile,
  wipeLocalStorageKeysForColdStart,
  wipeProfileDocumentsForUser,
  wipeProgressRetentionDomainsForUser,
} from '@/lib/bootstrap/wipeUserProgressDomains'
import { applyMockSignInSession } from '@/lib/auth/applyMockSignInSession'
import { MOCK_BETA_TEMPORARY_PASSWORD } from '@/lib/auth/mockAuthConstants'
import { mockAuthService } from '@/lib/auth/mockAuthService'
import type { MockBetaRegistryRecord } from '@/lib/auth/mockAuthTypes'
import { resetOnboardingProgressOnly } from '@/lib/account/accountReset'
import { createEmptyDraftsDocument, setUserDrafts } from '@/lib/storage/draftStorage'
import { STORAGE_NS } from '@/lib/storage/storageKeys'
import { safeRemoveItem } from '@/lib/storage/safeStorage'
import { useAuthStore } from '@/store/authStore'

function logDev(action: string, detail?: Record<string, unknown>): void {
  if (typeof console !== 'undefined' && console.info) {
    console.info(`[dev-tools] ${action}`, detail ?? '')
  }
}

/** Full learning stack for current user (profile, progress, drafts, retention, …). Re-runs bootstrap. */
export function devToolsClearAllLearningDataForCurrentUser(): boolean {
  const userId = useAuthStore.getState().user?.id
  if (!userId) return false
  logDev('clear_all_learning', { userId })
  wipeLocalStorageKeysForColdStart(userId)
  runAccountBootstrap()
  return true
}

/** Learner profile document only; progress / drafts / XP unchanged on disk paths that remain. */
export function devToolsClearProfileDocumentOnly(): boolean {
  const user = useAuthStore.getState().user
  if (!user?.id) return false
  logDev('clear_profile_only', { userId: user.id })
  wipeProfileDocumentsForUser(user.id)
  runAccountBootstrap()
  return true
}

/** Progress + retention + review + practice client keys — not profile or drafts. */
export function devToolsClearProgressStackOnly(): boolean {
  const userId = useAuthStore.getState().user?.id
  if (!userId) return false
  logDev('clear_progress_stack', { userId })
  wipeProgressRetentionDomainsForUser(userId)
  persistEmptyRetentionProfile(userId)
  runAccountBootstrap()
  return true
}

/** Drafts / autosave envelope document only. */
export function devToolsClearDraftsOnly(): boolean {
  const userId = useAuthStore.getState().user?.id
  if (!userId) return false
  logDev('clear_drafts', { userId })
  setUserDrafts(userId, createEmptyDraftsDocument(userId))
  return true
}

/** Alias for API clarity — same as `devToolsClearAllLearningDataForCurrentUser`. */
export const devToolsSimulateFirstLogin = devToolsClearAllLearningDataForCurrentUser

export function devToolsResetOnboardingOnly(): boolean {
  const ok = resetOnboardingProgressOnly()
  if (ok) logDev('reset_onboarding_only', { userId: useAuthStore.getState().user?.id })
  return ok
}

/**
 * Sign out, then sign in as registry user. Clears in-memory stores on logout; bootstrap hydrates new user.
 */
export async function devToolsSwitchToMockUser(record: MockBetaRegistryRecord): Promise<void> {
  logDev('switch_user_start', { targetId: record.id, email: record.email })
  useAuthStore.getState().logout()
  const session = await mockAuthService.signIn({
    email: record.email,
    password: MOCK_BETA_TEMPORARY_PASSWORD,
  })
  applyMockSignInSession(session)
  logDev('switch_user_done', { userId: session.userId })
}

/**
 * Removes every `localStorage` key prefixed with `lt.v1` (all beta users on this browser).
 * Current session remains signed in; run bootstrap after.
 */
export function devToolsWipeAllLtV1KeysOnDevice(): number {
  if (typeof window === 'undefined') return 0
  const toRemove: string[] = []
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const k = window.localStorage.key(i)
    if (k?.startsWith(STORAGE_NS)) toRemove.push(k)
  }
  toRemove.forEach((k) => safeRemoveItem(k))
  const userId = useAuthStore.getState().user?.id
  if (userId) {
    persistEmptyRetentionProfile(userId)
    runAccountBootstrap()
  }
  logDev('wipe_all_lt_v1', { removed: toRemove.length })
  return toRemove.length
}
