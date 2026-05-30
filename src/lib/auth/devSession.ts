/**
 * Dev-only helpers for QA. Do not call from production UI.
 */

import { useAuthStore } from '@/store/authStore'
import { runFirstLoginColdStartIfNeeded } from '@/lib/bootstrap/firstLoginInitializer'
import {
  legacyLearnerProfileStorageKey,
  legacyProgressRootStorageKey,
  userDraftsStorageKey,
  userProfileStorageKey,
  userProgressManifestStorageKey,
} from '@/lib/storage/storageKeys'

/** Clears mock auth session via the same path as Sign out (Zustand + persist). */
export function clearMockAuthSession(): void {
  useAuthStore.getState().logout()
}

/** Removes learner profile + progress marker + drafts for the current user (if any) before logout. */
export function clearLearnerBootstrapDataForCurrentUser(): void {
  if (typeof window === 'undefined') return
  const id = useAuthStore.getState().user?.id
  if (!id) return
  try {
    window.localStorage.removeItem(userProfileStorageKey(id))
    window.localStorage.removeItem(legacyLearnerProfileStorageKey(id))
    window.localStorage.removeItem(userProgressManifestStorageKey(id))
    window.localStorage.removeItem(legacyProgressRootStorageKey(id))
    window.localStorage.removeItem(userDraftsStorageKey(id))
  } catch {
    /* ignore */
  }
}

/**
 * Dev/QA: after clearing bootstrap keys for the signed-in user, run the same cold-start wipe
 * the next bootstrap would perform (domains + empty retention + drafts). Call while signed in,
 * then reload or re-run bootstrap so `loadOrInitialize*` recreate profile/progress.
 */
export function devSimulateFirstLoginWipeForCurrentUser(): boolean {
  if (typeof window === 'undefined') return false
  const id = useAuthStore.getState().user?.id
  if (!id) return false
  clearLearnerBootstrapDataForCurrentUser()
  return runFirstLoginColdStartIfNeeded(id)
}
