/**
 * Session contract for mock auth: the persisted bytes live under Zustand `persist` (`auth-storage`).
 * This module maps that envelope to a typed `SessionDocumentV1` and clears it on sign-out helpers.
 */
import {
  AUTH_PERSIST_STORAGE_KEY,
  userDraftsStorageKey,
  userProfileStorageKey,
  userProgressManifestStorageKey,
} from './storageKeys'
import { sessionDocumentV1Schema } from './storageSchemas'
import { SESSION_DOCUMENT_SCHEMA_VERSION, type SessionDocumentV1 } from './storageTypes'
import { safeGetItem, safeRemoveItem } from './safeStorage'
import {
  parseAuthStorageEnvelope,
  validatePersistedAuthState,
} from '@/lib/auth/sessionStorage'

export { AUTH_PERSIST_STORAGE_KEY } from './storageKeys'

export function clearSessionStorage(): void {
  safeRemoveItem(AUTH_PERSIST_STORAGE_KEY)
}

export function getSessionDocumentFromStorage(): SessionDocumentV1 | null {
  const raw = safeGetItem(AUTH_PERSIST_STORAGE_KEY)
  if (!raw) return null
  const env = parseAuthStorageEnvelope(raw)
  if (!env?.state) return null
  const v = validatePersistedAuthState(env.state)
  if (!v.ok) return null
  if (!v.isAuthenticated || !v.user) return null

  const st = env.state as Record<string, unknown>
  const sessionUpdatedAt =
    typeof st.sessionUpdatedAt === 'string' ? st.sessionUpdatedAt : v.user.loginAt ?? new Date().toISOString()

  const doc: SessionDocumentV1 = {
    schemaVersion: SESSION_DOCUMENT_SCHEMA_VERSION,
    updatedAt: sessionUpdatedAt,
    userId: v.user.id,
    email: v.user.email,
    displayName: v.user.name,
    plan: v.user.plan,
    authProviderType: v.user.authProviderType,
    loginAt: v.user.loginAt,
    betaAccessAllowed: v.user.betaAccessAllowed !== false,
    onboardingComplete: st.hasCompletedOnboarding === true,
    zustandPersistVersion: typeof env.version === 'number' ? env.version : undefined,
  }

  const check = sessionDocumentV1Schema.safeParse(doc)
  return check.success ? doc : null
}

/** Dev / support: list primary LT keys for a user (not every domain blob). */
export function listInspectableKeysForUser(userId: string): string[] {
  return [
    AUTH_PERSIST_STORAGE_KEY,
    userProfileStorageKey(userId),
    userProgressManifestStorageKey(userId),
    userDraftsStorageKey(userId),
  ]
}
