import type { MockBetaAuthSource } from './mockAuthConstants'

/** Product plan for entitlements — keep in sync with marketing & premium gating. */
export type BetaPlanId = 'basic' | 'premium'

/** Onboarding has not run in profile stores until the user completes the in-app flow. */
export type MockOnboardingDefaultState = 'pending'

/**
 * One invited beta tester row. Identity / access only — no progress, lessons, or settings history.
 * Replace lookup with IdP or API user object later; keep `id` + `email` + `plan` stable where possible.
 */
export interface MockBetaRegistryRecord {
  /** Stable id for profile/progress namespacing (future). */
  id: string
  displayName: string
  /** Primary login identifier; matched case-insensitively. */
  email: string
  plan: BetaPlanId
  betaAccessAllowed: boolean
  /**
   * Expected password for this beta phase. All invited rows currently share
   * `MOCK_BETA_TEMPORARY_PASSWORD` — not unique per-user secrets.
   */
  temporaryPassword: string
  authSource: MockBetaAuthSource
  isActive: boolean
  createdForBeta: true
  onboardingDefaultState: MockOnboardingDefaultState
  /** Optional internal note (not shown to users). */
  notes?: string
}
