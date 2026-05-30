/**
 * Session-facing auth types for closed-beta mock auth.
 * Aligns with docs/product/auth-user-state-architecture.md §5 (session vs profile).
 */

import type { BetaPlanId } from './mockAuthTypes'
import type { MockBetaAuthSource } from './mockAuthConstants'

/** What the IdP / mock registry exposes for “who is signed in” — no progress or onboarding payloads. */
export interface AuthSessionUser {
  userId: string
  displayName: string
  email: string
  plan: BetaPlanId
  betaAccessAllowed: boolean
  authProviderType: MockBetaAuthSource | string
  loginAt: string
}

/** Bootstrap fields stored in auth slice until a dedicated profile store owns them. */
export interface MockAuthProfileBootstrap {
  nativeLanguage: string
  currentLevel: string
  targetLevel: string
}

export interface MockSignInSuccess extends AuthSessionUser, MockAuthProfileBootstrap {}

export type MockCredentialFailureCode =
  | 'not_found'
  | 'inactive'
  | 'access_denied'
  | 'password_invalid'

/** Thrown by mock auth; safe `instanceof Error` + `code` for UI mapping. */
export type MockAuthLoginError = Error & {
  code: MockCredentialFailureCode | 'signup_closed' | 'unknown'
}

export function isMockAuthLoginError(err: unknown): err is MockAuthLoginError {
  return (
    err instanceof Error &&
    'code' in err &&
    typeof (err as MockAuthLoginError).code === 'string'
  )
}
