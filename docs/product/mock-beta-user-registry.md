# Mock closed-beta user registry

## Purpose

Invite-only **identity and access** data for the closed beta. There is no database and no real auth provider yet; `@/lib/auth` holds a typed, hardcoded list and helpers (`validateMockBetaCredentials`, etc.).

**This is not production auth.** Passwords are plaintext in source and shared across invitees for convenience.

## What lives here vs elsewhere

| In registry | Not in registry (initialized after login / in other stores) |
|-------------|-------------------------------------------------------------|
| `id`, `displayName`, `email` | Saved progress, completed lessons |
| `plan` (`basic` \| `premium`) | Onboarding answers, review state |
| `betaAccessAllowed`, `isActive` | Missions, XP, streak, exam results |
| `temporaryPassword` (beta-only) | Settings history, profile extensions |

Session `UserProfile` in `authStore` copies `plan` and `betaAccessAllowed` from the registry on login. **Profile/progress stores treat every successful login as a new user** until you add persistence keyed by `user.id`.

## Supported invitees

| Display name | Email | Plan |
|--------------|-------|------|
| Lee | leemeyeridricks@hotmail.com | premium |
| Lee | leemeyeridricks@gmail.com | basic |
| Aneta | aneta.dolinska@gmail.com | premium |
| Alexis | alexis@gmail.com | premium |
| Marius | marius@gmail.com | premium |
| Sharon | sharon@gmail.com | premium |

Emails are matched case-insensitively (see `normalizeBetaEmail`).

## Temporary password

All invitees use the same password: **`password`** (`MOCK_BETA_TEMPORARY_PASSWORD` in `mockAuthConstants.ts`). This is intentional for the mock phase and must be replaced with server-verified credentials before launch.

## Beta access flag

Every invited row has `betaAccessAllowed: true`. The model allows future rows where `betaAccessAllowed` is `false` (e.g. invited but not yet enabled). `canAccessClosedBeta` combines registry presence, `isActive`, and this flag.

## Plan type

`BetaPlanId` is `'basic' | 'premium'`. It is the registry source of truth for beta entitlements; `LoginForm` syncs `user.plan === 'premium'` into `premiumStore` so existing plan-gating keeps working.

## Replacing this later

1. **Keep** `UserProfile.plan`, `betaAccessAllowed`, and profile/progress models as they are.
2. **Replace** registry lookup + `validateMockBetaCredentials` with an API or IdP that returns the same fields (or map claims → `BetaPlanId`).
3. **Remove** or stop exporting `MOCK_BETA_INVITED_USERS` when the backend is authoritative.

Code entry points: `src/lib/auth/` (`mockUsers.ts`, `mockUserLookup.ts`, `mockAuthService.ts`, `AuthContext.tsx`, `index.ts`), `src/features/auth/services/mockAuthService.ts`. See also [`mock-auth-implementation.md`](./mock-auth-implementation.md).

## Dev helpers

- `listMockBetaInviteEmails()` — quick list of invite emails.
- `getMockUserByEmail` / `getMockBetaUserByEmail` — lookup by email.
- Vitest: `src/lib/auth/mockUserLookup.test.ts`.
