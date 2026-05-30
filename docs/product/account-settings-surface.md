# Account & settings surface (closed beta)

Private app route: **`/app/settings`**. Bottom nav label: **Account**.

## What’s on the screen

1. **Account summary** — display name, email, invite-only beta line, plan badge (`AccountSummaryCard`).
2. **Closed beta messaging** — short, calm copy; no alarmism (`BetaInfoCard`).
3. **Plan** — effective tier via entitlements, short explanation, CTAs to in-app Premium explainer and public pricing (`PlanActionsCard`).
4. **Preferences / permissions** — existing real links (notifications, email, daily lessons, mic, smart prompts).
5. **Privacy & data** — privacy + export placeholders; explicit note that **account deletion and billing are not available** in closed beta (replaces a fake “Delete account” row).
6. **Beta testing tools** — optional **reset onboarding only** or **reset all local learning data** on this device, with confirmations (`ResetLocalDataAction`).
7. **Sign out** — `SignOutButton` with `analyticsSurface: account_settings`.

## Intentionally not included yet

- Password / email change with a real backend  
- Billing, invoices, cancellation  
- Email verification  
- Push notification backend toggles beyond existing UI  
- Account deletion (honest copy instead)

## Sources of truth

| UI area | Source |
|--------|--------|
| Display name / email (primary) | Session user from `useAuthStore` (mock registry at login) |
| Fallback name/email | `useLearnerProfileStore` document (`displayName`, `email`) if session thin |
| Plan label & gates | `useProductEntitlements` → `getCurrentPlan` (hydrated profile, else session plan) |
| Beta invite line | `sessionUser.betaAccessAllowed !== false` via `selectAccountIdentity` |

## Sign out

- **Component:** `SignOutButton` → `useAuth().logout()` → `authStore.logout()`.
- **In-memory:** clears learner profile store, progress store, premium flag, onboarding store (see `authStore`).
- **Persisted:** learner profile / progress **documents remain in `localStorage`** for that `userId`; next sign-in reloads them.
- **Redirect:** `/login` (`ROUTES.postSignOut`).
- **Analytics:** `sign_out_clicked` (surface `account_settings`) + existing `logout_clicked` from `AuthContext` (surface `auth_provider`).

## Reset actions (beta)

Implemented in `src/lib/account/accountReset.ts` and surfaced only under **Beta testing tools**.

### Reset onboarding only

- `mergeLearnerProfilePatch` sets `onboardingComplete: false`, step `0`, clears `onboardingData` / completion timestamp.
- Zustand: `useOnboardingStore.reset()`, `setOnboardingComplete(false)`.
- **Does not** wipe XP, lessons, drafts, or exam data.
- After confirm → navigate to `/onboarding`.

### Reset all local learning data

- `wipeLocalStorageKeysForColdStart(userId)` then `runAccountBootstrap()` (same cold-start path as a true empty slate).
- **Scoped to the signed-in `userId` on this browser only.**
- **Does not** sign out; recreates profile from session via `createNewBetaUserProfile`.
- After confirm → navigate to `/onboarding`.

## File map

- `src/lib/account/` — `accountSelectors`, `accountReset`, types, `index`
- `src/features/account/` — `AccountSummaryCard`, `BetaInfoCard`, `PlanActionsCard`, `ResetLocalDataAction`, `ConfirmDialog`
- `src/features/settings/SettingsPage.tsx` — composition
- `src/components/layout/BottomNav.tsx` — Account tab + active state for `/app/settings/*`

## Related docs

- `auth-user-state-architecture.md`, `mock-auth-implementation.md`  
- `profile-state-layer.md`, `progress-state-layer.md`, `plan-gating-and-entitlements.md`  
- `localstorage-schema.md` (per-user keys wiped on full reset)

## Next product step

**Add a lightweight admin/test utility layer for development** (separate from this user-facing account screen).
