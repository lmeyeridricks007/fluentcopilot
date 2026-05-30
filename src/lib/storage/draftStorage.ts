import { draftsDocumentV1Schema } from './storageSchemas'
import { safeGetItem, safeWriteJson } from './safeStorage'
import { userDraftsStorageKey } from './storageKeys'
import {
  DRAFTS_DOCUMENT_SCHEMA_VERSION,
  type DraftsDocumentV1,
} from './storageTypes'

function nowIso(): string {
  return new Date().toISOString()
}

export function createEmptyDraftsDocument(userId: string): DraftsDocumentV1 {
  const t = nowIso()
  return {
    schemaVersion: DRAFTS_DOCUMENT_SCHEMA_VERSION,
    userId,
    updatedAt: t,
    onboardingDraftLocation: 'profile',
  }
}

export function getUserDrafts(userId: string): DraftsDocumentV1 {
  const raw = safeGetItem(userDraftsStorageKey(userId))
  if (!raw) return createEmptyDraftsDocument(userId)
  try {
    const json = JSON.parse(raw) as unknown
    const r = draftsDocumentV1Schema.safeParse(json)
    if (r.success && r.data.userId === userId) {
      return r.data as DraftsDocumentV1
    }
  } catch {
    /* corrupt → reset disposable drafts */
  }
  return createEmptyDraftsDocument(userId)
}

export function setUserDrafts(userId: string, drafts: DraftsDocumentV1): void {
  const next: DraftsDocumentV1 = {
    ...drafts,
    userId,
    schemaVersion: DRAFTS_DOCUMENT_SCHEMA_VERSION,
    updatedAt: nowIso(),
  }
  safeWriteJson(userDraftsStorageKey(userId), next)
}
