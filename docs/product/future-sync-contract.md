# Future sync contract (design)

**Status:** Architecture and data contract only — **no live network sync** in this step.  
**Goal:** Keep today’s local-first beta compatible with future server durability, cross-device continuity, and periodic sync without repainting boundaries later.

---

## 1. Overview

The app today treats **localStorage (user-scoped)** as the on-device source of truth. The learner model is already split into:

| Layer | Role |
|-------|------|
| **Session** | Who is signed in, routing mirror (`onboardingComplete` flag), lightweight identity cache |
| **Profile** | `UserProfileDocumentV1` — stable learner data, onboarding outcomes, preferences, plan copy |
| **Progress** | `ProgressManifestV1` + **domain blobs** (retention, review shards, missions, etc.) |
| **Drafts** | `DraftsDocumentV1` — disposable autosave / active session payloads |

Future sync adds a **server-backed durability layer** and **cross-device reconciliation**. UX remains **local-first**: reads/writes stay fast on device; sync is asynchronous, retryable, and non-blocking for core interactions.

---

## 2. Sync principles

1. **Local-first UX** — UI reads/writes local documents first; network is eventual consistency, not a gate for every tap.
2. **Server-backed durability later** — Server holds authoritative snapshots (or event logs where needed) for recovery and multi-device.
3. **Profile and progress sync separately** — Different change rates, conflict rules, and payloads; never one opaque “user blob.”
4. **Explicit versioning** — Every syncable document/slice carries `schemaVersion` (shape) plus logical **revision** metadata for conflict detection (`updatedAt` minimum; optional monotonic `localRevision` / opaque `serverRevision`).
5. **Dirty tracking** — Local mutations mark entities **dirty** until a successful push; clears on ack or explicit discard policy.
6. **Canonical entity boundaries** — Completed lessons, submitted exam attempts, SRS items = canonical. Drafts and in-flight simulations = non-canonical until promoted.
7. **Safe recovery** — Failed sync does not corrupt local state; retries use queued payloads; user can keep learning offline.
8. **Resumable sync** — Idempotent upserts keyed by `userId` + entity id + revision; partial domain success does not require full re-upload of all domains.
9. **Selective sync by domain** — Push/pull **profile document** and **progress domains** independently to limit payload size and blast radius.
10. **No ephemeral UI in sync** — Zustand UI flags, modal open state, scroll position, dev tools — never synced.

---

## 3. What syncs vs what does not

### A. Must sync (canonical, cross-device value)

| Area | Notes |
|------|--------|
| **Profile document** | Full `UserProfileDocumentV1` payload (or patch series with same merge rules) — onboarding answers, completion, pathway, preferences, mirrored identity fields used for learning |
| **Progress manifest** | `ProgressManifestV1` minus purely derived cache — `domains` registry, `learningUi` if product decides cross-device (recommended **yes** for continuity) |
| **Retention profile** | XP, streaks, completed lesson ids, weekly XP, abilities metadata — keyed as today |
| **Review / SRS / mistakes / mastery** | Shard payloads (or future normalized tables); merge by item id |
| **Exam attempts & comparable history** | Append-only **attempt records** + server or client **recomputed summaries** |
| **Mission runtime** | Canonical mission state for cross-device missions |
| **Ability mastery / schema mistakes** | As represented in current domain keys |
| **KNM / practice exam attempt stores** | Domain keys under user scope |

### B. Might sync later / optional

| Area | Notes |
|------|--------|
| **Drafts document** | Cross-device “resume writing” is product-dependent; v1 server sync can **omit** or **optional channel** with last-write-wins per logical autosave key |
| **activeExamSession / activeLessonState** | Same — prefer **local-only v1** unless explicit product requirement |
| **Session envelope** | Replaced by real IdP + server session; not “synced” as document — **refetched** on login |

### C. Remains local-only

| Area | Notes |
|------|--------|
| **Transient UI state** | All Zustand slices that are not persisted to profile/progress/drafts |
| **Loading / error flags** | Component state |
| **Demo scenario / dev tools** | `demoScenario`, dev utilities |
| **Analytics session** | Device/session correlation (may send events, not round-trip as learner state) |

---

## 4. Profile sync shape

### 4.1 Payload

**Unit of sync:** one **profile document** per `userId`, aligned with `UserProfileDocumentV1` (same field names and semantics).

Conceptual envelope:

