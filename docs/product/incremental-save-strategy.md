# Incremental save strategy

## Goals

Persist **meaningful** learner state as it is earned—not only when a long flow ends—so refresh, tab crash, or mid-flow exit loses as little as possible. Writes stay **user-scoped** and flow through existing storage helpers and stores ([`localstorage-schema.md`](./localstorage-schema.md), [`profile-state-layer.md`](./profile-state-layer.md), [`progress-state-layer.md`](./progress-state-layer.md)).

## Principles

1. **Save on meaningful change** — completions, submitted answers, onboarding step advance, settings commit, scenario checkpoints.
2. **Milestone = immediate** — do not debounce events that must survive sudden unload (completions, submissions, step next).
3. **Debounce noisy churn** — rapid onboarding field edits coalesce (~400ms) before hitting the profile document once.
4. **Central entry points** — prefer `@/lib/persistence` bridges and domain services over raw `localStorage` in UI.
5. **No ephemeral UI** — do not persist toggles, hover, animation, or transient loading flags unless product requires resume.

## Immediate vs debounced

| Mode | Examples |
|------|-----------|
| **Immediate** | Lesson completion (`recordLessonComplete` → retention disk); review card submit (SRS/mastery/mistakes); KNM / skill-track / practice-exam writes; guided scenario checkpoint after each state change; onboarding **Next** (`persistOnboardingStepImmediate`); settings save → learner profile sync; speaking simulation question scored. |
| **Debounced** | Onboarding answers while editing same step (`ONBOARDING_DATA_DEBOUNCE_MS`, default 400ms). |

Composer typing in guided scenarios is **not** persisted per keystroke; **turn submit** updates React state → checkpoint effect writes drafts.

## Implementation map

| Area | Behavior |
|------|-----------|
| **Lessons** | Retention already saves on `recordLessonComplete`. Schema lessons additionally save `stepIndex` under `drafts.activeLessonState[schemaLesson:…]` and restore on load; checkpoint cleared on lesson complete. Progress snapshot refreshed after completion. |
| **Review** | Each `submitCard` already writes SRS/mastery/mistakes via `localReviewPersistence`; `refreshProgressAfterDomainWrite` runs after persistence. |
| **Practice (guided)** | `guidedScenarioCheckpoint` stores a serializable slice in drafts; hydrate once when `userId` is available; save on `state` changes; clear when phase `complete`. |
| **Practice (other)** | Scenario/skill progress modules already write on milestone events; custom events (`lt-kmn-progress-updated`, `lt-skill-track-progress-updated`, `lt-practice-exam-attempts-updated`, existing practice/mastery events) trigger progress snapshot refresh via `attachLearnerProgressAutoRefresh`. |
| **Exams** | Practice exam attempts: write + event. Speaking simulation: refresh progress snapshot after each scored question. |
| **Onboarding** | Debounced coalesced draft + **immediate** persist when advancing a step. |
| **Settings** | `ProfileSettingsPage` `handleSave` → `updateProfile` (session) + `syncSessionUserToLearnerProfile` (durable `lt.v1.profile`). Learning UI prefs remain on `ProgressManifestV1.learningUi` via `mergeLearningUiPreferences` when those controls exist. |

## Analytics / debugging

`incremental_save_triggered`, `incremental_save_completed`, `incremental_save_failed` fire around bridged saves that use `runIncrementalSave` (onboarding immediate step, debounced coalesce wrapper, profile sync). Domain modules retain their existing product events (`onboarding_profile_updated`, `review_*`, etc.).

## Failure handling

- Low-level ports use `safeStorage` / try-catch where applicable; quota or disabled storage should not crash the app.
- `runIncrementalSave` catches synchronous throws and emits `incremental_save_failed`.
- Invalid guided checkpoints are discarded and the session starts fresh.

## User switching

All keys are `userId`-scoped (`userProfileStorageKey`, `userDraftsStorageKey`, retention, review shards, etc.). In-memory profile/progress stores clear on logout; incremental saves never target a global shared progress blob.

## Code map

| Module | Role |
|--------|------|
| `src/lib/persistence/persistencePolicy.ts` | Debounce constants, default domain modes |
| `src/lib/persistence/saveStrategies.ts` | `runIncrementalSave`, `createDebouncedFlush` |
| `src/lib/persistence/profilePersistenceBridge.ts` | Onboarding flush, session → learner profile |
| `src/lib/persistence/progressPersistenceBridge.ts` | `refreshProgressAfterDomainWrite` |
| `src/lib/storage/guidedScenarioCheckpoint.ts` | Guided scenario draft slice |
| `src/lib/storage/schemaLessonCheckpoint.ts` | Schema lesson step index |

## Next step

**Resume UX for remaining autosaved sessions** — Speaking simulation and reading practice exam already persist snapshots where wired; add explicit restore flows like writing/listening (see [`autosave-strategy.md`](./autosave-strategy.md)).
