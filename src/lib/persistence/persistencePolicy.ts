/**
 * Rules for when to hit disk immediately vs coalesce rapid updates.
 * Milestone / submission events must never be debounced in a way that drops the last write before unload.
 */

import type { IncrementalSaveDomain, IncrementalSaveMode } from './types'

/** Default debounce for high-churn draft-style fields (ms). */
export const DEFAULT_DEBOUNCE_MS = 450

/** Onboarding answers: coalesce rapid field changes; step navigation also flushes immediately from the flow. */
export const ONBOARDING_DATA_DEBOUNCE_MS = 400

/**
 * Domains that should use immediate persistence for user-visible milestones.
 * (Implementation still chooses debounce per UX where only one effect runs after idle.)
 */
export function defaultSaveModeForDomain(domain: IncrementalSaveDomain): IncrementalSaveMode {
  switch (domain) {
    case 'onboarding':
      return 'debounced'
    case 'lessons':
    case 'practice':
    case 'review':
    case 'exams':
    case 'settings':
    case 'profile':
    case 'missions':
      return 'immediate'
    default:
      return 'immediate'
  }
}
