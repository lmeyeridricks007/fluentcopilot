# localStorage schema (Language Tutor)

Canonical contract for **local-first** persistence during closed beta. Implementation lives under `src/lib/storage/`. Read and write through the exported helpers — not raw `localStorage` — except inside low-level ports that are gradually being aligned with `storageKeys`.

## Design principles

1. **User-scoped data** — Every durable document keyed by `userId` (or by a deterministic function of it). The only cross-user global pointer is the **auth persist** envelope (`auth-storage`), which holds *who is signed in*, not their full profile or progress.
2. **No shared progress blob** — Completed lesson/SRS/retention state is never stored under a single key shared across users; domains use per-user suffixes.
3. **Versioned payloads** — Each document includes `schemaVersion` (and optional `syncMeta.documentVersion` later). Migrations run on read in one place (`storageMigrations.ts` + parse paths in `*Storage.ts`).
4. **Timestamps** — `createdAt` / `updatedAt` (and session `sessionUpdatedAt` in Zustand) support debugging, migrations, and future sync conflict handling.
5. **Stable profile vs mutable progress** — Profile holds identity-relevant and preference-like fields plus onboarding; progress manifest points at domain keys and does not duplicate heavy history inside one JSON blob.
6. **Local-first, sync-ready** — Types allow optional `syncMeta` (`dirty`, `lastSyncedAt`, `serverRevision`) without implementing sync yet.
7. **Safe parse / recovery** — Invalid JSON or schema mismatch → return `null` or reinitialize a **safe default** (never throw in UI paths). Session invalidation clears auth persist; profile/progress/drafts reset to empty defaults when unrecoverable.

## Key namespace

| Logical | Key pattern | Notes |
|--------|-------------|--------|
| Auth session (Zustand) | `auth-storage` | **Do not rename** without migration. Envelope: `{ state, version }`. |
| Profile | `lt.v1.profile.<userId>` | Canonical. Legacy read: `lt.v1.learner-profile.<userId>` (promoted on successful read). |
| Progress manifest | `lt.v1.progress.<userId>` | Canonical. Legacy read: `lt.v1.progress-root.<userId>`. |
| Drafts | `lt.v1.drafts.<userId>` | Disposable UI state. |
| Retention | `language-tutor-retention-profile-v1:<userId>` | Existing domain store. |
| Review v4 | `language-tutor-v4-review-bank-<userId>`, `…-srs-`, `…-mistakes-`, `…-mastery-` | Built via `reviewStorageKeys` in `storageKeys.ts`. |

Practice/exam client state uses **`userScopedLocalKey(base, userId)`** (`storageKeys.ts`): authenticated users persist under `base:<userId>`; anonymous demo (`local-demo-user`) keeps the legacy unsuffixed `base` key. Cold-start wipe lists are in `coldStartWipeKeysForUser`. Other `language-tutor-*` keys may still be global (e.g. some feature prefs) — see [`first-login-initialization.md`](./first-login-initialization.md).

## Session schema (auth persist)

**Physical storage:** single key `auth-storage` (Zustand `persist`).

**Logical document:** `SessionDocumentV1` — see `getSessionDocumentFromStorage()` in `authPersistStorage.ts`. Fields include:

- `schemaVersion`, `updatedAt` (from `sessionUpdatedAt` in auth state, fallback `loginAt` / clock)
- `userId`, `email`, `displayName`, `plan`, `authProviderType`, `loginAt`, `betaAccessAllowed`
- `onboardingComplete` (routing flag, mirrored from Zustand)
- `zustandPersistVersion` (persist middleware version)

Session is **lightweight**: no full onboarding object, no progress payloads. Clear on sign-out via `logout()` / `clearSessionStorage()`.

## Profile schema (`UserProfileDocumentV1`)

Key: `lt.v1.profile.<userId>`.

- **Core:** `schemaVersion`, `userId`, `createdAt`, `updatedAt`, `onboardingComplete`, `onboardingStep`, `onboardingData`
- **Onboarding completion:** `onboardingCompletedAt?` (ISO) when `onboardingComplete` is explicitly set true
- **First start routing:** `onboardingStartExperienceV1?` (resolved route, pathway key, welcome copy, `decisionTrace`); optional `firstPersonalizedHandoffShownAt?` — see [onboarding-start-routing.md](./onboarding-start-routing.md)
- **Learner intent (stable ids, merged incrementally during onboarding):** `primaryGoalId?`, `learnerGoals?`, `currentLevelSelfReportId?`, `learningReasonId?`, `routinePreferences?` (`studyRhythmId`, `dailyMinutesCommitted?`)
- **Extended (optional):** `displayName`, `email`, `plan`, `betaAccessAllowed`, `selectedPath`, `currentLevel`, `desiredLevel`, `focusAreas`, `studyRhythm`, `preferences`
- **Sync placeholder:** `syncMeta?`

