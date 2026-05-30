import { getUserProfile } from '@/lib/storage/profileStorage'
import { getUserProgress } from '@/lib/storage/progressStorage'
import { LOCAL_ANONYMOUS_LEARNER_ID } from '@/lib/storage/storageKeys'

/**
 * First login (cold start) = authenticated beta user has **no** valid persisted profile **and**
 * **no** valid progress manifest yet. Not keyed off session login count.
 *
 * - **Returning user:** at least one of profile or progress already valid on disk → no cold start.
 * - **Recovery:** corrupt JSON can yield both null → cold start runs wipe + fresh init (same as first login).
 * - **Partial orphan:** profile without progress or the reverse → not cold start; missing piece is
 *   created without wiping the other (see `accountBootstrap`).
 */
export function shouldRunFirstLoginColdStart(userId: string): boolean {
  if (typeof window === 'undefined') return false
  if (!userId || userId === LOCAL_ANONYMOUS_LEARNER_ID) return false
  const hasProfile = getUserProfile(userId) !== null
  const hasProgress = getUserProgress(userId) !== null
  return !hasProfile && !hasProgress
}

export function isReturningBetaUser(userId: string): boolean {
  if (typeof window === 'undefined') return false
  if (!userId || userId === LOCAL_ANONYMOUS_LEARNER_ID) return false
  return getUserProfile(userId) !== null && getUserProgress(userId) !== null
}
