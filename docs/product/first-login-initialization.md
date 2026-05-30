# First-login initialization (closed beta)

## What “first login” means

**Cold start (first login on this device for this account)** is detected when **both** are true:

1. There is **no valid** persisted profile document (`lt.v1.profile.<userId>` / legacy learner-profile) for the signed-in user.
2. There is **no valid** progress manifest (`lt.v1.progress.<userId>` / legacy progress-root) for that user.

This is **not** based on session login count. Returning users always have at least one of those documents already.

| Situation | Cold start? |
|-----------|-------------|
| New invitee, never used this browser | Yes |
| Same user, second visit (profile + manifest exist) | No |
| Profile exists, manifest missing | No — create manifest only, **do not** wipe domains |
| Manifest exists, profile missing | No — create profile only |
| Corrupt JSON (both parse as invalid) | Treated like cold start → wipe + recreate empty slate |
| `local-demo-user` / anonymous | Cold start helper **does not** run (guarded) |

Implementation: `shouldRunFirstLoginColdStart` in `src/lib/bootstrap/firstLoginGuards.ts`.

## What runs on cold start

Order inside `runAccountBootstrap()` (`accountBootstrap.ts`):

1. `runFirstLoginColdStartIfNeeded(userId)` when the guard is true:
   - `wipeLocalStorageKeysForColdStart` — removes profile, manifest, drafts, retention shard, review shards, missions, ability mastery, schema mistakes, and **user-suffixed** practice/exam/A2 keys (see `coldStartWipeKeysForUser` in `storageKeys.ts`).
   - `persistEmptyRetentionProfile` — writes an explicit default retention row (0 XP, empty lessons, streak 0).
   - `setUserDrafts` — empty drafts document.
2. `loadOrInitializeLearnerProfile` — writes `createNewBetaUserProfile(user)` (registry identity + `isNewUser`, `firstLoginAt`, incomplete onboarding).
3. `loadOrInitializeProgressForUser` — new progress manifest + domain registry.
4. Onboarding resolution and routing (typically `/onboarding`).

## Empty profile (new beta user)

Created via `createNewBetaUserProfile` (`profileStorage.ts`):

- `userId`, `displayName` (session `name`), `email`, `plan`, `betaAccessAllowed` from mock session/registry.
- `currentLevel` / `desiredLevel` from session registry defaults (same as mock `UserProfile` — not onboarding form answers).
- `onboardingComplete: false`, `onboardingStep: 0`, `onboardingData: {}`.
- `preferences: { defaultsVersion: 1 }` (explicit clean defaults bucket).
- `isNewUser: true`, `firstLoginAt` (ISO).
- `schemaVersion`, `createdAt`, `updatedAt`.

## Empty progress

- Manifest: new `ProgressManifestV1` with `domains` pointing at per-user keys (all just cleared).
- Retention: default profile persisted (no completed lessons, no ledger entries).
- Review / SRS / mistakes / mastery: keys removed, then empty on first read.
- Practice surfaces previously using **global** keys are now **`baseKey:<userId>`** for authenticated users (`userScopedLocalKey` + `getRetentionUserId()`), so invitees do not inherit anonymous demo blobs.

## Marking “new user”

- **Primary:** `isNewUser: true` on the profile until onboarding completes.
- **After onboarding:** `markLearnerProfileOnboardingComplete` sets `isNewUser: false`.
- **Helper:** `effectiveIsNewUser(profile)` — `false` if onboarding complete; else uses explicit `isNewUser` or defaults legacy profiles to “still in first journey” when onboarding is incomplete.

## No preloaded content

- Cold start **removes** all listed keys for that `userId` before creating documents.
- Authenticated practice/exam/KMN/readiness/skill-track/milestone/weak-signals/continue/A2 queues use **per-user** storage keys; legacy unsuffixed keys remain for `local-demo-user` only.
- **Not cleared on cold start:** `auth-storage`, demo-only global scenario key (anonymous), device prefs stores (e.g. daily lesson UI prefs) — document if product later requires user-scoping those too.

## Multi-user isolation

Each invitee has distinct `userId` in mock auth; all wiped/created keys include that id. Signing out does not delete another user’s shards.

## Analytics

Events in `ANALYTICS_EVENTS`: `first_login_cold_start`, `returning_user_detected`, `new_user_routed_to_onboarding` (plus existing bootstrap/profile/progress events).

`AccountBootstrapResult` includes `firstLoginColdStart: boolean`.

## Dev / QA

- `clearLearnerBootstrapDataForCurrentUser()` — drop profile/progress/drafts (+ legacy keys) for current session user.
- `devSimulateFirstLoginWipeForCurrentUser()` — same as above plus cold-start domain wipe + empty retention/drafts; then reload or trigger bootstrap to recreate profile/progress.

## Related docs

- [`account-session-bootstrap.md`](./account-session-bootstrap.md)
- [`localstorage-schema.md`](./localstorage-schema.md)
- [`mock-auth-implementation.md`](./mock-auth-implementation.md)

## Recommended next step

**Build the onboarding flow** (product copy, steps, and durable completion aligned with `isNewUser` / `hasCompletedOnboarding`).
