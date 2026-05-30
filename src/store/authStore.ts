import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BetaPlanId } from '@/lib/auth/mockAuthTypes'
import { AUTH_PERSIST_STORAGE_KEY } from '@/lib/storage/storageKeys'
import { usePremiumStore } from '@/store/premiumStore'
import { useOnboardingStore } from '@/store/onboardingStore'
import { clearLearnerProfileStore } from '@/lib/profile/profileActions'
import { clearLearnerProgressStore } from '@/lib/progress/progressActions'

function sessionNow(): string {
  return new Date().toISOString()
}

export interface UserProfile {
  id: string
  name: string
  email: string
  nativeLanguage: string
  currentLevel: string
  targetLevel: string
  /** Set on login from mock registry (or server later). */
  plan?: BetaPlanId
  betaAccessAllowed?: boolean
  /** ISO time set at successful mock sign-in; session metadata only. */
  loginAt?: string
  /** e.g. `mock_beta` — mirrors future IdP source. */
  authProviderType?: string
  targetObjective?: string
  country?: string
  timeInNetherlands?: string
  familyStatus?: string
  ageRange?: string
  workRole?: string
  industry?: string
  hobbies?: string[]
  notificationPreferences?: { email: boolean; push: boolean }
  dailyLearningGoalMinutes?: number
}

interface AuthState {
  isAuthenticated: boolean
  hasCompletedOnboarding: boolean
  user: UserProfile | null
  /** ISO timestamp — session document `updatedAt` (see `docs/product/localstorage-schema.md`). */
  sessionUpdatedAt: string | null
  setAuthenticated: (user: UserProfile | null) => void
  setOnboardingComplete: (complete: boolean) => void
  updateProfile: (patch: Partial<UserProfile>) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      hasCompletedOnboarding: false,
      user: null,
      sessionUpdatedAt: null,
      setAuthenticated: (user) =>
        set((s) => ({
          isAuthenticated: !!user,
          user,
          // Reset onboarding flag when switching users; preserve only for same id (e.g. re-hydrate). Bootstrap sets truth from profile immediately after login.
          hasCompletedOnboarding: user
            ? s.user?.id === user.id
              ? s.hasCompletedOnboarding
              : false
            : false,
          sessionUpdatedAt: user ? sessionNow() : null,
        })),
      setOnboardingComplete: (complete) =>
        set({ hasCompletedOnboarding: complete, sessionUpdatedAt: sessionNow() }),
      updateProfile: (patch) =>
        set((s) => ({
          user: s.user ? { ...s.user, ...patch } : null,
          sessionUpdatedAt: s.user ? sessionNow() : s.sessionUpdatedAt,
        })),
      logout: () => {
        clearLearnerProfileStore()
        clearLearnerProgressStore()
        usePremiumStore.getState().setPremium(false)
        useOnboardingStore.getState().reset()
        set({
          isAuthenticated: false,
          hasCompletedOnboarding: false,
          user: null,
          sessionUpdatedAt: null,
        })
      },
    }),
    { name: AUTH_PERSIST_STORAGE_KEY }
  )
)