```text
ProfileSyncPayload {
  userId
  schemaVersion          // document shape (already exists)
  createdAt, updatedAt   // client timestamps (already exist)
  ...all UserProfileDocumentV1 fields...
  syncMeta               // see §6 — extended at sync boundary if needed
}
```

### 4.2 Authoritative vs editable

| Field group | Client-editable today | Server-owned later (likely) |
|-------------|----------------------|------------------------------|
| Onboarding data, pathway, preferences, levels, goals | Yes | Preferences/pathway remain client-originated; **server may validate** |
| `plan`, `betaAccessAllowed` | Written from mock registry / merge | **Server / billing** becomes source of truth; client **displays** and **caches** |
| `displayName`, `email` | Editable in settings (beta) | Server IdP profile may win on conflict |
| `userId` | Stable from auth | **Server assigns** in future; client never rewrites |

### 4.3 Patch vs full document

**Recommendation:** **Full-document upsert** for profile v1 sync (small JSON, simpler conflict rules).  
**Later:** optional **patch** API for frequent single-field updates if size or concurrency demands it — patches must include **base revision** or `updatedAt` precondition.

### 4.4 Adjustments before implementation

- `syncMeta` already exists on `UserProfileDocumentV1` — extend semantics in code when sync ships (see §6).
- No incompatible shape change required now; avoid adding heavy history inside profile.

---

## 5. Progress sync shape

### 5.1 Granularity

**Not** one giant JSON of everything. Recommended **domain-sliced** sync aligned with existing keys:

| Slice id | Storage today | Sync unit |
|----------|----------------|-----------|
| `manifest` | `lt.v1.progress.<userId>` | Whole manifest (small); includes `learningUi`, `domains` registry |
| `retention` | `language-tutor-retention-profile-v1:<userId>` | Whole blob or future normalized row set |
| `review_bank` | `reviewStorageKeys.bank(userId)` | Shard or paginated chunks if size grows |
| `review_srs` | `reviewStorageKeys.srs(userId)` | Same |
| `review_mistakes` | `reviewStorageKeys.mistakes(userId)` | Same |
| `review_mastery` | `reviewStorageKeys.mastery(userId)` | Same |
| `ability_mastery` | `abilityMasteryStorageKeys.forUser(userId)` | Whole blob |
| `mission_runtime` | `missionStorageKeys.runtimeForUser(userId)` | Whole blob |
| `schema_mistakes` | Pattern `language-tutor-schema-mistakes-v1:<userId>` | Whole blob |
| `practice_domains` | `userScopedLocalKey(PRACTICE_DOMAIN_BASE_KEYS.*, userId)` | Group or per-key sync (see below) |

Each slice carries its own **metadata** (at minimum `updatedAt`; see §6). The **manifest** is the **index**: server or client can sync manifest after domains or use manifest-only pull to discover staleness.

### 5.2 Append-only vs replaceable

| Data | Strategy |
|------|----------|
| **Practice exam attempts** (if stored as append log) | **Append-only** records with idempotency keys; summaries recomputed |
| **Retention / SRS** | **Replaceable document** or CRDT-like per-item merge (pragmatic: last-write-wins per item id with `updatedAt`) |
| **Mission runtime** | Replaceable snapshot |
| **Manifest** | Replaceable with revision check |

### 5.3 Practical scope for first server implementation

1. Profile full document.  
2. Manifest + retention + mission runtime (highest user-visible value).  
3. Review shards.  
4. Remaining practice-domain keys.  

---

## 6. Dirty / version / metadata contract

### 6.1 Existing placeholder (`StorageSyncMetaV1`)

```ts
documentVersion: 1
lastSyncedAt?: string    // last successful ack from server
serverRevision?: string  // opaque server cursor / etag
dirty?: boolean          // local changes not yet acknowledged
```

### 6.2 Recommended extensions when implementing sync

| Field | Required | Meaning |
|-------|----------|---------|
| `schemaVersion` (top-level doc) | Yes | Client-side shape version for migrations |
| `updatedAt` | Yes | ISO; bumped on any local mutation that should sync |
| `createdAt` | Where creation matters | Profile, manifest |
| `dirty` | Yes (per sync unit) | `true` after local write; `false` after successful push ack |
| `lastSyncedAt` | Yes after first sync | Server time or client time of last successful pull/push ack |
| `serverRevision` | Recommended | Opaque string from server for If-Match / conflict detection |
| `localRevision` | Optional | Monotonic integer incremented on each local mutation (simplifies ordering) |
| `syncStatus` | Optional UI | `idle` \| `pushing` \| `pulling` \| `error` — **UI/queue only**, not persisted on document if avoidable |

