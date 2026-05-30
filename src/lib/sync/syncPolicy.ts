/**
 * Frozen policy constants for future sync — no I/O.
 * @see docs/product/future-sync-contract.md
 */
import type { DraftsSyncPolicy } from './syncTypes'

/** v1 server sync: drafts not in default scope. */
export const DEFAULT_DRAFTS_SYNC_POLICY: DraftsSyncPolicy = 'local_only_v1'

/** Profile document is one sync unit (full upsert v1). */
export const PROFILE_SYNC_UNIT = 'full_document' as const

/** Progress uses domain slices, not a single mega-blob. */
export const PROGRESS_SYNC_GRANULARITY = 'domain_slices' as const
