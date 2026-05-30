/**
 * Feature-level mock auth API — maps lib session shapes to `AuthUser` for legacy call sites.
 */

import { mockAuthService as coreMockAuth } from '@/lib/auth/mockAuthService'
import type { MockSignInSuccess } from '@/lib/auth/authTypes'
import type {
  AuthApiResponse,
  AuthUser,
  LoginCredentials,
  SignUpPayload,
  ForgotPasswordPayload,
} from '../types'

function sessionToAuthUser(session: MockSignInSuccess): AuthUser {
  return {
    id: session.userId,
    name: session.displayName,
    email: session.email,
    nativeLanguage: session.nativeLanguage,
    currentLevel: session.currentLevel,
    targetLevel: session.targetLevel,
    plan: session.plan,
    betaAccessAllowed: session.betaAccessAllowed,
    loginAt: session.loginAt,
    authProviderType: session.authProviderType,
  }
}

export const mockAuthService = {
  signIn: coreMockAuth.signIn,

  async login(credentials: LoginCredentials): Promise<AuthApiResponse> {
    const session = await coreMockAuth.signIn(credentials)
    return { user: sessionToAuthUser(session) }
  },

  signUp: (payload: SignUpPayload) => coreMockAuth.signUp(payload),

  forgotPassword: (payload: ForgotPasswordPayload) => coreMockAuth.forgotPassword(payload),

  logout: coreMockAuth.logout,
}
