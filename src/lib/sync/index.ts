/**
 * Future client sync module — types and policy only until implementation.
 * @see docs/product/future-sync-contract.md
 */
export type {
  SyncRunStatus,
  SyncEntityMetadataV1,
  ProgressDomainSliceId,
  ProgressSliceSyncEnvelopeV1,
  ProfileSyncEnvelopeV1,
  DraftsSyncPolicy,
  ConflictStrategyKind,
} from './syncTypes'
export { PROGRESS_DOMAIN_SLICE_IDS } from './syncTypes'
export {
  DEFAULT_DRAFTS_SYNC_POLICY,
  PROFILE_SYNC_UNIT,
  PROGRESS_SYNC_GRANULARITY,
} from './syncPolicy'
