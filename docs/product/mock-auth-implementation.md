# Mock closed-beta authentication (implementation)

## Overview

The app uses **invite-only mock auth**: no database, no production IdP. Identity comes from [`mock-beta-user-registry.md`](./mock-beta-user-registry.md). The UI entry point is **`AuthProvider`** + **`useAuth()`** in `src/lib/auth/`, backed by **Zustand `useAuthStore` + `persist`** (`localStorage` key `auth-storage`).

This layer is designed to be replaced by a real **`AuthPort`**-style implementation later without rewriting profile/progress stores.

## Account bootstrap (post-auth)

After a valid session is detected or login succeeds, **`runAccountBootstrap()`** (`src/lib/bootstrap/`) loads or creates **per-user** learner profile and progress markers, resolves onboarding (fresh / resume / complete), and syncs `hasCompletedOnboarding` + `useOnboardingStore`. See [`account-session-bootstrap.md`](./account-session-bootstrap.md).

## Flow

1. **`AuthProvider`** (in `AppProviders`) waits for Zustand rehydration, then runs **`restoreSession()`**:
   - Validates the persisted slice with **`validatePersistedAuthState`** (`sessionStorage.ts`).
   - If `isAuthenticated` but the blob is invalid or `betaAccessAllowed === false`, it **logs out** and emits **`session_restore_failed`**.
   - If valid and signed in, syncs **`premiumStore`** from persisted `plan` and emits **`session_restored`**.
2. **`login()`** calls **`mockAuthService.signIn`** (registry + shared password), sets **`useAuthStore`**, **`loginAt`**, **`authProviderType`**, syncs premium, tracks analytics.
3. **`logout()`** clears auth state via the store (and premium demo flag per existing `authStore` behavior), tracks **`logout_clicked`**.

## Credential validation

All checks live in **`validateMockBetaCredentials`** / aliases **`validateMockCredentials`**, **`validateMockUserCredentials`** (`mockUserLookup.ts`). **`mockAuthService.signIn`** is the only service entry for sign-in; UI must not reimplement checks.

User-facing messages for failure codes are centralized in **`loginFailureMessages.ts`**.

## Session persistence

- **Storage:** Zustand `persist` → **`auth-storage`** (see `AUTH_STORAGE_KEY` in `sessionStorage.ts`).
- **Stored (auth slice only):** `isAuthenticated`, `hasCompletedOnboarding`, `user` (`UserProfile`) including `id`, `name`, `email`, level placeholders, `plan`, `betaAccessAllowed`, **`loginAt`**, **`authProviderType`**, and other profile-bootstrap fields already on `UserProfile`.
- **Not stored:** registry rows, passwords, progress, lessons, onboarding answers, exam history.

## Auth context API

| Export | Role |
|--------|------|
| `AuthProvider` | Wraps the app; hydration + `restoreSession` |
| `useAuth()` | `{ isReady, isAuthenticated, user, sessionUser, login, logout, restoreSession, hasCompletedOnboarding }` |
| `sessionUser` | Narrow **`AuthSessionUser`** derived from `user` (identity + plan + beta + `loginAt`) |

`RequireAuth` waits for **`isReady`** before redirecting to avoid logged-out flicker.

## Sign-out

**`SignOutButton`** (`features/auth/components/SignOutButton.tsx`) calls **`useAuth().logout()`** and navigates (default **`/login`** via `ROUTES.postSignOut`). Settings uses this component.

## Routing assumptions

- Successful login: **`LoginForm`** navigates to **`/onboarding`** (unchanged).
- **`RequireAuth`:** unauthenticated → **`/login`**; authenticated but onboarding incomplete → **`/onboarding`**.
- Sign-out: default **`/`** (marketing home).

## Analytics

Events in `ANALYTICS_EVENTS`: **`login_attempted`**, **`login_succeeded`**, **`login_failed`**, **`logout_clicked`**, **`session_restored`**, **`session_restore_failed`** (category `authentication`). **`sign_in_clicked`** still fires from the login form for funnel detail.

## Dev helpers

In **development**, `window.__LT_CLEAR_MOCK_AUTH__()` clears the session via the store (same as sign-out).

Programmatic: **`clearMockAuthSession`** from `src/lib/auth/devSession.ts`.

## Migration to real auth

1. Implement **`AuthPort`** (`authPort.ts`) against your provider.
2. Replace **`mockAuthService.signIn`** usage inside **`AuthProvider.login`** with the new port; map the response to the same **`UserProfile` + session fields**.
3. Keep **`validatePersistedAuthState`** rules aligned with what the server considers a valid session, or replace restore with token refresh.

## Related docs

- [`route-guards-and-layouts.md`](./route-guards-and-layouts.md)
