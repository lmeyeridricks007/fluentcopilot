/**
 * Mock closed-beta auth: credential check + session payload construction.
 * Replace this module with a real `AuthPort` implementation later; keep return shapes stable.
 */

import { MOCK_BETA_AUTH_SOURCE } from './mockAuthConstants'
import { normalizeBetaEmail, validateMockBetaCredentials } from './mockUserLookup'
import type { MockBetaRegistryRecord } from './mockAuthTypes'
import type { MockAuthLoginError, MockSignInSuccess } from './authTypes'
import { messageForMockCredentialFailure } from './loginFailureMessages'

const MOCK_DELAY_MS = 600

function delay(ms: number = MOCK_DELAY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function toLoginError(code: Parameters<typeof messageForMockCredentialFailure>[0]): MockAuthLoginError {
  const e = new Error(messageForMockCredentialFailure(code)) as MockAuthLoginError
  e.name = 'MockAuthLoginError'
  e.code = code
  return e
}

function registryToSignInSuccess(record: MockBetaRegistryRecord, loginAt: string): MockSignInSuccess {
  return {
    userId: record.id,
    displayName: record.displayName,
    email: normalizeBetaEmail(record.email),
    plan: record.plan,
    betaAccessAllowed: record.betaAccessAllowed,
    authProviderType: MOCK_BETA_AUTH_SOURCE,
    loginAt,
    nativeLanguage: 'en',
    currentLevel: 'A1',
    targetLevel: 'B1',
  }
}

export const mockAuthService = {
  /**
   * Validates registry + shared beta password; returns session snapshot (no progress/profile).
   */
  async signIn(input: { email: string; password: string }): Promise<MockSignInSuccess> {
    await delay()
    const result = validateMockBetaCredentials(input.email, input.password)
    if (!result.ok) {
      throw toLoginError(result.code)
    }
    const loginAt = new Date().toISOString()
    return registryToSignInSuccess(result.user, loginAt)
  },

  async signUp(_payload: { name: string; email: string; password: string }): Promise<never> {
    await delay()
    const e = new Error(
      'Public sign-up is closed during the beta. Sign in with your invite email or join the waitlist.',
    ) as MockAuthLoginError
    e.name = 'MockAuthLoginError'
    e.code = 'signup_closed'
    throw e
  },

  async forgotPassword(_payload: { email: string }): Promise<void> {
    await delay()
  },

  logout(): void {
    // Client-only; `AuthProvider` / store clears persistence.
  },
}
