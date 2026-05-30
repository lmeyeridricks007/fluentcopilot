# Route guards and public/private layouts

## Goals

- **Private learner product** (`/app/*`) is never usable without a session.
- **Onboarding** (`/onboarding`) requires a session and is skipped once completed.
- **Auth-only public pages** (`/login`, `/signup`, `/forgot-password`) redirect signed-in users into the app so they are not stuck on marketing/auth chrome.
- **Shared marketing pages** (`/`, `/features`, `/exam-prep`, `/pricing`, `/beta`) remain available when signed in (e.g. pricing context) while **Open app** is the primary CTA in the public shell.
- Guards wait for **`AuthProvider` `isReady`** before redirecting to avoid flicker and loops.

## Route classification

Source: `src/lib/routing/publicPrivateRoutes.ts` and `src/lib/routing/authRedirects.ts`.

| Kind | Paths | Signed out | Signed in |
|------|-------|------------|-----------|
| **Private app** | `/app`, `/app/*` | Redirect to `/login?next=…` | OK if onboarding complete; else → `/onboarding` |
| **Onboarding** | `/onboarding` | Redirect to `/login?next=/onboarding` | OK if onboarding incomplete; else → `/app/home` |
| **Auth-only public** | `/login`, `/signup`, `/forgot-password` | OK | Redirect to `/onboarding` or `/app/home` |
| **Shared public** | `/`, `/features`, `/exam-prep`, `/pricing`, `/beta` | OK | OK (marketing shell + **Open app**) |

Anything else (e.g. `/admin`) is **not** covered by this doc; admin remains separate.

**Marketing API:** `POST /api/beta-request` accepts beta waitlist submissions from public pages (no mailto). See `docs/product/public-site-conversion-refresh.md`.

## Layout structure

| Area | Layout | Shell |
|------|--------|--------|
| **Public marketing + auth entry** | `src/app/(public)/layout.tsx` | `PublicRouteGuard` → `PublicShell` (marketing header/footer) |
| **Onboarding** | `src/app/onboarding/layout.tsx` | `RequireOnboardingRoute` (minimal; no `PublicShell`, no `AppLayout`) |
| **Private app** | `src/app/app/layout.tsx` | `RequireAuth` → `AppLayout` (header, bottom nav, entitlements) |
| **Root** | `src/app/layout.tsx` | Fonts, `AppProviders` (includes `AuthProvider`) only |

Structural separation: public chrome lives only under `(public)` + `PublicShell`; private chrome only under `/app` after `RequireAuth`.

## Guard components

- **`PublicRouteGuard`** (`src/components/routing/PublicRouteGuard.tsx`) — wraps public marketing tree; handles auth-only redirects for signed-in users.
- **`RequireAuth`** (`src/components/auth/RequireAuth.tsx`) — wraps `/app/*`; sends unauthenticated users to login with `next`, incomplete onboarding to `/onboarding`.
- **`RequireOnboardingRoute`** (`src/components/routing/RequireOnboardingRoute.tsx`) — wraps onboarding segment; requires auth; finished users → `/app/home`.
- **`AuthRoutingSplash`** — shared bootstrap / redirect placeholder.

## Redirect constants

Use `ROUTES` and helpers from `src/lib/routing/authRedirects.ts` (e.g. `getPrivateEntryPath`, `buildLoginUrlWithNext`, `isSafePrivateNextPath` for future deep-link return).

Default choices:

- After **sign-out**: `/login` (`ROUTES.postSignOut`).
- After **login** (current product): `/onboarding` until onboarding is implemented to completion.
- **Private default** for signed-in users leaving auth-only pages: `getPrivateEntryPath(hasCompletedOnboarding)`.

## Product decision: signed-in users on marketing

- **Allowed** on home, features, exam-prep, pricing, beta (upgrade / context / sharing links).
- **Not allowed** to stay on login/signup/forgot-password (redirected automatically).
- Public **Open app** replaces **Sign in** when `isReady && isAuthenticated`; primary waitlist CTA is hidden when signed in to reduce noise (footer + header).

## Analytics

Events (see `ANALYTICS_EVENTS`): `route_guard_redirected_to_login`, `route_guard_redirected_to_app`, `auth_only_page_redirected`, `session_bootstrap_started`, `session_bootstrap_completed` (category `routing` or `authentication` per `eventCategories.ts`).

## Replaceability

Guards consume **`useAuth()`** only (session snapshot + `isReady`). Swapping mock auth for a real provider keeps the same guard shape as long as `isAuthenticated`, `hasCompletedOnboarding`, and `isReady` remain meaningful.

## Account bootstrap

Before guards evaluate `hasCompletedOnboarding`, **`runAccountBootstrap()`** syncs that flag (and onboarding draft) from **`lt.v1.learner-profile.<userId>`**. See [`account-session-bootstrap.md`](./account-session-bootstrap.md).

## Related docs

- [`auth-user-state-architecture.md`](./auth-user-state-architecture.md)
- [`auth-route-shell-audit.md`](./auth-route-shell-audit.md)
- [`mock-auth-implementation.md`](./mock-auth-implementation.md)
