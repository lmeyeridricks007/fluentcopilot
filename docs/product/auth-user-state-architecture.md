# Auth and user-state architecture

**Status:** Implementation contract for closed beta and migration to production auth + server sync.  
**Companion:** Ground-truth of today’s codebase lives in [`auth-route-shell-audit.md`](./auth-route-shell-audit.md).  
**Scope:** Design only — this document does not require the described code to exist yet.

---

## Section 1 — Architectural principles

1. **Separate public shell from private app shell**  
   Marketing, pricing, waitlist, and auth entry use a **public layout** (no bottom nav, no learner chrome). The product uses **`RequireAuth` + `AppLayout`** (header, nav, entitlements). Never mount the full learner shell on public routes.

2. **Separate identity/session from profile from progress**  
   - **Session:** who is signed in *right now*, validity, auth mode, routing gates (e.g. may enter main app).  
   - **Profile:** stable learner preferences and identity-linked attributes (name, email, plan, onboarding *outcomes*).  
   - **Progress:** mutable activity and learning state (completions, SRS, attempts, XP).  
   Cross-cutting concerns (e.g. “display name”) appear in profile; session may hold a **cached copy** for fast boot but must not be the only source of truth for durable fields.

3. **Stable profile vs activity**  
   Profile changes occasionally (settings, level goals). Progress changes constantly. **Do not store activity history or XP ledgers inside the profile document.**

4. **Local-first for beta**  
   All beta persistence is **browser `localStorage`** (or `IndexedDB` later for large blobs). No backend is assumed. The architecture must still define **sync-ready metadata** (`updatedAt`, `version`, `dirty`).

5. **Future-ready sync contract**  
   Every syncable entity has **schema version**, **monotonic `updatedAt` (ISO string)**, and optional **`dirty`** for push. Implementation can defer network calls; **shapes and boundaries** are fixed here.

6. **User-scoped storage keys**  
   All learner data except the **active session blob** is namespaced by **`userId`** (stable string from auth registry or future IdP). **No shared global progress keys** across users on one device.

7. **Plan state follows identity/profile**  
   Effective **plan** (`basic` | `premium` for beta) is determined from **profile** (or server entitlements later), surfaced through a **single entitlements layer**. UI must not read a disconnected “premium flag” store for product truth (a **dev-only override** may exist behind a clear guard).

8. **Onboarding is profile state, not route-only**  
   Routes display onboarding UI; **completion and answers** live in **persisted profile (and/or dedicated onboarding slice keyed by userId)**. Refresh or deep link must resume correctly.

