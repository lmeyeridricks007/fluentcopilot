/**
 * Future sync contract — types only (no network). See docs/product/future-sync-contract.md.
 * Aligns with StorageSyncMetaV1 on profile/progress/drafts documents.
 */
import type { StorageSyncMetaV1 } from '@/lib/storage/storageTypes'

/** Runtime queue / UI — not persisted on learner documents by default. */
export type SyncRunStatus = 'idle' | 'pushing' | 'pulling' | 'error' | 'conflict_pending'

/**
 * Extends the persisted sync placeholder when implementing server sync.
 * Documents may keep only StorageSyncMetaV1 until then.
 */
export type SyncEntityMetadataV1 = StorageSyncMetaV1 & {
  /** Optional monotonic counter per local mutation (sync implementation). */
  localRevision?: number
  /** Client-only: last error code for diagnostics. */
  lastSyncErrorCode?: string
}

/** Progress domain slices — matches progress manifest + storageKeys responsibilities. */
export const PROGRESS_DOMAIN_SLICE_IDS = [
  'manifest',
  'retention',
  'review_bank',
  'review_srs',
  'review_mistakes',
  'review_mastery',
  'ability_mastery',
  'mission_runtime',
  'schema_mistakes',
  'practice_client_bundle',
] as const

export type ProgressDomainSliceId = (typeof PROGRESS_DOMAIN_SLICE_IDS)[number]

/** Wire-level envelope for a single slice (future API). */
export type ProgressSliceSyncEnvelopeV1 = {
  v: 1
  userId: string
  sliceId: ProgressDomainSliceId
  /** Raw JSON string or parsed object per transport choice */
  payload: unknown
  updatedAt: string
  syncMeta?: SyncEntityMetadataV1
}

/** Wire-level envelope for profile (future API). */
export type ProfileSyncEnvelopeV1 = {
  v: 1
  userId: string
  /** Mirrors UserProfileDocumentV1 — import type at call sites to avoid circular deps */
  profile: unknown
  syncMeta?: SyncEntityMetadataV1
}

export type DraftsSyncPolicy = 'local_only_v1' | 'optional_per_key_later'

export type ConflictStrategyKind =
  | 'lww_updated_at'
  | 'server_wins'
  | 'union_ids'
  | 'append_only'
  | 'per_item_merge'
  | 'onboarding_complete_absorbing'
