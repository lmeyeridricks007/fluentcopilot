import { useAuthStore } from '@/store/authStore'
import { useOnboardingStore } from '@/store/onboardingStore'
import { usePremiumStore } from '@/store/premiumStore'
import {
  loadOrInitializeLearnerProfile,
  markLearnerProfileOnboardingComplete,
} from './bootstrapProfileLoader'
import { isReturningBetaUser } from './firstLoginGuards'
import { runFirstLoginColdStartIfNeeded } from './firstLoginInitializer'
import { getUserProfile } from '@/lib/storage/profileStorage'
import { loadOrInitializeProgressForUser } from './bootstrapProgressLoader'
import { resolveOnboardingState } from './onboardingStateResolver'
import { resolvePostBootstrapRoute } from './bootstrapRouter'
import type { AccountBootstrapResult } from './types'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import type { UserStateTypeBootstrap } from '@/lib/analytics/funnelAnalyticsTypes'
import { ROUTES } from '@/lib/routing/authRedirects'
import {
  getUserCurrentLevelSelfReportId,
  listPopulatedOnboardingSignalFields,
} from '@/lib/profile'
import { cefrFromLevelSelfReport } from '@/features/onboarding/onboardingOptions'
import {
  beginLearnerProfileHydration,
  finalizeLearnerProfileHydration,
} from '@/lib/profile/profileActions'
import {
  beginLearnerProgressHydration,
  finalizeLearnerProgressHydration,
} from '@/lib/progress/progressActions'

/**
 * Orchestrates post-auth hydration: learner profile, progress marker, onboarding resolution,
 * and Zustand alignment. Call after session is valid (login or restore).
 * Synchronous (localStorage) so guards can rely on state before paint.
 */
export function runAccountBootstrap(): AccountBootstrapResult | null {
  const { user, isAuthenticated } = useAuthStore.getState()
  if (!isAuthenticated || !user) return null

  beginLearnerProfileHydration(user.id)
  beginLearnerProgressHydration(user.id)

  track(ANALYTICS_EVENTS.bootstrap_started, { user_id: user.id })

  const returningBefore = isReturningBetaUser(user.id)
  const ranColdStart = runFirstLoginColdStartIfNeeded(user.id)
  if (ranColdStart) {
    track(ANALYTICS_EVENTS.first_login_cold_start, { user_id: user.id })
  } else if (returningBefore) {
    track(ANALYTICS_EVENTS.returning_user_detected, { user_id: user.id })
  }

  const profileResult = loadOrInitializeLearnerProfile(user)
  let profileDoc = profileResult.profile

  if (useAuthStore.getState().hasCompletedOnboarding && !profileDoc.onboardingComplete) {
    markLearnerProfileOnboardingComplete(user.id)
    profileDoc = getUserProfile(user.id) ?? profileDoc
  }

  if (profileResult.wasCreated) {
    track(ANALYTICS_EVENTS.profile_initialized, { user_id: user.id })
  } else {
    track(ANALYTICS_EVENTS.profile_loaded, { user_id: user.id })
  }
  if (profileResult.recovery) {
    track(ANALYTICS_EVENTS.bootstrap_recovery_triggered, { domain: 'profile', user_id: user.id })
  }

  const progressResult = loadOrInitializeProgressForUser(user.id)
  if (progressResult.recovery) {
    track(ANALYTICS_EVENTS.bootstrap_recovery_triggered, { domain: 'progress_root', user_id: user.id })
  }
  if (progressResult.wasCreated) {
    track(ANALYTICS_EVENTS.progress_initialized, { user_id: user.id })
  } else {
    track(ANALYTICS_EVENTS.progress_loaded, { user_id: user.id })
  }

  finalizeLearnerProgressHydration(user.id, progressResult.root)

  const onboarding = resolveOnboardingState(profileDoc)

  useAuthStore.getState().setOnboardingComplete(onboarding.kind === 'complete')

  if (onboarding.kind === 'resume') {
    useOnboardingStore.getState().hydrateFromBootstrap(onboarding.step, onboarding.data)
    track(ANALYTICS_EVENTS.onboarding_routed, { user_id: user.id, mode: 'resume', step: onboarding.step })
    track(ANALYTICS_EVENTS.onboarding_resume_loaded, {
      user_id: user.id,
      step: onboarding.step,
      fields_present: listPopulatedOnboardingSignalFields(profileDoc),
    })
  } else if (onboarding.kind === 'fresh') {
    useOnboardingStore.getState().reset()
    track(ANALYTICS_EVENTS.onboarding_routed, { user_id: user.id, mode: 'fresh' })
  } else {
    useOnboardingStore.getState().reset()
    track(ANALYTICS_EVENTS.onboarding_routed, { user_id: user.id, mode: 'complete' })
  }

  const effectivePlan = profileDoc.plan ?? user.plan
  if (effectivePlan) {
    usePremiumStore.getState().setPremium(effectivePlan === 'premium')
  }

  finalizeLearnerProfileHydration(user.id, profileDoc)

  const selfReportId = getUserCurrentLevelSelfReportId(profileDoc)
  const profileCefr =
    profileDoc.currentLevel?.trim() ||
    (selfReportId ? cefrFromLevelSelfReport(selfReportId) : undefined)
  if (profileCefr) {
    const desired = profileDoc.desiredLevel?.trim()
    useAuthStore.getState().updateProfile({
      currentLevel: profileCefr,
      ...(desired ? { targetLevel: desired } : {}),
    })
  }

  const targetRoute = resolvePostBootstrapRoute(onboarding)
  if (targetRoute === ROUTES.onboarding && (ranColdStart || profileResult.wasCreated)) {
    track(ANALYTICS_EVENTS.new_user_routed_to_onboarding, { user_id: user.id })
  }
  if (onboarding.kind === 'complete') {
    track(ANALYTICS_EVENTS.app_home_routed, { user_id: user.id, surface: 'bootstrap' })
  }

  let userStateType: UserStateTypeBootstrap
  if (ranColdStart) {
    userStateType = 'new'
  } else if (returningBefore) {
    userStateType = 'returning'
  } else {
    userStateType = 'session_initialized'
  }

  track(ANALYTICS_EVENTS.bootstrap_completed, {
    user_id: user.id,
    target: targetRoute,
    had_existing_profile: !profileResult.wasCreated,
    had_existing_progress: !progressResult.wasCreated,
    onboarding_complete: onboarding.kind === 'complete',
    user_plan: effectivePlan ?? user.plan,
    user_state_type: userStateType,
  })

  return {
    userId: user.id,
    profile: profileDoc,
    onboarding,
    firstLoginColdStart: ranColdStart,
    recovery: {
      profileReset: profileResult.recovery,
      progressReset: progressResult.recovery,
      onboardingReset: false,
    },
    targetRoute,
  }
}
