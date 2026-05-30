'use client'

import { useMemo } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useLearnerProfileStore } from '@/lib/profile/profileStore'
import { getCurrentPlan } from '@/lib/profile/profileSelectors'
import {
  canAccessFeatureForUser,
  isPremiumPlanId,
  planDisplayLabel,
  type BetaPlanId,
  type FeatureKey,
} from '@/lib/entitlements'

export function useProductEntitlements() {
  const user = useAuthStore((s) => s.user)
  const document = useLearnerProfileStore((s) => s.document)
  const storeUserId = useLearnerProfileStore((s) => s.userId)
  const status = useLearnerProfileStore((s) => s.status)

  const profileAligned = Boolean(user?.id && storeUserId === user.id && status === 'ready')
  const plan = useMemo(() => {
    const effective = getCurrentPlan(profileAligned ? document : null, user?.plan)
    return effective
  }, [profileAligned, document, user?.plan])

  const isPremiumPlan = plan === 'premium'

  const userForGates = useMemo(() => {
    if (!user) return null
    return { ...user, plan }
  }, [user, plan])

  return {
    plan,
    planLabel: planDisplayLabel(plan),
    isPremiumPlan,
    /** Effective plan (durable profile when hydrated, else session). */
    hasPremiumPlan: isPremiumPlanId(plan),
    canAccess: (key: FeatureKey) => canAccessFeatureForUser(userForGates, key),
  }
}

export type ProductEntitlements = {
  plan: BetaPlanId
  planLabel: string
  isPremiumPlan: boolean
  hasPremiumPlan: boolean
  canAccess: (key: FeatureKey) => boolean
}