9. **Auth provider is replaceable**  
   Beta uses a **mock auth adapter** behind a small interface. Profile and progress modules depend on **`userId` + session snapshot`**, not on Clerk/Supabase types.

10. **Closed beta: empty progress on first access**  
    New beta users get **empty progress domains** — no demo scenario seeding in production beta paths unless explicitly a **dev tool**.

---

## Section 2 — Public marketing area

### Purpose

The public area exists for **discovery**, **conversion**, **waitlist capture**, and **sign-in** — not for learning or progress.

### What belongs in the public shell

- **Brand header** (logo, optional “Log in”, optional “Join waitlist”).  
- **Footer** (legal links, contact, closed-beta note).  
- **No** `BottomNav`, **no** `EntitlementProvider` requirement (optional read-only marketing copy about plans).  
- **No** access to `userId`-scoped progress APIs.

### What public users can do

- Read marketing and product pages.  
- Open **pricing** (comparison, FAQ) — **public URL**, not `/app/premium` (in-app upsell stays private).  
- Submit **waitlist** (form → external tool, email, or static “email us” for manual beta).  
- Open **login** (invite-only beta credentials).  
- Open **sign-up** route only as **“Coming soon”** (no account creation).

### Route boundaries (recommended)

| Area | Example paths | Notes |
|------|----------------|--------|
| Marketing home | `/` | Hero, primary CTA to waitlist or login |
| Product / features | `/product`, `/features` | Optional split |
| Exam prep info | `/exam-prep` (marketing) | Informational only; app exam prep stays under `/app/exam-prep` |
| Pricing | `/pricing` | Public; links to waitlist or login |
| Waitlist | `/beta`, `/waitlist` | Single canonical path preferred (pick one) |
| Login | `/login` | Invite-only messaging |
| Sign up | `/signup` | Disabled UI + coming soon |
| Legal | `/privacy`, `/terms` | As needed |

**Rule:** Paths under **`/app/*`** remain **private product** only. Public pricing must not 302 unauthenticated users into `/app/premium`.

### Beta messaging and waitlist

- **Copy:** Closed beta, invite-only, sign-up coming soon.  
- **Waitlist:** No user record creation in-app for v1; **external form** or **mailto** is acceptable.  
- **Login page:** Short note: “If you don’t have access, join the waitlist.”

---

## Section 3 — Private app area

### Purpose

Personalized learning, **progress**, **plan-based access**, and **saved state** — only after a valid session.

### Private route boundary

- **All current product routes under `/app/*`** stay private.  
- **Onboarding** (if shown as full-screen flow) should live at a path that is **authenticated** — e.g. **`/app/onboarding`** (recommended) or guarded **`/onboarding`** with a **session-required wrapper**. Avoid publicly reachable onboarding URLs without session.

### Entry into the app

1. User completes **login** → **session** created and persisted.  
2. **Bootstrap:** load **profile** for `userId` (create default if missing).  
3. **Bootstrap progress:** ensure **empty** progress bundle for new users, or load existing for returning users.  
4. **Route:**  
   - If `!profile.onboardingComplete` → **onboarding** route.  
   - Else → **`/app/home`**.

### First-login vs returning user

- **First login:** session + default profile + **empty progress** → onboarding → home.  
- **Returning:** session restore → profile + progress load → if onboarding complete, **directly to home** (or last deep link if product adds safe redirect rules later).

### Shell / layout behavior

- **`RequireAuth`** (or middleware + same rules): no session → redirect to **`/login`** (not generic `/` unless product prefers).  
- **`AppLayout`:** header, bottom nav, offline banner, **entitlements provider** fed by **profile.plan** (+ usage service).  
- **Onboarding route:** optional **minimal shell** (progress bar, no bottom nav) implemented as a **nested layout** under `/app` or a dedicated layout group.

---

## Section 4 — Mock auth for closed beta

### Goals

- **Hardcoded invite list** (small set of beta emails).  
- **Single shared beta password** (rotated manually; documented only internally).  
- **No public sign-up** — UI and service reject creation.  
- **Session persisted locally** so refresh keeps user logged in until sign-out or expiry (optional).

### Registry location (recommended)

- **`src/lib/auth/betaUsers.registry.ts`** (or `src/config/beta-invite-list.ts`) — **gitignored env-driven list** is better long-term; for beta v1 a **typed array** in repo is acceptable if the repo is private.  
- Fields per **beta user record** (minimum):

| Field | Purpose |
|-------|---------|
| `id` | Stable string, primary key for profile/progress namespacing |
| `email` | Normalized login identifier |
| `displayName` | Shown in UI |
| `plan` | `basic` \| `premium` — beta assignment |
| `betaAccess` | `true` (or role string later) |
| `createdAt` | Optional metadata for support |

Optional: `notes` for internal admin only (not shipped to client if moved server-side later).

### Login validation

1. Normalize email (trim, lower case).  
2. Look up email in **invite registry**.  
3. Compare password to **configured beta password** (env var `NEXT_PUBLIC_BETA_PASSWORD` is avoidable — prefer **non-public** env for a future API route; for pure client mock, accept temporary constant **only for local dev**).  
4. On success: build **session** (Section 5) and return **`userId`**.  
5. On failure: generic error (“Invalid email or password”) — no user enumeration.

### Sign-up

- **Disabled:** `SignUpPage` becomes static “Coming soon” + waitlist CTA.  
- **Service:** `signUp` throws or returns controlled error — never creates a row in registry from UI.

### Sign-out

- Clear **session** persistence.  
- **Do not** delete profile/progress from disk (user may sign back in). Optional **“Reset local data”** in settings for QA.

### Beta access enforcement

- **Invite list** is the source of “may log in.”  
- **Session** carries `userId`; all private routes require valid session.  
- **No** anonymous access to `/app/*`.

### Migration to real auth (Clerk, Supabase Auth, etc.)

Introduce **`AuthPort`** interface:

```ts
// Conceptual — not implemented by this doc
type AuthPort = {
  signInWithPassword(input: { email: string; password: string }): Promise<SessionSnapshot>
  signOut(): Promise<void>
  getSession(): SessionSnapshot | null // restore from secure cookie / client
  subscribe?(cb: (s: SessionSnapshot | null) => void): () => void
}
```

- **Mock beta** implements `AuthPort` with registry + password check.  
- **Future provider** implements same port; returns same **`SessionSnapshot`** shape (or maps to it).  
- **Profile and progress** layers only consume **`userId` + session** from port — never import mock registry directly.

---

## Section 5 — Session model

### What session represents

- **Who** is logged in (`userId`, `email` cache).  
- **That** the session is **valid** for the client (beta: “we just logged in successfully”).  
- **When** login occurred and last activity (optional).  
- **Auth mode** (`mock_beta` | `clerk` | …).  
- **Routing:** whether user may enter **main app** vs must complete **onboarding** (see below — can be derived from profile, but session bootstrap may cache a flag for first paint).

### Recommended `SessionSnapshot` fields

| Field | Type | Notes |
|-------|------|--------|
| `userId` | `string` | Stable; names all storage |
| `email` | `string` | Denormalized for UI |
| `displayName` | `string` | Denormalized for header; profile is source of truth |
| `isAuthenticated` | `boolean` | Derived; can omit if `userId` non-null implies auth |
| `authProviderType` | `'mock_beta' \| string` | |
| `loginAt` | `string` (ISO) | Set at sign-in |
| `lastSeenAt` | `string` (ISO) | Update on app focus or throttled tick |
| `betaAccess` | `boolean` | From registry / token claims later |
| `onboardingComplete` | `boolean` | **Cached from profile** for fast guard; must reconcile after profile load |

**Plan in session:** Optional **read-only cache** of `basic` | `premium` for first paint; **authoritative plan** remains on **profile**.

### What does NOT belong in session

- Full onboarding answers (profile).  
- Lesson completion, XP, SRS items (progress).  
- Entitlement usage counters (progress or dedicated usage sub-document).  
- Large JWTs or PII beyond what UI needs immediately (future: session id only, profile fetch lazy).

### Persistence

- **Single key** e.g. `lt.v1.session` (JSON).  
- **Zustand + persist** is fine; **must not** store progress inside this slice.

### Restore and clear

- **On app load:** read session → if valid, proceed to profile/progress hydration.  
- **Clear on:** sign-out, explicit “switch account” (future), or invalid session detection.  
- **Optional session expiry:** beta can use long-lived; product can add `expiresAt` later.

### Session ≠ profile ≠ progress

- **Session:** transport + guard for “logged in.”  
- **Profile:** durable preferences and plan assignment.  
- **Progress:** durable learning state.  
  After login, **always** load profile by `userId`; **never** infer plan only from session without profile reconciliation.

---

## Section 6 — User profile model

### Definition

**Profile** is stable, user-specific data that describes *who the learner is* and *how they want to learn*, not *what they did today*.

### Recommended fields

| Group | Fields |
|-------|--------|
| Identity | `id` (same as `userId`), `email`, `displayName` |
| Beta / account | `betaAccess: boolean`, `accountStatus: 'beta' \| 'active' \| …` |
| Plan | `plan: 'basic' \| 'premium'` (authoritative for gating after hydration) |
| Levels / goals | `currentLevel`, `targetLevel`, `targetObjective`, `postA2PathId` (nullable) |
| Onboarding outcomes | `onboardingComplete: boolean`, `onboardingAnswers: OnboardingAnswers` (structured object), `onboardingCompletedAt` |
| Preferences | `nativeLanguage`, `notificationPreferences`, `dailyLearningGoalMinutes`, `timezone` (future) |
| Metadata | `profileVersion: number`, `createdAt`, `updatedAt` |

### Settings vs profile

- **Device-only** settings (sound, haptics) may stay **separate** `lt.v1.devicePrefs` if desired.  
- **Account-linked** settings (email visibility, goal minutes) live on **profile**.

### vs progress

- **Not in profile:** completion lists, XP ledger, review queues, exam attempt history, mission runtime — those are **progress** (or progress sub-domains).

### Initialization on first login

1. If no profile blob for `userId`, create **defaults** from registry (name, email, plan) + `onboardingComplete: false`, empty `onboardingAnswers`.  
2. Persist immediately.

### Local storage

- **Key:** `lt.v1.profile.<userId>` (JSON).  
- **Single write path** through a profile repository module.

---

## Section 7 — Progress model

### Definition

**Progress** is mutable learning and activity state, keyed by **`userId`**, split into **logical domains** that can sync independently later.

### Domains (conceptual)

| Domain | Examples (maps to existing code over time) |
|--------|---------------------------------------------|
| `retention` | XP, streak, completed lesson ids, abilities unlocked, milestones |
| `review` | SRS items, review bank, mistake events, mastery snapshots |
| `practice` | Scenario progress, skill tracks, practice continue, unlocks |
| `lessons` | Schema mistakes, A2 review queue, weak tags |
| `exam` | KNM progress, practice exam attempts, readiness history, writing/speaking attempts |
| `missions` | Mission runtime state, weekly/daily slots |
| `daily_generators` | Daily lesson / context prompt preference state (if treated as progress-adjacent) |

### What to persist vs derive

- **Persist:** anything needed to resume learning after refresh or sync.  
- **Derive:** view models, sorted lists, “recommended next” if recomputable from persisted inputs (may cache in memory only).

### Per-user storage

- **Key pattern:** `lt.v1.progress.<userId>.<domain>` **or** one document `lt.v1.progress.<userId>` with sub-keys and version (team choice; **domains** help partial sync).  
- **Every** current global key identified in the audit must migrate under **`userId`**.

### New beta user

- **Initialize each domain** to empty schema defaults (empty arrays, zero counters, null streak).  
- **No** `happy-path` demo dataset in beta bootstrap.  
- **Dev panel** may still attach demo scenarios using a **separate dev-only userId** or explicit “load demo” destructive action.

### Updates

- **Immediate write** for critical completions (lesson complete, exam submit).  
- **Debounced write** acceptable for high-frequency UI (typing drafts) if added later.  
- Each domain module exposes **load / save** through a **persistence port** (sync-ready).

---

## Section 8 — Onboarding state

### Product goals

Capture motivation, level, targets, rhythm, and context so **home / learn / practice** can personalize.

### Where it lives

- **Authoritative:** **`profile.onboardingAnswers`** (structured) + **`profile.onboardingComplete`**.  
- **Wizard UI state:** ephemeral **step index** can live in **React state** with **optional autosave** to `profile.onboardingDraft` or same `onboardingAnswers` partial updates (recommended: **persist partial answers on each step** to `profile`).

### Completion

- On final step: set `onboardingComplete: true`, `onboardingCompletedAt = now`, merge answers into profile, `profile.updatedAt` bump.  
- **Session cache** `onboardingComplete` updated to match.

### Routing

- **Guard:** If authenticated and `!profile.onboardingComplete`, redirect to **`/app/onboarding`** before main shell content (or use nested layout that omits nav until done — product choice).  
- **Returning user:** skip onboarding entirely.

### Interrupted onboarding

- User refreshes mid-flow → reload **profile** → restore **last step** from `onboardingAnswers.stepIndex` or dedicated `onboardingCurrentStep` field.

### Revisit onboarding

- Settings → “Update your goals” may navigate to same flow with **pre-filled** answers; does not clear progress unless user confirms.

### Influence on recommendations

- Read **profile fields** only (e.g. `targetObjective`, `currentLevel`) — recommendation engines **must not** read raw session.

---

## Section 9 — Plan state and entitlements

### Plan enum (beta)

- **`basic`** — core lessons and practice per product spec.  
- **`premium`** — exam extras, advanced feedback, gated modes, etc. (map to existing feature flags in code over time).

### Source of truth

- **Profile `plan`** for beta (copied from invite registry at first profile creation).  
- Later: **server entitlements** document hydrated on login; **profile.plan** becomes a cache updated from server.

### Entitlements layer (centralized)

- **`getEntitlements(profile, progressUsage)`** → object like `{ tier: 'basic'|'premium', canUseX, usage: {…} }`.  
- **Replace** ad-hoc `usePremiumStore` in feature components with **`useEntitlements()`** (single hook).  
- **Dev override:** e.g. `localStorage lt.dev.forcePlan` **only when** `NODE_ENV === 'development'` — never product default `isPremium: true` for beta.

### Usage caps (lessons/scenarios per day/week)

- Stored under **progress** or **usage subdomain** per `userId`, **not** `DEMO_USAGE` constants for beta product paths.

### Evolution to billing

- Add `subscriptionStatus`, `currentPeriodEnd`, `stripeCustomerId` (server).  
- **Entitlements** = `f(profile.plan, server.entitlements, subscriptionStatus)`.  
- Gating code **still** reads only entitlements hook.

---

## Section 10 — Local storage / persistence architecture

### Key strategy

**Prefix:** `lt.v1.` (bump `v2` only for breaking storage layout).

| Key | Contents |
|-----|----------|
| `lt.v1.session` | `SessionSnapshot` |
| `lt.v1.profile.<userId>` | Profile document |
| `lt.v1.progress.<userId>.<domain>` | Domain blob OR single merged progress doc with `domains: { … }` |

**Forbidden in beta product:** learner data keys **without** `<userId>` (except session and device prefs).

### Multi-user on one device

- Switching users (future) = new session → load **that** user’s profile + progress keys.  
- Previous user’s data remains on disk until cleared.

### Versioning and migration

- Each document includes `version` or `schemaVersion` integer.  
- On read, **`migrateProfile(v)`**, **`migrateProgressDomain(domain, v)`** chain upgrades old shapes.  
- **Corrupted JSON:** log (dev), return defaults, mark `dirty` for future sync repair.

### Write policy

| Data | Write |
|------|--------|
| Session login/logout | Immediate |
| Profile field save | Immediate (small payload) |
| Progress critical events | Immediate |
| High-frequency telemetry | Debounced / batch (future) |

### Boot order

1. Read **session**.  
2. If absent → public only.  
3. If present → read **profile** → read **progress** domains (parallel).  
4. Reconcile **entitlements**.  
5. Route (onboarding vs home).

---

## Section 11 — Future server-sync shape

### Model

- **Local-first:** client is authoritative until sync completes; server accepts idempotent writes.  
- **Eventual sync:** background push when online.

### Entity metadata (each syncable document)

- `id` / `userId`  
- `schemaVersion`  
- `updatedAt` (ISO, client clock; server may normalize)  
- `dirty: boolean` (client-only; cleared after successful push)  
- Optional `serverVersion` / `etag` after first sync

### Entities to sync (phased)

| Entity | Direction | Notes |
|--------|-----------|--------|
| Profile | ↑ ↓ | LWW on `updatedAt` at document level |
| Progress domains | ↑ ↓ | Mostly ↑; hydrate on new device ↓ |
| Review / SRS | ↑ ↓ | Merge by item id; tombstone deletes |
| Exam attempts | ↑ (append) | Server append-only log; rare conflicts |
| Readiness / milestones | ↑ ↓ | LWW or merge by id |
| Usage counters | ↑ ↓ | Server may clamp abuse |

### Conflict philosophy

- **Default:** **latest `updatedAt` wins** per document or per sub-key.  
- **Exceptions:**  
  - **SRS / review items:** merge by **item id**; scalar fields LWW.  
  - **Append-only** (attempts): union by id; duplicates rejected server-side.  
- **Offline edits:** client marks `dirty`; on conflict after push, **server returns winner**; client applies patch or refetches (implementation detail later).

### Auth for sync

- Session from IdP includes **secure token**; sync API uses **Bearer** or cookie. **Not** part of this beta deliverable.

---

## Section 12 — Routing / flow model

### A. Public visitor

Marketing page → browse features/pricing → **waitlist** OR **login**. No `/app/*` access.

### B. Invited beta user — first login

Login success → **session** written → **profile** created (from registry) → **progress** initialized empty → redirect **onboarding** → complete → **profile.onboardingComplete** → **`/app/home`**.

### C. Returning beta user

App load → **session** restored → **profile** loaded → `onboardingComplete` true → **`/app/home`** (or deep link if allowed).

### D. Sign out

From settings → clear **session** → redirect **`/login`** or **`/`**.

### E. Incomplete onboarding resume

Session valid → profile `onboardingComplete` false → **`/app/onboarding`** with saved step/answers.

---

## Section 13 — Account / settings surface

### Beta settings (minimum)

- Display **name**, **email** (read-only if desired).  
- **Plan** badge (`basic` / `premium`).  
- **Beta** badge / short explanation.  
- **Sign out**.  
- **Closed beta / support** link or copy.  
- **QA-only (optional):** reset local progress, reset onboarding — behind `NODE_ENV === 'development'` or hidden gesture.

### Where data lives

| UI label | Source |
|--------|--------|
| Name, email, plan | **Profile** |
| “Logged in as” | **Session** cache + profile reconcile |
| Sign out action | **Auth port** + clear session store |

---

## Section 14 — Recommended app-state boundaries

| Boundary | Owns | Persisted? |
|----------|------|------------|
| **Session store** | `SessionSnapshot`, sign-in/out | Yes (`lt.v1.session`) |
| **Profile store** | Profile document | Yes (`lt.v1.profile.*`) |
| **Progress stores** (or single facade) | Domain blobs | Yes (`lt.v1.progress.*`) |
| **Onboarding UI** | Step index, transient focus | Partial → profile |
| **Entitlements** | Derived from profile + usage + flags | No (selector / context) |
| **UI state** | Modals, scroll, selected tab | No |
| **React Query** | Server API caches (future) | Cache only |
| **Derived selectors** | `recommendedLesson`, etc. | Recompute |

**Must be ephemeral:** wizard validation errors, recording state, exam timer unless persisted intentionally in progress.

---

## Section 15 — Reuse / refactor decisions (current codebase)

| Area | Decision |
|------|----------|
| **Routing** | **Reuse with refactor:** introduce `(public)` route group + `/pricing`, `/waitlist`; keep `/app/*` private; move onboarding under `/app/onboarding` with guard. |
| **App shell** | **Reuse directly:** `AppLayout`, `Header`, `BottomNav` for private app. |
| **Nav** | **Reuse directly**; ensure public layout does not import bottom nav. |
| **Feature gating** | **Reuse with refactor:** keep `PaywallModal` / `TrialBanner` UX; **replace** truth source with **entitlements** from **profile.plan** + usage; remove production reliance on `premiumStore` default true + `DEMO_USAGE`. |
| **Progress storage** | **Refactor:** migrate all `DEFAULT_REVIEW_USER_ID` / `getRetentionUserId()` product paths to **active `userId`**; namespace keys. |
| **Readiness / mastery / review** | **Refactor:** same — per-user keys via progress/review ports. |
| **Exam results storage** | **Refactor:** per-user domain keys. |
| **Settings** | **Reuse with refactor:** bind to profile + session actions. |
| **Onboarding** | **Reuse with refactor:** persist answers to profile; fix `authStore.setAuthenticated` onboarding semantics. |
| **Auth wrappers** | **Reuse with refactor:** `RequireAuth` reads **session store**; optional middleware later. |
| **Mock auth** | **Reuse with refactor:** extract behind `AuthPort`; tighten registry. |

---

## Section 16 — Implementation guardrails

1. Do **not** merge profile and progress into one persisted object.  
2. Do **not** use learner `localStorage` keys without `userId` (except session / device prefs).  
3. Do **not** scatter plan checks — use **entitlements** only.  
4. Do **not** rely on routes alone for onboarding — **persist** `onboardingComplete` and answers on profile.  
5. Do **not** let feature code import **mock auth** directly — use **auth port**.  
6. Do **not** seed beta progress with demo datasets.  
7. **Do** add **schema version** fields before first beta ship with real users.  
8. **Do** document **migration** from legacy keys (`auth-storage`, `local-demo-user`, global progress keys) in implementation tickets.

---

## Section 17 — Recommended file / module shape

Conceptual layout under `src/` (adjust names to taste):

```
src/
  lib/
    auth/
      authPort.ts              # interface + types
      mockBetaAuth.ts          # beta implementation
      betaUsers.registry.ts    # invite list (or config)
    session/
      sessionTypes.ts
      sessionStore.ts          # zustand persist → lt.v1.session
      sessionSelectors.ts
    profile/
      profileTypes.ts
      profileRepository.ts     # load/save/migrate lt.v1.profile.*
      profileStore.ts          # optional thin zustand
    progress/
      progressTypes.ts
      domains/                 # retention, review, practice, exam, …
        retentionRepository.ts
        reviewRepository.ts
        ...
      progressBootstrap.ts     # empty init for new user
    onboarding/
      onboardingSteps.ts       # UI config
      mapAnswersToProfile.ts   # pure mapping
    entitlements/
      computeEntitlements.ts   # plan + usage → capabilities
      EntitlementContext.tsx   # refactored from current provider
    persistence/
      storageKeys.ts           # lt.v1.* constants
      namespacedStorage.ts     # helpers
    sync/                      # future
      syncTypes.ts
      dirtyFlags.ts
  components/
    auth/
      RequireAuth.tsx
    layout/
      AppLayout.tsx
      PublicLayout.tsx
```

**Apps routes:**

```
src/app/
  (public)/
    layout.tsx
    page.tsx
    pricing/page.tsx
    waitlist/page.tsx
    login/page.tsx
    signup/page.tsx
  app/                         # private product (existing tree)
    layout.tsx                 # RequireAuth + AppLayout
    onboarding/
      layout.tsx               # optional minimal shell
      page.tsx
    ...
```

---

## Document control

| Version | Date | Notes |
|---------|------|--------|
| 1.0 | 2025-03-26 | Initial architecture contract |

---

*End of architecture document.*
