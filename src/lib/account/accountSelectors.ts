import type { UserProfileDocumentV1 } from '@/lib/storage/storageTypes'
import type { UserProfile } from '@/store/authStore'
import type { AccountIdentityView } from './types'

/**
 * Session user is the sign-in identity (mock registry today). Profile `displayName` / `email`
 * may diverge after edits on Profile settings — we prefer session for “who you signed in as”.
 */
export function selectAccountIdentity(
  sessionUser: UserProfile | null,
  profileDoc: UserProfileDocumentV1 | null
): AccountIdentityView {
  const displayName =
    sessionUser?.name?.trim() ||
    profileDoc?.displayName?.trim() ||
    'Learner'
  const email = sessionUser?.email?.trim() || profileDoc?.email?.trim() || ''
  const isInviteBeta = sessionUser?.betaAccessAllowed !== false
  return { displayName, email, isInviteBeta }
}
