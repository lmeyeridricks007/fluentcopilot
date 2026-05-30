/**
 * Central place for version transforms when reading from localStorage.
 *
 * Strategy:
 * - Each persisted document carries `schemaVersion` (and optional `syncMeta.documentVersion`).
 * - On read, if the version is older than current, run a pure transform → current shape, then write back.
 * - If data is irreparable, return null so callers reinitialize a clean document (never throw).
 * - Keep transforms small, testable, and ordered by version number.
 *
 * Hard reset is acceptable for disposable domains (drafts). For profile/progress, prefer transform
 * when the change is mechanical (rename field, split key).
 *
 * Promotion from legacy keys (same schema, different key prefix) is handled in `profileStorage.ts`
 * and `progressStorage.ts` on successful parse.
 */

import { safeRemoveItem } from './safeStorage'
import { legacyLearnerProfileStorageKey, legacyProgressRootStorageKey } from './storageKeys'

export function removeLegacyProfileKey(userId: string): void {
  safeRemoveItem(legacyLearnerProfileStorageKey(userId))
}

export function removeLegacyProgressKey(userId: string): void {
  safeRemoveItem(legacyProgressRootStorageKey(userId))
}

/** Placeholder for future versioned transforms (e.g. v1 → v2 field renames). */
export const profileMigrationChain = [] as const
export const progressMigrationChain = [] as const
