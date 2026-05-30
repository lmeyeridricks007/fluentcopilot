import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import {
  createDefaultUserProfile,
  getUserProfile,
  setUserProfile,
} from '@/lib/storage/profileStorage'
import type { UserProfileDocumentV1 } from '@/lib/storage/storageTypes'
import { useLearnerProfileStore } from './profileStore'
import { usePremiumStore } from '@/store/premiumStore'
import { normalizeProductPlan } from '@/lib/entitlements'
import { getUserTargetPathId } from './profileSelectors'
import type { SelectedPathwayId } from './profileTypes'
import { isSelectedPathwayId } from './profileTypes'

function syncPremiumFromPlan(nextPlan: string | undefined, prevPlan: string | undefined): void {
  if (nextPlan === undefined) return
  if (prevPlan === nextPlan) return
  usePremiumStore.getState().setPremium(normalizeProductPlan(nextPlan) === 'premium')
}

function trackProfilePersistenceSideEffects(
  userId: string,
  prev: UserProfileDocumentV1 | null,
  next: UserProfileDocumentV1
): void {
  if (typeof window === 'undefined') return

  if (prev?.onboardingComplete !== next.onboardingComplete) {
    track(ANALYTICS_EVENTS.onboarding_completion_state_changed, {
      user_id: userId,
      onboarding_complete: next.onboardingComplete,
    })
  }

  const prevPath = prev ? getUserTargetPathId(prev) : undefined
  const nextPath = getUserTargetPathId(next)
  if (prevPath !== nextPath && nextPath !== undefined) {
    track(ANALYTICS_EVENTS.selected_pathway_updated, {
      user_id: userId,
      previous_path: prevPath ?? null,
      selected_pathway: nextPath,
    })
  }
}

/**
 * Write the learner profile to user-scoped storage and refresh the in-memory store
 * when it belongs to the active hydration user.
 */
export function persistLearnerProfileDocument(doc: UserProfileDocumentV1): void {
  const userId = doc.userId
  const prev = getUserProfile(userId)
  setUserProfile(doc)
  const reRead = getUserProfile(userId) ?? doc

  const store = useLearnerProfileStore.getState()
  if (store.userId === userId) {
    store.hydrate(userId, reRead)
  }

  syncPremiumFromPlan(reRead.plan, prev?.plan)
  trackProfilePersistenceSideEffects(userId, prev, reRead)

  if (typeof window !== 'undefined' && prev != null) {
    const changed =
      JSON.stringify({ ...prev, updatedAt: '', syncMeta: undefined }) !==
      JSON.stringify({ ...reRead, updatedAt: '', syncMeta: undefined })
    if (changed) {
      track(ANALYTICS_EVENTS.profile_updated, { user_id: userId })
    }
  }
}

/** Call once per bootstrap after the profile document is fully resolved (including repair paths). */
export function finalizeLearnerProfileHydration(userId: string, doc: UserProfileDocumentV1): void {
  if (doc.userId !== userId) return
  useLearnerProfileStore.getState().hydrate(userId, doc)
  if (typeof window !== 'undefined') {
    track(ANALYTICS_EVENTS.plan_state_loaded, {
      user_id: userId,
      plan: doc.plan ?? null,
    })
  }
}

export function beginLearnerProfileHydration(userId: string): void {
  useLearnerProfileStore.getState().beginHydration(userId)
}

export function clearLearnerProfileStore(): void {
  useLearnerProfileStore.getState().clear()
}

export function mergeLearnerProfilePatch(
  userId: string,
  patch: Partial<UserProfileDocumentV1>
): UserProfileDocumentV1 | null {
  const base = getUserProfile(userId) ?? createDefaultUserProfile(userId)
  if (patch.userId != null && patch.userId !== userId) return null

  const nextPreferences =
    patch.preferences !== undefined
      ? { ...(base.preferences ?? {}), ...patch.preferences }
      : base.preferences

  const merged: UserProfileDocumentV1 = {
    ...base,
    ...patch,
    userId,
    preferences: nextPreferences,
    updatedAt: new Date().toISOString(),
  }

  persistLearnerProfileDocument(merged)
  return merged
}

export function setLearnerSelectedPathway(userId: string, pathway: SelectedPathwayId): void {
  mergeLearnerProfilePatch(userId, { selectedPath: pathway })
}

export function setLearnerSelectedPathwayIfValid(userId: string, pathway: string): boolean {
  if (!isSelectedPathwayId(pathway)) return false
  setLearnerSelectedPathway(userId, pathway)
  return true
}

export function mergeLearnerPreferences(userId: string, preferencesPatch: Record<string, unknown>): void {
  const base = getUserProfile(userId) ?? createDefaultUserProfile(userId)
  mergeLearnerProfilePatch(userId, {
    preferences: { ...(base.preferences ?? {}), ...preferencesPatch },
  })
}

/** Replace the entire document (e.g. recovery). Prefer merge helpers for normal updates. */
export function replaceLearnerProfileDocument(doc: UserProfileDocumentV1): void {
  persistLearnerProfileDocument(doc)
}

/** Development: wipe persisted learner profile for a user and re-hydrate the store. */
export function resetLearnerProfileForDev(userId: string): UserProfileDocumentV1 {
  const fresh = createDefaultUserProfile(userId)
  persistLearnerProfileDocument(fresh)
  return fresh
}
