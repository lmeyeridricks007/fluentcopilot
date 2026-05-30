import { persistEmptyRetentionProfile, wipeLocalStorageKeysForColdStart } from './wipeUserProgressDomains'
import { createEmptyDraftsDocument, setUserDrafts } from '@/lib/storage/draftStorage'
import { shouldRunFirstLoginColdStart } from './firstLoginGuards'

/**
 * First-login cold start: empty slate for this `userId` on this device.
 * Caller must still run `loadOrInitializeLearnerProfile` / `loadOrInitializeProgressForUser` after.
 */
export function runFirstLoginColdStartIfNeeded(userId: string): boolean {
  if (!shouldRunFirstLoginColdStart(userId)) return false
  wipeLocalStorageKeysForColdStart(userId)
  persistEmptyRetentionProfile(userId)
  setUserDrafts(userId, createEmptyDraftsDocument(userId))
  return true
}
