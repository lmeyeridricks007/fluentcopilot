'use client'

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuthStore, type UserProfile } from '@/store/authStore'
import { usePremiumStore } from '@/store/premiumStore'
import { mockAuthService } from './mockAuthService'
import type { AuthSessionUser } from './authTypes'
import { isMockAuthLoginError } from './authTypes'
import { validatePersistedAuthState } from './sessionStorage'
import { applyMockSignInSession } from '@/lib/auth/applyMockSignInSession'
import { runAccountBootstrap } from '@/lib/bootstrap/accountBootstrap'
import { resetLearnerProfileForDev } from '@/lib/profile/profileActions'
import { attachLearnerProgressAutoRefresh } from '@/lib/progress/progressRefreshListeners'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import {
  normalizeMockLoginFailureReason,
  trackLoginAttempted,
  trackLoginFailed,
  trackLoginSucceeded,
} from '@/lib/analytics/authAnalytics'

export interface AuthContextValue {
  /** False until Zustand persist has rehydrated and session validation has run. */
  isReady: boolean
  isAuthenticated: boolean
  hasCompletedOnboarding: boolean
  /** Full persisted profile bootstrap slice (includes session fields). */
  user: UserProfile | null
  /** Narrow session identity for guards and headers — derived from `user`. */
  sessionUser: AuthSessionUser | null
  login: (
    credentials: { email: string; password: string },
    options?: { loginSurface?: string },
  ) => Promise<void>
  logout: () => void
  /** Re-run persisted session validation (e.g. after external storage changes). */
  restoreSession: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

function profileToSessionUser(user: UserProfile): AuthSessionUser {
  return {
    userId: user.id,
    displayName: user.name,
    email: user.email,
    plan: user.plan ?? 'basic',
    betaAccessAllowed: user.betaAccessAllowed !== false,
    authProviderType: user.authProviderType ?? 'mock_beta',
    loginAt: user.loginAt ?? new Date(0).toISOString(),
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const hasCompletedOnboarding = useAuthStore((s) => s.hasCompletedOnboarding)
  const user = useAuthStore((s) => s.user)
  const logoutStore = useAuthStore((s) => s.logout)

  const restoreSession = useCallback(() => {
    const s = useAuthStore.getState()
    const validated = validatePersistedAuthState({
      isAuthenticated: s.isAuthenticated,
      user: s.user,
    })

    if (!validated.ok) {
      if (s.isAuthenticated) {
        track(ANALYTICS_EVENTS.session_restore_failed, { reason: 'invalid_shape' })
        logoutStore()
      }
      return
    }

    if (validated.isAuthenticated && validated.user) {
      track(ANALYTICS_EVENTS.session_restored, {
        user_id: validated.user.id,
        user_plan: validated.user.plan ?? 'basic',
        session_type: 'restored',
      })
      const plan = validated.user.plan
      usePremiumStore.getState().setPremium(plan === 'premium')
      runAccountBootstrap()
    }
  }, [logoutStore])

  useEffect(() => {
    track(ANALYTICS_EVENTS.session_bootstrap_started, { surface: 'auth_provider' })
    let cancelled = false
    const finish = () => {
      if (cancelled) return
      restoreSession()
      setIsReady(true)
      track(ANALYTICS_EVENTS.session_bootstrap_completed, { surface: 'auth_provider' })
    }

    if (useAuthStore.persist.hasHydrated()) {
      finish()
    } else {
      const unsub = useAuthStore.persist.onFinishHydration(() => finish())
      return () => {
        cancelled = true
        unsub()
      }
    }
    return () => {
      cancelled = true
    }
  }, [restoreSession])

  useEffect(() => {
    if (!isReady || !isAuthenticated || !user?.id) return
    return attachLearnerProgressAutoRefresh()
  }, [isReady, isAuthenticated, user?.id])

  useEffect(() => {
    if (typeof window === 'undefined' || process.env.NODE_ENV !== 'development') return
    const w = window as unknown as {
      __LT_CLEAR_MOCK_AUTH__?: () => void
      __LT_RESET_LEARNER_PROFILE__?: () => void
    }
    w.__LT_CLEAR_MOCK_AUTH__ = () => {
      logoutStore()
    }
    w.__LT_RESET_LEARNER_PROFILE__ = () => {
      const id = useAuthStore.getState().user?.id
      if (id) resetLearnerProfileForDev(id)
    }
    return () => {
      delete w.__LT_CLEAR_MOCK_AUTH__
      delete w.__LT_RESET_LEARNER_PROFILE__
    }
  }, [logoutStore])

  const login = useCallback(
    async (
      credentials: { email: string; password: string },
      options?: { loginSurface?: string },
    ) => {
      const loginSurface = options?.loginSurface ?? 'auth_provider_default'
      const hadSession = useAuthStore.getState().isAuthenticated
      trackLoginAttempted({
        login_surface: loginSurface,
        auth_provider_type: 'mock_beta',
        has_existing_session: hadSession,
      })
      try {
        const session = await mockAuthService.signIn(credentials)
        applyMockSignInSession(session)
        trackLoginSucceeded({
          user_id: session.userId,
          user_plan: session.plan,
          login_surface: loginSurface,
          auth_provider_type: String(session.authProviderType ?? 'mock_beta'),
          invited_user: session.betaAccessAllowed !== false,
        })
      } catch (e) {
        const code = isMockAuthLoginError(e) ? e.code : 'unknown'
        trackLoginFailed({
          failure_reason: normalizeMockLoginFailureReason(code),
          login_surface: loginSurface,
          auth_provider_type: 'mock_beta',
        })
        throw e
      }
    },
    [],
  )

  const logout = useCallback(() => {
    track(ANALYTICS_EVENTS.logout_clicked, { surface: 'auth_provider' })
    logoutStore()
  }, [logoutStore])

  const sessionUser = user && isAuthenticated ? profileToSessionUser(user) : null

  const value = useMemo<AuthContextValue>(
    () => ({
      isReady,
      isAuthenticated,
      hasCompletedOnboarding,
      user,
      sessionUser,
      login,
      logout,
      restoreSession,
    }),
    [
      isReady,
      isAuthenticated,
      hasCompletedOnboarding,
      user,
      sessionUser,
      login,
      logout,
      restoreSession,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
