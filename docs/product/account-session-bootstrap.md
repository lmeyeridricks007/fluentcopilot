# Account / session bootstrap

## When it runs

`runAccountBootstrap()` from `src/lib/bootstrap/accountBootstrap.ts` runs (including **first-login cold start** when no valid profile and no valid progress manifest — see [`first-login-initialization.md`](./first-login-initialization.md)):

1. **After successful login** — end of `AuthProvider.login()`, once `useAuthStore` has the new `user`.
2. **After session restore** — inside `restoreSession()` when persisted auth validates and a `user` exists (same app load path as `AuthProvider` hydration).

It is **synchronous** (localStorage only) so route guards can read updated `hasCompletedOnboarding` and onboarding store state before `isReady` flips.

## What gets loaded or initialized

| Piece | Storage key pattern | Behavior |
|-------|---------------------|----------|
| **Learner profile** | `lt.v1.profile.<userId>` (legacy read: `lt.v1.learner-profile.<userId>`) | Load JSON or create default: `onboardingComplete: false`, `onboardingStep: 0`, empty `onboardingData`. Corrupt JSON → recover with fresh profile (`bootstrap_recovery_triggered`). Successful read from legacy key promotes to canonical. |
| **Progress manifest** | `lt.v1.progress.<userId>` (legacy read: `lt.v1.progress-root.<userId>`) | Load or create v1 manifest + `domains` registry; always calls `loadRetentionProfileSync(userId)` so retention defaults exist for that user. |
| **Retention / XP / lessons** | `language-tutor-retention-profile:<userId>` (existing) | Empty defaults for new `userId`; no shared `local-demo-user` data for authenticated beta accounts. |
| **Review / SRS / mistakes** | `language-tutor-v4-*-${userId}` (existing) | Scoped by `getRetentionUserId()` → auth `user.id` when signed in. |

Session blob (`auth-storage`) remains **auth + cached flags** (`sessionUpdatedAt`, `hasCompletedOnboarding`); durable onboarding state lives on the **profile** document. Full storage contract: [`localstorage-schema.md`](./localstorage-schema.md).

## New vs returning users

- **New beta user** (no learner file): profile + progress marker created; onboarding **fresh**; `hasCompletedOnboarding` false after bootstrap.
- **Returning user**: profile drives `hasCompletedOnboarding` and onboarding **resume** (step + partial `onboardingData`).
- **Migration**: if `auth-storage` has `hasCompletedOnboarding: true` but learner file says incomplete (e.g. first run after this feature), bootstrap **repairs** learner profile with `markLearnerProfileOnboardingComplete`.

## Onboarding persistence

- **During flow**: `OnboardingFlow` debounces `persistOnboardingDraft(userId, step, data)` (~400ms) into profile `onboardingStep` + `onboardingData` (v2 fields: goal, level, path, skills, rhythm, reason).
- **On finish**: `markLearnerProfileOnboardingComplete(userId, fullData)` persists answers + personalization mirror, then `setOnboardingComplete(true)` and navigate via `getPostOnboardingEntryPath` (not always `/app/home`).
- **Flow spec**: [`onboarding-flow.md`](./onboarding-flow.md).

## Routing

Guards (`RequireAuth`, `RequireOnboardingRoute`, `PublicRouteGuard`) already enforce:

- Incomplete onboarding → `/onboarding` (with store hydrated from learner profile).
- Complete → `/app/*`.

`resolvePostBootstrapRoute()` mirrors that for analytics / future programmatic navigation.

## Retention user id

`getRetentionUserId()` (`retentionService.ts`) returns `useAuthStore.getState().user?.id` in the browser when set, else `local-demo-user`. Authenticated app usage is therefore **per invitee** (e.g. `beta-lee-hotmail` vs `beta-lee-gmail`).

Schema lesson mistakes (`mistakeTracker`) use a **per-user** localStorage key: `language-tutor-schema-mistakes-v1:<userId>`.

## Analytics

See `ANALYTICS_EVENTS`: `bootstrap_started`, `bootstrap_completed`, `profile_initialized`, `profile_loaded`, `progress_initialized`, `progress_loaded`, `onboarding_routed`, `app_home_routed`, `bootstrap_recovery_triggered`.

## Dev / reset

- `clearMockAuthSession()` — clears auth + onboarding in-memory reset (see `devSession.ts`).
- To wipe one user’s profile + progress + drafts: remove `lt.v1.profile.<userId>`, `lt.v1.progress.<userId>`, `lt.v1.drafts.<userId>` (and legacy `lt.v1.learner-profile.*` / `lt.v1.progress-root.*` if present), or call `clearLearnerBootstrapDataForCurrentUser()` before sign-out.

## Future (server sync)

Replace `getUserProfile` / `setUserProfile` (and domain ports) with API calls; keep `runAccountBootstrap()` as the single orchestrator that maps server DTOs into `useAuthStore` + `useOnboardingStore` + premium sync.

## Related docs

- [`onboarding-flow.md`](./onboarding-flow.md)
- [`first-login-initialization.md`](./first-login-initialization.md)
- [`localstorage-schema.md`](./localstorage-schema.md)
- [`auth-user-state-architecture.md`](./auth-user-state-architecture.md)
- [`mock-auth-implementation.md`](./mock-auth-implementation.md)
- [`route-guards-and-layouts.md`](./route-guards-and-layouts.md)
