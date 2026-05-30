/**
 * Client session persistence for mock auth.
 *
 * The canonical persisted payload is written by Zustand `persist` (`auth-storage`).
 * This module validates that shape on rehydrate and exposes a dev escape hatch.
 */

/** Subset of `UserProfile` needed to validate persisted JSON (avoid importing the store here). */
export interface PersistedAuthUserSnapshot {
  id: string
  name: string
  email: string
  nativeLanguage: string
  currentLevel: string
  targetLevel: string
  plan?: string
  betaAccessAllowed?: boolean
  loginAt?: string
  authProviderType?: string
}

import { AUTH_PERSIST_STORAGE_KEY } from '@/lib/storage/storageKeys'

/** Must match `persist({ name })` on `useAuthStore`. */
export const AUTH_STORAGE_KEY = AUTH_PERSIST_STORAGE_KEY

type PersistEnvelope = {
  state?: unknown
  version?: number
}

export function readRawAuthStorage(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(AUTH_STORAGE_KEY)
  } catch {
    return null
  }
}

export function parseAuthStorageEnvelope(raw: string): PersistEnvelope | null {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (parsed && typeof parsed === 'object' && 'state' in parsed) {
      return parsed as PersistEnvelope
    }
  } catch {
    /* ignore */
  }
  return null
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object'
}

/**
 * True when persisted `user` has the minimum fields needed for a valid session.
 * Does not re-validate password or registry — only structural sanity after localStorage tampering.
 */
export function isValidSessionUserProfile(user: unknown): user is PersistedAuthUserSnapshot {
  if (!isRecord(user)) return false
  if (typeof user.id !== 'string' || user.id.length === 0) return false
  if (typeof user.email !== 'string' || user.email.length === 0) return false
  if (typeof user.name !== 'string') return false
  if (typeof user.nativeLanguage !== 'string') return false
  if (typeof user.currentLevel !== 'string') return false
  if (typeof user.targetLevel !== 'string') return false
  return true
}

export function validatePersistedAuthState(state: unknown): {
  ok: true
  isAuthenticated: boolean
  user: PersistedAuthUserSnapshot | null
} | { ok: false } {
  if (!isRecord(state)) return { ok: false }
  const isAuthenticated = state.isAuthenticated === true
  const user = state.user
  if (!isAuthenticated) {
    return { ok: true, isAuthenticated: false, user: null }
  }
  if (user == null) return { ok: false }
  if (!isValidSessionUserProfile(user)) return { ok: false }
  if (user.betaAccessAllowed === false) return { ok: false }
  return { ok: true, isAuthenticated: true, user }
}

/** Hard-remove persisted auth (use after `logout()` if you need a clean key; prefer store API). */
export function removeAuthStorageKey(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
