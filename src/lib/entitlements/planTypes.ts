import type { BetaPlanId } from '@/lib/auth/mockAuthTypes'

export type { BetaPlanId }

/** Normalize session/registry plan for gating. Unknown → basic (conservative). */
export function normalizeProductPlan(plan: string | undefined | null): BetaPlanId {
  return plan === 'premium' ? 'premium' : 'basic'
}

export function isPremiumPlanId(plan: string | undefined | null): boolean {
  return normalizeProductPlan(plan) === 'premium'
}

export function planDisplayLabel(plan: BetaPlanId): string {
  return plan === 'premium' ? 'Premium' : 'Basic'
}