Helpers: `getUserProfile`, `setUserProfile`, `createDefaultUserProfile` (`profileStorage.ts`).

**Onboarding draft** for v1 remains on the **profile** document (`onboardingData` + `onboardingStep`), not in drafts — see drafts section. Incremental saves also mirror answers into top-level learner fields; see [onboarding-profile-persistence.md](./onboarding-profile-persistence.md).

## Progress schema (`ProgressManifestV1`)

Key: `lt.v1.progress.<userId>`.

- `schemaVersion`, `userId`, `createdAt`, `updatedAt`
- `domains`: registry of **string keys** pointing to retention, review shards, ability mastery, mission runtime, schema-mistakes pattern (see `buildProgressDomainsRegistry`)
- `learningUi?` — optional **mutable** learning-facing UI preferences (input mode, continuation, dismissals); see [`progress-state-layer.md`](./progress-state-layer.md)
- `syncMeta?`

Domain payloads stay in their existing keys for incremental updates. The manifest is the **top-level contract** and migration anchor when adding domains.

Helpers: `getUserProgress`, `setUserProgress`, `loadOrInitializeProgressForUser` (`progressStorage.ts`).

## Drafts schema (`DraftsDocumentV1`)

Key: `lt.v1.drafts.<userId>`.

- `schemaVersion`, `userId`, `updatedAt`
- `writingDrafts?` — includes **autosave envelopes** under stable logical keys (`autosave/v1/...` prefixes; see [`autosave-strategy.md`](./autosave-strategy.md))
- `activeExamSession?`, `activeLessonState?`
- `onboardingDraftLocation: 'profile'`-documents that onboarding draft is intentionally stored on the profile doc in v1

Helpers: `getUserDrafts`, `setUserDrafts`, `createEmptyDraftsDocument` (`draftStorage.ts`). Corrupt drafts → empty document (safe discard).

## Metadata & versioning

- Every major document: **`schemaVersion`** + **`updatedAt`** (and **`createdAt`** where creation matters).
- **Session:** `sessionUpdatedAt` in Zustand state (bumped on login, onboarding completion, profile updates while signed in).
- **Future sync:** extend with `syncMeta` consistently rather than ad hoc top-level fields.

## Migration strategy

1. Bump `schemaVersion` when the shape changes incompatibly.
2. Implement transforms in `storageMigrations.ts` (or co-located parse steps) — **pure functions**: old JSON → current type.
3. On read: detect old version → migrate → `set*` to persist new shape → return.
4. If migration is impossible, **reinitialize** safe defaults and log analytics (`bootstrap_recovery_triggered`) where applicable.
5. **Legacy keys** (`learner-profile`, `progress-root`) are promoted to canonical keys after a successful parse.

## Future server sync

Full contract (payloads, triggers, conflicts, hydration): **[`future-sync-contract.md`](./future-sync-contract.md)**.

- **Profile / progress** — candidates for periodic push/pull; `syncMeta.dirty` and `lastSyncedAt` reserved.
- **Drafts / active exam** — may remain device-local unless explicitly promoted.
- **Session** — likely local-only; server session would replace this envelope when moving off mock auth.

## Bootstrap / sign-out

- **First login:** `loadOrInitializeLearnerProfile` + `loadOrInitializeProgressForUser` create missing documents; retention defaults via `loadRetentionProfileSync`.
- **Sign-out:** `logout()` clears auth persist; profile/progress/drafts **remain** on disk for that `userId` so another login restores them.
- **Dev reset:** `clearLearnerBootstrapDataForCurrentUser()` removes canonical + legacy profile/progress keys and drafts for the current user.

## Code map

| Module | Role |
|--------|------|
| `storageKeys.ts` | All canonical key builders |
| `storageTypes.ts` | TypeScript types |
| `storageSchemas.ts` | Zod validation |
| `storageMigrations.ts` | Docs + legacy key removal helpers |
| `safeStorage.ts` | Safe get/set/parse |
| `profileStorage.ts` | Profile CRUD |
| `progressStorage.ts` | Progress manifest + init |
| `draftStorage.ts` | Drafts CRUD |
| `authPersistStorage.ts` | Session view + clear |
| `index.ts` | Barrel exports |

## Related docs

- [`incremental-save-strategy.md`](./incremental-save-strategy.md)
- [`account-session-bootstrap.md`](./account-session-bootstrap.md)
- [`auth-user-state-architecture.md`](./auth-user-state-architecture.md)
- [`mock-auth-implementation.md`](./mock-auth-implementation.md)
