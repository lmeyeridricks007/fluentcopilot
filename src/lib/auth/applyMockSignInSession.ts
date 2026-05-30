/**
 * Applies a successful mock registry sign-in to client stores and runs account bootstrap.
 * Shared by `AuthProvider.login` and dev-tools user switching.
 */
import { runAccountBootstrap } from '@/lib/bootstrap/accountBootstrap'
import { useAuthStore } from '@/store/authStore'
import { usePremiumStore } from '@/store/premiumStore'
import type { MockSignInSuccess } from './authTypes'

export function applyMockSignInSession(session: MockSignInSuccess): void {
  usePremiumStore.getState().setPremium(session.plan === 'premium')
  useAuthStore.getState().setAuthenticated({
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
  })
  runAccountBootstrap()
}
