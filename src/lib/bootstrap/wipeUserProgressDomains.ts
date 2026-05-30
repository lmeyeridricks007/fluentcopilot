import { createDefaultRetentionProfile, saveRetentionProfileSync } from '@/lib/retention/persistence'
import {
  coldStartWipeKeysForUser,
  legacyLearnerProfileStorageKey,
  progressRetentionWipeKeysForUser,
  userProfileStorageKey,
} from '@/lib/storage/storageKeys'
import { safeRemoveItem } from '@/lib/storage/safeStorage'

/**
 * Remove all user-scoped persistence for cold start. Does not touch `auth-storage`.
 */
export function wipeLocalStorageKeysForColdStart(userId: string): void {
  for (const key of coldStartWipeKeysForUser(userId)) {
    safeRemoveItem(key)
  }
}

/** After keys are removed, persist an explicit empty retention row so XP/streak/lessons stay at zero. */
export function persistEmptyRetentionProfile(userId: string): void {
  saveRetentionProfileSync(createDefaultRetentionProfile(userId))
}

/** Removes only canonical + legacy **profile** documents for `userId`. */
export function wipeProfileDocumentsForUser(userId: string): void {
  safeRemoveItem(userProfileStorageKey(userId))
  safeRemoveItem(legacyLearnerProfileStorageKey(userId))
}

/**
 * Removes progress manifest, retention, review, missions, practice client keys — not profile or drafts.
 * Callers should re-run `loadOrInitializeProgressForUser` + progress hydration.
 */
export function wipeProgressRetentionDomainsForUser(userId: string): void {
  for (const key of progressRetentionWipeKeysForUser(userId)) {
    safeRemoveItem(key)
  }
}