### 6.3 Lifecycle

| Event | Metadata |
|-------|----------|
| Local edit | `updatedAt` = now; `dirty` = true; optional `localRevision++` |
| Push success | `dirty` = false; `lastSyncedAt` = now; `serverRevision` = response value |
| Push conflict | Keep local `dirty` true or enter `conflict` workflow; do not silently drop local |
| Pull success | Merge per policy; update `serverRevision`; `dirty` only if local had concurrent edits |

**Where it lives:** Continue on **profile**, **progress manifest**, and optionally **per domain wrapper** (if domain JSON does not embed `syncMeta`, add a sidecar record server-side or wrap `{ meta, body }` in API only — avoid breaking every reader today).

---

## 7. Entity-level vs document-level

| Entity | Sync as |
|--------|---------|
| Profile | **Single document** (full upsert) |
| Progress manifest | **Single document** |
| Retention | **Single blob** per user (v1) |
| Review | **Per-shard document** or paginated |
| Exam attempts | **Append-only stream** + derived aggregates |
| Drafts | **Omit v1** or **optional** per-key |
| Practice domain keys | **Per logical key** or batched **practice_bundle** slice |

**Overkill to avoid now:** Full event sourcing for all UX; global CRDT across all fields.

---

## 8. Periodic sync strategy (future)

### Triggers (recommended set)

1. **After successful login / token refresh** — pull server snapshot → reconcile → hydrate.  
2. **App foreground** (mobile/PWA) — debounced pull + flush dirty queue.  
3. **Connectivity regained** — flush queue + pull.  
4. **Debounced interval** while app active (e.g. 5–15 min) — pull + push dirty only.  
5. **After milestone writes** — profile onboarding step save, lesson complete, exam submit — enqueue immediate push (non-blocking UI).  
6. **Before sign-out (optional)** — best-effort flush dirty queue (short timeout).

### Behavior

- **Optimistic local writes** — always; sync catches up.  
- **Outbox queue** — persistent queue of `{ sliceId, payload, revision }` for retries.  
- **Failures** — exponential backoff; silent retry; **optional** subtle “Sync paused” indicator later.  
- **No blocking modal** on routine sync failure.

---

## 9. Hydration strategy on login

### Ordered steps (future)

1. **Authenticate** — obtain `userId` + tokens.  
2. **Load local** profile/progress for `userId` (current bootstrap).  
3. **Fetch server** profile + progress pointers/revisions.  
4. **Reconcile** per §10.  
5. **Hydrate** stores (`finalizeLearnerProfileHydration`, `finalizeLearnerProgressHydration`, `refreshLearnerProgressSnapshot`).  
6. **Route** — onboarding vs home (same as today, driven by **reconciled** profile).

### Same device, returning user

- **Default:** If server revision newer → **server wins** for server-owned fields; **merge** progress per domain rules.  
- If **local dirty** and server also changed → **conflict** path (§10).

### New device, existing account

- **Pull** server as base; **empty local** → hydrate from server; **no merge** needed.  
- If server empty but product expects data → treat as new (rare).

### Local-only period (offline first use)

- Local accumulates with `dirty=true`; first online session pushes then pulls.

### Onboarding / resume

- **Onboarding completion** is profile-owned; after reconciliation, same guards as today.  
- **Resume** (lessons/simulations) uses local drafts + profile; if drafts not synced, resume stays **device-local** until policy changes.

---

## 10. Conflict resolution

**Default:** **Last-write-wins (LWW)** on `updatedAt` / `serverRevision` for scalar document replaces **where** both sides are whole-document snapshots.

### Exceptions

| Domain | Rule |
|--------|------|
| **onboardingComplete** | If either side `true`, prefer **true** (completion is absorbing); reconcile step data from the side that completed or newer `updatedAt` |
| **selectedPath** | Prefer **latest explicit user change** (timestamp); if tie, server optional default |
| **Lesson completed set** | **Union** of completed lesson ids; completion timestamps take max |
| **SRS / review items** | Per `itemId`: newer `updatedAt` wins; due dates/scheduling fields follow item-level merge spec |
| **Exam attempts** | **Append** by attempt id; reject duplicate ids |
| **XP / streaks** | **Do not double-count** — prefer server ledger or max-of-monotonic counters with event ids; early impl: **server wins** for totals if both changed, log anomaly |
| **Plan / entitlements** | **Server wins** when billing connected |
| **Drafts** | If synced: LWW per autosave key by `updatedAt`; else local-only |

