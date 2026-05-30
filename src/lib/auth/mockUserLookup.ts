/**
 * Centralized rules for mock beta identity lookup.
 * UI and mockAuthService should use these helpers instead of ad hoc `.find` on the array.
 */

import { MOCK_BETA_TEMPORARY_PASSWORD } from './mockAuthConstants'
import type { BetaPlanId } from './mockAuthTypes'
import type { MockBetaRegistryRecord } from './mockAuthTypes'
import { MOCK_BETA_INVITED_USERS } from './mockUsers'

export function normalizeBetaEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function getMockBetaUserByEmail(email: string): MockBetaRegistryRecord | undefined {
  const key = normalizeBetaEmail(email)
  return MOCK_BETA_INVITED_USERS.find((u) => normalizeBetaEmail(u.email) === key)
}

export function isInvitedBetaUser(email: string): boolean {
  return getMockBetaUserByEmail(email) != null
}

export function getMockUserPlan(email: string): BetaPlanId | null {
  const u = getMockBetaUserByEmail(email)
  return u?.plan ?? null
}

/** True when the email is on the registry, active, and explicitly allowed beta access. */
export function canAccessClosedBeta(email: string): boolean {
  const u = getMockBetaUserByEmail(email)
  return u != null && u.isActive && u.betaAccessAllowed
}

export type ValidateMockBetaCredentialsResult =
  | { ok: true; user: MockBetaRegistryRecord }
  | {
      ok: false
      code: 'not_found' | 'inactive' | 'access_denied' | 'password_invalid'
    }

/**
 * Validates email + password against the mock registry. No network I/O.
 */
export function validateMockBetaCredentials(
  email: string,
  password: string
): ValidateMockBetaCredentialsResult {
  const user = getMockBetaUserByEmail(email)
  if (!user) return { ok: false, code: 'not_found' }
  if (!user.isActive) return { ok: false, code: 'inactive' }
  if (!user.betaAccessAllowed) return { ok: false, code: 'access_denied' }
  if (password !== MOCK_BETA_TEMPORARY_PASSWORD) {
    return { ok: false, code: 'password_invalid' }
  }
  return { ok: true, user }
}

/** Read-only list for devtools / support. */
export function listMockBetaInviteEmails(): string[] {
  return MOCK_BETA_INVITED_USERS.map((u) => u.email)
}

/** Product-facing alias — same as {@link getMockBetaUserByEmail}. */
export const getMockUserByEmail = getMockBetaUserByEmail

/** Product-facing alias — same as {@link validateMockBetaCredentials}. */
export const validateMockUserCredentials = validateMockBetaCredentials

/** Alias for spec / future `AuthPort` naming. */
export const validateMockCredentials = validateMockBetaCredentials

/** True when registry row may sign in (active + beta flag). */
export function canLoginToClosedBeta(user: MockBetaRegistryRecord): boolean {
  return user.isActive && user.betaAccessAllowed
}
