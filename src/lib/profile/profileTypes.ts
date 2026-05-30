/**
 * Profile-facing types for learner intent / onboarding signals.
 * Canonical persisted document shape lives in `@/lib/storage/storageTypes` (`UserProfileDocumentV1`).
 *
 * Session/auth owns: isAuthenticated, loginAt, session bootstrap, persisted auth envelope.
 * This module + `UserProfileDocumentV1` own: durable identity copy, plan, onboarding, pathway, preferences.
 */

export type { RoutinePreferencesV1, UserProfileDocumentV1 } from '@/lib/storage/storageTypes'

/** Stable pathway ids from onboarding `TARGET_PATH_OPTIONS` — canonical `selectedPath` / target path. */
export const SELECTED_PATHWAY_IDS = ['a2', 'a2_mastery', 'exam_prep', 'b1'] as const

export type SelectedPathwayId = (typeof SELECTED_PATHWAY_IDS)[number]

export function isSelectedPathwayId(v: string | undefined | null): v is SelectedPathwayId {
  return typeof v === 'string' && (SELECTED_PATHWAY_IDS as readonly string[]).includes(v)
}
