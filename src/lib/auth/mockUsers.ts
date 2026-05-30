/**
 * Invite-only closed beta registry — single source of truth for mock logins.
 * Do not add progress, completions, or onboarding answers here.
 */

import { MOCK_BETA_AUTH_SOURCE, MOCK_BETA_TEMPORARY_PASSWORD } from './mockAuthConstants'
import type { MockBetaRegistryRecord } from './mockAuthTypes'

const row = (
  partial: Omit<
    MockBetaRegistryRecord,
    'authSource' | 'temporaryPassword' | 'createdForBeta' | 'onboardingDefaultState' | 'betaAccessAllowed'
  > & { betaAccessAllowed?: boolean }
): MockBetaRegistryRecord => ({
  ...partial,
  betaAccessAllowed: partial.betaAccessAllowed ?? true,
  temporaryPassword: MOCK_BETA_TEMPORARY_PASSWORD,
  authSource: MOCK_BETA_AUTH_SOURCE,
  createdForBeta: true,
  onboardingDefaultState: 'pending',
})

/**
 * Invited beta users. Password for all: `MOCK_BETA_TEMPORARY_PASSWORD` (`password`).
 */
export const MOCK_BETA_INVITED_USERS: readonly MockBetaRegistryRecord[] = [
  row({
    id: 'beta-lee-hotmail',
    displayName: 'Lee',
    email: 'leemeyeridricks@hotmail.com',
    plan: 'premium',
    isActive: true,
    notes: 'Premium tier',
  }),
  row({
    id: 'beta-lee-gmail',
    displayName: 'Lee',
    email: 'leemeyeridricks@gmail.com',
    plan: 'basic',
    isActive: true,
    notes: 'Basic tier — distinct from hotmail account',
  }),
  row({
    id: 'beta-aneta',
    displayName: 'Aneta',
    email: 'aneta.dolinska@gmail.com',
    plan: 'premium',
    isActive: true,
  }),
  row({
    id: 'beta-alexis',
    displayName: 'Alexis',
    email: 'alexis@gmail.com',
    plan: 'premium',
    isActive: true,
  }),
  row({
    id: 'beta-marius',
    displayName: 'Marius',
    email: 'marius@gmail.com',
    plan: 'premium',
    isActive: true,
  }),
  row({
    id: 'beta-sharon',
    displayName: 'Sharon',
    email: 'sharon@gmail.com',
    plan: 'premium',
    isActive: true,
  }),
] as const