---

## 11. Draft / active-session policy

**Initial recommendation (v1 server sync):**

- **Do not sync** `DraftsDocumentV1` to server.  
- **Canonical** state = completed lesson, submitted exam, persisted review outcomes.  
- **Resume** for in-progress work remains **same-device** unless product later opts into draft sync.

**Rationale:** Lower complexity, fewer conflict surfaces, aligns with “drafts are disposable” in `localstorage-schema.md`.

---

## 12. Server-owned vs client-owned

| Concern | Today | Future |
|---------|--------|--------|
| **userId** | Client/auth | Server IdP subject |
| **plan, betaAccessAllowed** | Registry → profile mirror | **Server** (billing/feature flags) |
| **email, displayName** | Client + profile | **IdP + profile** sync |
| **Onboarding / pathway / prefs** | Client-generated | Client-generated, **server persisted** |
| **Progress / XP / completions** | Client-generated | Client-generated, **server persisted** |
| **Readiness summaries** | May be derived locally | May be **recomputed server-side**; sync **result** only |
| **Session** | Local persist | **Token + server session**; not a synced document |

---

## 13. API direction (conceptual only)

### Likely endpoints

- `GET /v1/me/profile` — snapshot + `serverRevision`  
- `PUT /v1/me/profile` — full document or conditional upsert  
- `GET /v1/me/progress/manifest`  
- `PUT /v1/me/progress/manifest`  
- `GET/PUT /v1/me/progress/domains/:sliceId` — per-slice  
- `POST /v1/me/exam-attempts` — append idempotent  
- `GET /v1/me/sync/status` — optional queue health  

### Model

**Mixed:** **Snapshot** for profile + manifest + most domains; **append** for attempts; **conditional** headers (`If-Match: serverRevision`) for optimistic concurrency.

### Client mental model

- **Push:** dirty slices → outbox → PUT/POST until ack.  
- **Pull:** GET with `since` or etag → merge → update local + clear dirty where server wins without local pending edits.

---

## 14. Recommended client module layout (future)

```
src/lib/sync/
  syncTypes.ts              // payloads, slice ids, metadata
  syncPolicy.ts             // what syncs, triggers, feature flags
  profileSyncContract.ts    // map UserProfileDocumentV1 ↔ wire DTO
  progressSyncContract.ts   // slice registry, serializers
  syncQueue.ts              // outbox persistence
  syncConflictResolution.ts // pure merge functions per domain
  syncHydration.ts          // post-login orchestration
  syncRetryPolicy.ts        // backoff, max attempts
```

**Responsibilities:** types + pure merges + queue; **no** UI; called from a thin `SyncCoordinator` service (future).

---

## 15. Changes recommended now (minimal)

| Change | Priority | Note |
|--------|----------|------|
| Keep **bumping `updatedAt`** on all profile/progress writes | Already norm | Enforce in code reviews |
| **Document** `syncMeta` semantics | Done (this doc) | Implement fields when sync starts |
| Optional: add **`localRevision`** to `StorageSyncMetaV1` | Low | Only when implementing queue |
| Avoid new **cross-domain** writes inside profile | Ongoing | Keeps profile sync unit small |
| **Exam attempts:** prefer append-only storage patterns for new features | Medium | Easier server append API |

**No mandatory code change** required for contract acceptance; existing types already include `syncMeta` placeholders.

---

## Related docs

- [`localstorage-schema.md`](./localstorage-schema.md)  
- [`profile-state-layer.md`](./profile-state-layer.md)  
- [`progress-state-layer.md`](./progress-state-layer.md)  
- [`auth-user-state-architecture.md`](./auth-user-state-architecture.md)  
- [`account-session-bootstrap.md`](./account-session-bootstrap.md)  
- [`incremental-save-strategy.md`](./incremental-save-strategy.md)  
- [`autosave-strategy.md`](./autosave-strategy.md)  
- [`dev-test-utilities.md`](./dev-test-utilities.md)  

---

## Next step

**Add analytics around auth, onboarding, profile, and plan-based usage** to measure funnels before investing in sync implementation.
