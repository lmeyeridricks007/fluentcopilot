'use client'

import { useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useLearnerProfileStore } from './profileStore'
import {
  getCurrentPlan,
  getSelectedPathway,
  isOnboardingComplete,
} from './profileSelectors'
import {
  mergeLearnerProfilePatch,
  mergeLearnerPreferences,
  resetLearnerProfileForDev,
  setLearnerSelectedPathway,
} from './profileActions'
import { markLearnerProfileOnboardingComplete } from '@/lib/bootstrap/bootstrapProfileLoader'
import type { UserProfileDocumentV1 } from '@/lib/storage/storageTypes'
import type { SelectedPathwayId } from './profileTypes'
import type { OnboardingData } from '@/store/onboardingStore'

/**
 * Consumer API for the stable learner profile layer (identity, plan, onboarding, pathway, preferences).
 * Session/auth remains the source of “who is logged in”; this hook exposes that user’s durable profile.
 */
export function useProfile() {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const status = useLearnerProfileStore((s) => s.status)
  const document = useLearnerProfileStore((s) => s.document)
  const storeUserId = useLearnerProfileStore((s) => s.userId)
  const error = useLearnerProfileStore((s) => s.error)

  const aligned = Boolean(user?.id && storeUserId === user.id)
  const isProfileReady = aligned && status === 'ready' && document != null
  const isProfileError = status === 'error'
  const isProfileLoading =
    isAuthenticated && !isProfileError && (!aligned || status === 'loading' || document == null)

  const effectivePlan = getCurrentPlan(aligned ? document : null, user?.plan)
  const onboardingComplete = document && aligned ? isOnboardingComplete(document) : false
  const selectedPathway = document && aligned ? getSelectedPathway(document) : undefined

  const updateProfile = useCallback(
    (patch: Partial<UserProfileDocumentV1>) => {
      if (!user?.id) return null
      return mergeLearnerProfilePatch(user.id, patch)
    },
    [user?.id]
  )

  const setPreferences = useCallback(
    (prefs: Record<string, unknown>) => {
      if (!user?.id) return
      mergeLearnerPreferences(user.id, prefs)
    },
    [user?.id]
  )

  const setSelectedPathway = useCallback(
    (path: SelectedPathwayId) => {
      if (!user?.id) return
      setLearnerSelectedPathway(user.id, path)
    },
    [user?.id]
  )

  const markOnboardingComplete = useCallback(
    (answers?: Partial<OnboardingData>) => {
      if (!user?.id) return null
      return markLearnerProfileOnboardingComplete(user.id, answers)
    },
    [user?.id]
  )

  const resetProfileForTesting = useCallback(() => {
    if (typeof window === 'undefined' || process.env.NODE_ENV !== 'development') return null
    if (!user?.id) return null
    return resetLearnerProfileForDev(user.id)
  }, [user?.id])

  return {
    profile: aligned ? document : null,
    isProfileReady,
    isProfileLoading,
    isProfileError,
    profileError: error,
    effectivePlan,
    onboardingComplete,
    selectedPathway,
    updateProfile,
    setPreferences,
    setSelectedPathway,
    markOnboardingComplete,
    resetProfileForTesting,
  }
}
