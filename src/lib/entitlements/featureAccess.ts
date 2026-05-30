import type { UserProfile } from '@/store/authStore'
import type { FeatureKey } from './featureKeys'
import { canAccessFeature as planAllows } from './planRules'
import { normalizeProductPlan, type BetaPlanId } from './planTypes'

export function resolvePlanFromUser(user: UserProfile | null | undefined): BetaPlanId {
  return normalizeProductPlan(user?.plan)
}

export function canAccessFeatureForUser(user: UserProfile | null | undefined, key: FeatureKey): boolean {
  return planAllows(resolvePlanFromUser(user), key)
}

export { canAccessFeature } from './planRules'
