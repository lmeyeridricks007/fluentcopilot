# Dev / test utilities (internal)

Lightweight QA surface for closed-beta iteration. **Not** an end-user feature.

## Access

| Condition | Visible |
|-----------|---------|
| `NODE_ENV === 'development'` | Yes — header shows amber **Dev** link → `/app/dev-tools` |
| `NEXT_PUBLIC_DEV_TOOLS=true` | Yes (e.g. staging QA) |
| Production build, flag unset | Route renders “Not available”; no header link |

The page lives under the private app shell (`/app/dev-tools`) and requires authentication.

## Layout

- `src/app/app/dev-tools/page.tsx` — gate + `DevToolsScreen`
- `src/features/dev-tools/*` — UI sections
- `src/lib/dev-tools/*` — access flag, actions, inspector

## Tools

### Switch mock user

- Lists `MOCK_BETA_INVITED_USERS` (Lee hotmail/gmail, Aneta, Alexis, Marius, Sharon).
- **Logout** → `mockAuthService.signIn` with `MOCK_BETA_TEMPORARY_PASSWORD` → **`applyMockSignInSession`** (same as real login) → redirect home + refresh.
- Ensures no stale session user; bootstrap runs for the new account.

### Clear / reset (all confirmed)

| Action | Implementation |
|--------|----------------|
| Drafts only | `createEmptyDraftsDocument` + `setUserDrafts` |
| Profile document only | `wipeProfileDocumentsForUser` + `runAccountBootstrap` |
| Progress stack only | `wipeProgressRetentionDomainsForUser` + `persistEmptyRetentionProfile` + `runAccountBootstrap` |
| Full wipe / simulate first login | `wipeLocalStorageKeysForColdStart` + `runAccountBootstrap` (same as account settings beta reset) |
| Onboarding only | `resetOnboardingProgressOnly` from `@/lib/account` |
| Wipe all `lt.v1` keys | Every `localStorage` key with prefix `lt.v1` (all users on device); then `persistEmptyRetention` + bootstrap for current user |

Destructive flows that re-seed onboarding navigate to `/onboarding` after success.

### Inspect storage

- Auth slice snapshot (from `useAuthStore`)
- `getUserProfile` / `getUserProgress` / `getUserDrafts` JSON
- Resume priority via `collectResumableFlows`
- Which cold-start wipe keys currently hold bytes

## Architecture reuse

- **Sign-in application:** `applyMockSignInSession` — shared with `AuthProvider.login`.
- **Wipes:** `wipeUserProgressDomains.ts`, `storageKeys.progressRetentionWipeKeysForUser` (progress without profile/drafts).
- **Bootstrap:** `runAccountBootstrap` after mutations that require rehydration.
- **Onboarding-only reset:** existing `accountReset` helper.

No parallel storage logic in UI components.

## Logging

Actions call `console.info('[dev-tools]', …)` for local debugging. No product analytics required.

## Related

- `account-settings-surface.md` — user-facing reset (subset of full wipe)
- `localstorage-schema.md`, `account-session-bootstrap.md`, `first-login-initialization.md`

## Next product step

**Define the future sync contract now** (server profile/progress vs device).
