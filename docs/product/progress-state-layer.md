# Progress state layer (mutable learner progress)

## Purpose

The **learner progress layer** is the in-app aggregate for **mutable, per-user** learning data: lessons completion path, practice, review/SRS, exam prep activity, missions runtime, XP/streaks, lightweight readiness signals, **learning-facing UI preferences**, and **active/draft pointers** that mirror the drafts document.

It complements the **profile layer** ([`profile-state-layer.md`](./profile-state-layer.md)) and the **progress manifest** on disk ([`localstorage-schema.md`](./localstorage-schema.md)).

## Ownership

### The progress layer owns (mutable / activity)

- **Lessons** — completion lists and counts (sourced from retention profile on device).
- **Practice** — scenario/skill-track/ability-mastery **summaries** (counts and rollups; detailed maps stay in domain keys).
- **Review** — bank/SRS/mistake/mastery **counts** (full items stay in review shards).
- **Exams** — practice exam attempt counts, KNM topic activity, readiness attempt counts.
- **Missions** — `MissionRuntimeState` snapshot from mission runtime storage.
- **Engagement** — XP, streak, weekly XP (from retention).
- **Learning settings** — `ProgressManifestV1.learningUi` (preferred input mode, continuation behavior, dismissals, etc.) plus post-A2 pathway hints read from retention metadata.
- **Readiness** — lightweight estimates (e.g. schema mistake pattern key count).
- **Active** — non-authoritative flags: active exam session, in-progress lesson keys, writing draft count (canonical payloads live in **drafts** / domain stores).

### The progress layer does not own

- Stable identity, plan, onboarding completion, pathway selection — **profile**.
- Full review item payloads, full scenario maps, full exam histories — **domain localStorage** (see manifest `domains` registry).
- Onboarding questionnaire draft — **profile** document.
- Session auth — **auth store**.

### Drafts vs progress

- **`lt.v1.drafts.<userId>`** holds disposable **payloads** (`writingDrafts`, `activeExamSession`, `activeLessonState`).
- The progress snapshot’s **`active`** section only exposes **summary booleans/counts** so UI can gate “resume” flows without reading drafts everywhere. Prefer `getUserDrafts` / draft helpers when mutating those payloads.

## Top-level shape (`LearnerProgressSnapshotV1`)

Built by `buildLearnerProgressSnapshot(userId, manifest)`:

| Section | Role |
|--------|------|
| `manifest` | `ProgressManifestV1` (registry + `learningUi` + timestamps) |
| `lessons` | Completed lesson/module ids, ability/milestone counts |
| `practice` | Scenario/skill-track/mastery rollups |
| `review` | Shard sizes / mastery map sizes |
| `exams` | Exam prep / readiness rollups |
| `missions` | Mission runtime state |
| `engagement` | XP + streak + weekly leaderboard slice |
| `learningSettings` | `learningUi` + post-A2 metadata |
| `readiness` | Derived lightweight signals |
| `active` | Draft/session summary |

`schemaVersion` on the manifest remains the persisted anchor; `snapshotVersion` on the snapshot labels the in-memory aggregate shape.

## Hydration

1. **Bootstrap** — `beginLearnerProgressHydration(userId)` then `loadOrInitializeProgressForUser`, then `finalizeLearnerProgressHydration(userId, root)`.
2. **Refresh** — `refreshLearnerProgressSnapshot(userId)` re-reads all domains (after any domain write).
3. **Auto-refresh** — `attachLearnerProgressAutoRefresh()` listens for `RETENTION_UPDATED_EVENT`, `lt-practice-progress-updated`, `lt-mastery-updated`, `exam-readiness-storage-updated`, `lt-weakness-updated`.

## Sign-out / multi-user

- **Sign-out** clears the **Zustand progress store** only (`clearLearnerProgressStore`). **Per-user localStorage is not wiped** — the next login reloads that user’s progress.
- **User switch** — new bootstrap + finalize loads the correct `userId`; `user_progress_switched` fires when the newly finalized user differs from the last finalized user (that id is kept across sign-out so Lee → Sharon → Lee is detected).

## Updates

- Prefer **domain modules** (`retentionService`, scenario storage, review persistence, etc.) for writes, then **`refreshLearnerProgressSnapshot`** or rely on auto-refresh.
- **`markLessonComplete`** — wraps `recordLessonComplete` + refresh.
- **`mergeLearningUiPreferences`** — merges `manifest.learningUi` via `setUserProgress` + refresh.
- **`recordPracticeExamAttemptAndRefresh`** — wraps exam attempt append + refresh.

## Consumer hook

```tsx
import { useProgress } from '@/lib/progress'

const { progress, isProgressReady, refresh, mergeLearningSettings, markLessonComplete } = useProgress()
```

Use `isProgressReady` before trusting aggregates for dashboards that must not flash another user’s data.

## Future server sync

- Manifest and domains already support optional `syncMeta`.
- Refresh/rebuild pattern maps cleanly to “reconcile server revision → domain writes → `refreshLearnerProgressSnapshot`”.

## Related

- [`localstorage-schema.md`](./localstorage-schema.md) — keys and manifest.
- [`profile-state-layer.md`](./profile-state-layer.md) — stable profile boundary.

## Next step

**Add incremental save behavior everywhere important** — route remaining ad hoc `localStorage` writes through the centralized storage helpers and call `notifyProgressDomainChanged` or domain-specific saves + refresh so the progress layer stays authoritative in the UI.
