# Auth, route, and app-shell audit

**Purpose:** Ground-truth review of the Next.js App Router structure, navigation shell, mock auth, progress persistence, and plan gating **before** adding real authentication, marketing pages, beta waitlist, per-user sync shapes, and production-grade gates.

**Scope:** Repository state as audited (Next.js, `src/app/*`). No auth implementation changes were made for this document.

---

## 1. Executive summary

- **Routing:** The learner product lives under **`/app/*`**, wrapped by a single **client layout** that composes **`RequireAuth` → `AppLayout`** (header, bottom nav, offline banner, entitlements). The **root `/`** route is a **marketing-style welcome** (`WelcomePage`). **`/login`**, **`/signup`**, **`/forgot-password`**, and **`/onboarding`** sit **outside** the `/app` layout and therefore **do not** get the authenticated shell.
- **Public vs private today:** There is **no Next.js middleware** and **no server-side session**. “Private” is enforced only by **`RequireAuth`**, which reads **Zustand + `localStorage`** (`auth-storage`) and redirects unauthenticated users to **`/`** and users without completed onboarding to **`/onboarding`**.
- **Auth reality:** The app already has **mock auth** (`mockAuthService`, demo users) and a **persisted profile shape** in `authStore`. However, **almost all learning progress** is keyed to a **fixed synthetic id** (`local-demo-user` via `getRetentionUserId()` / `DEFAULT_REVIEW_USER_ID`) or **global `localStorage` keys with no user suffix**. The **authenticated user id is not the source of truth for progress**.
- **Plan gating:** **`premiumStore`** (persisted, default `isPremium: true` in code) plus **`EntitlementProvider`** drive caps and tier. **Usage limits** for lessons/scenarios are wired to **`DEMO_USAGE`** from **demo-data** (module-level constants), not to real per-user counters—so caps are **not truly per-user** today. Feature-level checks are **split** between `useEntitlement()`, direct `usePremiumStore` reads, and catalog flags (`isPremium` on lessons/scenarios).
- **Risks before real auth:** (1) Progress and auth identity are **decoupled**; (2) **`/app/premium` is linked from the public welcome footer** but is **behind `RequireAuth`**—anonymous users hit a redirect loop to `/`; (3) **`/admin/*` has no auth guard** in layout; (4) onboarding step state is **not persisted**; (5) `setAuthenticated` **always** sets `hasCompletedOnboarding` to `false` when a user logs in (see §6).

**Shell recommendation for next step:** Prefer **two route groups** under `src/app`: e.g. `(public)` for marketing, auth entry, waitlist, pricing **marketing**; `(app)` or continue `app/` for the **authenticated product shell** with `RequireAuth` + `AppLayout`. Optionally a **third group** `(onboarding)` with a **minimal shell** (progress only, no bottom nav) if product wants that UX. Avoid a single visual shell that tries to serve logged-out marketing and full app nav without clear state splits.

---

## 2. Current route map

### 2.1 Top-level structure

| Path prefix | Layout chain | Notes |
|-------------|--------------|--------|
| `/` | `src/app/layout.tsx` → `AppProviders` only | Welcome / marketing entry |
| `/login`, `/signup`, `/forgot-password`, `/onboarding` | Root layout only | Standalone flows, no bottom nav |
| `/app/*` | Root → **`src/app/app/layout.tsx`** (`RequireAuth` + `AppLayout`) | Full product shell |
| `/admin/*` | Root → **`src/app/admin/layout.tsx`** (`AdminLayout`) | **No `RequireAuth`; no middleware** |

### 2.2 Complete learner routes (`/app/...`)

Derived from Next generated types and `src/app/app/**/page.tsx` (dynamic segments shown as `[param]`).

**Core & nav targets**

- `/app` → redirects to `/app/home`
- `/app/home`
- `/app/learn`, `/app/learn/[lessonId]`, `/app/learn/[lessonId]/flashcards`, `/app/learn/[lessonId]/quiz`
- `/app/learn/b1`, `/app/learn/post-a2`
- `/app/learn/schema/*` (multiple fixed schema paths: e.g. `food-shopping`, `people-daily`, `plans-social`, …)
- `/app/practice` (hub)
- `/app/practice/scenarios`, `/app/practice/simulation`, `/app/practice/simulation/[scenarioId]`
- `/app/practice/guided/[scenarioId]`, `/app/practice/semi/[scenarioId]`, `/app/practice/free/[scenarioId]`, `/app/practice/scenario/[scenarioId]`
- `/app/practice/voice`, `/app/practice/voice/[scenarioId]`
- `/app/practice/listening`, `/app/practice/listening/[exerciseId]`
- `/app/practice/pronunciation-feedback`
- `/app/practice/tracks`, `/app/practice/tracks/[trackId]`, `/app/practice/tracks/[trackId]/session`
- `/app/progress`, `/app/progress/abilities/[abilityId]`
- `/app/settings`, `/app/settings/profile`, `/app/settings/notifications`, `/app/settings/section/[section]`
- `/app/premium`
- `/app/achievements`, `/app/leaderboard`, `/app/reflection`
- `/app/revision`
- `/app/review/daily`, `/app/review/module`, `/app/review/mistakes`

**Daily / context features**

- `/app/daily-lessons`, `/app/daily-lessons/[lessonId]`, `capture`, `history`, `intro`, `settings`
- `/app/context-prompts`, `/app/context-prompts/[promptId]`, `intro`, `settings`

**Exam**

- `/app/exam` → redirects to `/app/exam-prep`
- `/app/exam-prep`, `/app/exam-prep/[examType]`
- KNM: `/app/exam-prep/kmn`, `[topicId]`, `flashcards`, `quiz`, `scenario/[scenarioId]`, `practice-exams`, `practice-exams/[setId]`
- Reading / Listening / Writing / Speaking: `training`, `simulation` (where present), `practice-exams`, `practice-exams/[setId]`

### 2.3 Auth & pre-app routes

- `/login`, `/signup`, `/forgot-password`, `/onboarding`

### 2.4 Admin routes

- `/admin`, `/admin/queue`, `/admin/batches`, `/admin/batches/[batchId]`, `/admin/scenarios`, `/admin/prompts`, `/admin/published`, `/admin/validation`, `/admin/audit`, `/admin/settings`, `/admin/artifact/[artifactId]`

### 2.5 Classification: public vs private (recommendations)

| Route / group | Current access | Should become **public** | Should stay **private** | Unclear / decision |
|---------------|----------------|---------------------------|-------------------------|--------------------|
| `/` Welcome | Public | **Yes** (marketing landing) | — | Expand or replace with richer marketing |
| `/login` | Public | **Yes** (or merge into `/`) | — | Beta: may become “invite-only mock login” entry |
| `/signup` | Public | **No** / **replace** with “coming soon” | — | Product already planning disabled sign-up |
| `/forgot-password` | Public | Optional public stub | — | Low priority until real auth |
| `/onboarding` | Public URL, no auth guard | **Partially public** risky | Prefer **private**: require authenticated session before steps | Today anyone can open URL; should align with session |
| `/app/*` entire tree | `RequireAuth` | — | **Yes** (core product) | `/app/premium` might duplicate future `/pricing`—decide single upsell URL |
| Future `/pricing`, `/waitlist`, legal | N/A | **Yes** | — | New routes; avoid colliding with `/app/*` |
| `/admin/*` | No guard | **No** (must not be public in prod) | **Yes** + **strong guard** | Treat as separate deployment or env-gated |

**Structural issues for auth**

1. **Marketing link to private route:** `WelcomePage` footer uses `router.push('/app/premium')` while `/app/premium` is under `RequireAuth` → unauthenticated users are sent to `/` (loading then replace), not a public pricing page.
2. **No middleware:** Deep links to `/app/...` flash “Loading…” then redirect; acceptable for PWA-style mock, weak for SSR/SEO and for avoiding content leakage if a page ever becomes server-rendered with data.
3. **`/onboarding` not coupled to auth:** No wrapper ensures only authenticated users complete onboarding (cookie/session absent).

---

## 3. Current shell / layout structure

### 3.1 Root layout

**File:** `src/app/layout.tsx`

- Sets font, metadata, viewport.
- Wraps all pages in **`AppProviders`** (React Query only—no auth provider).

### 3.2 Authenticated product shell

**File:** `src/app/app/layout.tsx`

```tsx
<RequireAuth>
  <AppLayout>{children}</AppLayout>
</RequireAuth>
```

- **`export const dynamic = 'force-dynamic'`** on this segment (disables static optimization for the whole `/app` tree).

**File:** `src/components/layout/AppLayout.tsx`

- **`EntitlementProvider`** (wraps entire shell so `useEntitlement` works everywhere inside).
- **`OfflineBanner`**
- **`Header`** (sticky): back button rules for deep links under `learn`, `practice`, `reflection`, `premium`, `settings`, `progress`, `achievements`, `exam`, `exam-prep`; **`DevScenarioSwitcher`** in trailing slot.
- **`TrialBanner`**
- **`main`** scroll region with bottom padding for nav
- **`BottomNav`**

### 3.3 Admin shell

**File:** `src/app/admin/layout.tsx` → `AdminLayout`

- Sidebar + top bar + main content.
- **No authentication or role check** in this audit’s codebase.

### 3.4 Public-shell vs private-shell boundaries (where they should live)

| Concern | Current | Recommended next step |
|---------|---------|------------------------|
| Marketing + legal | Crammed into `/` welcome | **`(public)` route group** with shared `PublicLayout` (header/footer optional) **without** `BottomNav` |
| Auth entry | `/login`, `/signup` standalone | Same public group; **thin layout** consistent with brand |
| Onboarding | `/onboarding` standalone | Either **minimal layout** in public group with **server/client guard** (must have session), or **nested under authenticated segment** after first token |
| Product | `/app/*` | Keep **`RequireAuth` + `AppLayout`**; optionally rename segment to `(main)` for clarity |

**One shell vs two layouts:** Use **separate layouts** (public minimal vs private app chrome). The private shell is **tightly coupled** to **`BottomNav` paths under `/app`**; forcing marketing into that shell would confuse IA and entitlements. A **single component** could still share tokens and `AppProviders` at root.

### 3.5 Nav mounting points

- **Bottom navigation:** `BottomNav` — fixed; items: Home, Learn, Practice, Progress, Settings. **Learn tab** also highlights `revision`, `review`, and **`exam-prep`** paths (Practice tab logic).
- **Top:** `Header` — not route-based tabs; back affordance only on “sub-screens” (depth > 2 under `/app`).
- **Side:** Admin only.

---

## 4. Current navigation structure

- **Home:** `/app/home`
- **Learn:** `/app/learn` + extended “learn area” highlighting for `/app/revision`, `/app/review/*`
- **Practice:** `/app/practice` + same tab active for **`/app/exam-prep/*`** (exam prep treated as practice neighborhood)
- **Progress:** `/app/progress`
- **Settings:** `/app/settings` (profile at `/app/settings/profile`)

**Coupling note:** Bottom nav is **hardcoded to `/app/...`**. Any public marketing routes must **not** reuse this component without a different `navItems` model.

---

## 5. Public vs private route recommendations (summary)

- **Public:** `/`, future `/pricing`, `/waitlist`, legal, static product marketing, and **auth entry** routes (login; sign-up stub).
- **Private (authenticated):** All current `/app/*`, plus **onboarding** once tied to identity.
- **Gated / non-customer:** `/admin/*` (separate from consumer auth; use env, basic auth, or SSO).

---

## 6. Current auth assumptions

### 6.1 What enforces “logged in”

- **`RequireAuth`** (`src/components/auth/RequireAuth.tsx`): client `useEffect` → `router.replace('/')` if `!isAuthenticated`, else `router.replace('/onboarding')` if `!hasCompletedOnboarding`.
- While redirecting, shows **“Loading…”** (full screen).

### 6.2 Auth state implementation

- **`useAuthStore`** (`src/store/authStore.ts`): Zustand + **`persist` → `localStorage` key `auth-storage`**.
- Fields: `isAuthenticated`, `hasCompletedOnboarding`, `user` (`UserProfile`).

### 6.3 Mock / demo behavior

- **`WelcomePage`:** “Get started” / “Continue as guest” call **`setAuthenticated`** with a **hardcoded demo profile** (`id: 'demo'`, …) and route to onboarding or home (guest skips onboarding via `setOnboardingComplete(true)`).
- **`LoginPage`:** **`mockAuthService.login`** validates against **`@/lib/auth`** closed-beta registry + shared temp password; **`LoginForm`** syncs **`premiumStore`** from **`user.plan`** and **`setAuthenticated`** then **`router.replace('/onboarding')`**.
- **`SignUpPage`:** **`mockAuthService.signUp`** always rejects (beta closed); no public account creation.

### 6.4 Hidden assumptions / bugs to track

1. **`setAuthenticated` always sets `hasCompletedOnboarding` to `false`** — the ternary is `user ? false : false` (always false). Effect: **every** login/sign-in via this path **forces onboarding** unless something else sets completion. Guest flow bypasses by explicitly calling `setOnboardingComplete(true)`.
2. **`/onboarding`** is not wrapped in `RequireAuth`—only convention and typical navigation prevent anonymous onboarding completion.
3. **No refresh token, no server session, no CSRF**—expected for mock; real auth will need a different boundary.
4. **`LoginPage` is a client component tree** but `LoginPage.tsx` does not declare `'use client'` in the feature file—it's imported from a **`page.tsx` that is `'use client'`**, so it runs on client. (No change needed for audit.)

### 6.5 What would break if “clean” unauthenticated access is introduced

- Any direct **`Link` to `/app/...`** from public pages without auth → redirect to `/` (e.g. **View Premium** on welcome).
- **`EntitlementProvider`** only wraps **`AppLayout`**—public pages **do not** have `useEntitlement` unless provider is lifted to root (optional).
- **`mockServices` / analytics** may read `useAuthStore.getState().user`—public pages won’t have user until defined.

---

## 7. Profile / progress state location

### 7.1 Profile-like state

| Location | Scope | Persistence |
|----------|--------|-------------|
| `authStore.user` | Intended **per user** | `localStorage` via zustand `auth-storage` |
| `onboardingStore` | Wizard state | **Memory only** (lost on refresh) |
| `dailyLessonPreferencesStore`, `locationPromptPreferencesStore` | Per device | `localStorage` (single key each, **not user-scoped**) |
| Settings feature pages | Read/write profile via auth store | Same as auth |

### 7.2 Progress / learning state — **critical: identity vs storage**

**Uses `getRetentionUserId()` → always `'local-demo-user'` today** (not `authStore.user.id`):

- `src/lib/retention/retentionService.ts` — `getRetentionUserId()`
- `src/features/retention/useRetentionProfile.ts`
- `src/features/practice-hub/usePracticeHubViewModel.ts` — missions + mistakes + mastery use this id
- Many call sites pass **`DEFAULT_REVIEW_USER_ID`** from `reviewPersistence.ts` (`'local-demo-user'`)

**Retention profile persistence:** `language-tutor-retention-profile-v1:{userId}` — key supports per-user, but **userId is fixed**.

**Ability mastery:** `language-tutor-v4-ability-mastery-{userId}` — same pattern.

**Mission runtime:** `language-tutor-mission-runtime-v1-{userId}` — hydrated with **`getRetentionUserId()`** in practice hub.

**Review engine keys (per userId in API):** `language-tutor-v4-review-bank-`, `-srs-`, `-mistakes-`, `-mastery-` + userId suffix — all used with **`local-demo-user`** in practice flows.

### 7.3 Global (no user suffix) — **shared across all accounts on same browser**

| Key / area | File / note |
|------------|-------------|
| `language-tutor-scenario-progress-v2` | `scenarioProgressStorage.ts` |
| `language-tutor-skill-track-progress-v1` | `skillTrackProgressStorage.ts` |
| `language-tutor-practice-exam-attempts-v1` | `practiceExamAttemptService.ts` |
| `language-tutor-kmn-progress-v1` | `kmnProgressService.ts` |
| `language-tutor-exam-readiness-attempts-v1` | `examReadinessHistory.ts` |
| `language-tutor-practice-continue-v1` | `practiceHubStorage.ts` |
| `language-tutor-practice-milestone-seen-v1` | `practiceMilestoneService.ts` |
| `language-tutor-schema-mistakes-v1` | `mistakeTracker.ts` |
| `language-tutor-a2-review-v1`, `language-tutor-a2-weak-tags-v1` | `a2ReviewStore.ts` |
| `lt-practice-completion-ui-v1` | `practiceProgressUiStorage.ts` |
| `language-tutor-retention-leaderboard-cohort-v1` | `leaderboard.ts` |
| `demoScenario` | `demo-data` (dev/demo dataset selector) |
| Zustand `language-tutor-premium-demo-default-premium` | `premiumStore` |
| `entitlements-trial-banner-dismissed` | `TrialBanner.tsx` |
| `lt-analytics-session-v1` | `analyticsSession.ts` |

### 7.4 Demo usage vs real caps

- **`EntitlementProvider`** sets `lessonsToday` / `scenariosToday` from **`DEMO_USAGE`** (`demo-data/index.ts`) — **not** from auth user or persisted counters—so **free-tier simulation is global to the demo scenario**, not per logged-in mock user.

### 7.5 Multi-user on same device (risk)

- Switching **`authStore.user.id`** (e.g. demo → invited user) **does not** switch most persisted progress keys.
- **Two real users** on one browser would **share** `'local-demo-user'` progress and all **global** keys above → **incorrect progress attribution** until refactored.

### 7.6 Refactor direction (for “future-ready sync shape”)

1. Define a single **`getActiveLearnerId(): string`** (or async) sourced from **session**, with a **stable anonymous id** only before login if product allows.
2. **Namespace all `localStorage` keys** with that id (or use one JSON blob per user for migration).
3. **Deprecate `DEFAULT_REVIEW_USER_ID`** for product paths; keep only for tests or one-off scripts if needed.
4. Align **`premiumStore`** (or replace with **`user.plan`** on profile) to the same identity.

---

## 8. Plan gating implementation

### 8.1 Stores and providers

| Piece | Role |
|-------|------|
| `premiumStore` | `isPremium`, `trialEndsAt`; **default `isPremium: true`** in source → dev-friendly but **masks free tier** unless user toggles / new install |
| `getTierFromStore` | `free` / `trial` / `premium` |
| `EntitlementProvider` | Combines tier + **`DEMO_USAGE`** → `canStartLesson`, `canStartScenario`, caps |
| `useEntitlement()` | Consumer API for caps and tier |

### 8.2 Where gates are enforced

**Central / hook-based**

- `LearningPathScreen`, `LessonDiscoveryPage` — lesson caps + premium lesson lock + `PaywallModal`
- `GuidedScenarioPage`, `OpenPracticeScenarioPage`, `SimulationPage` — scenario caps + premium feature paywall
- `SkillTrackDetailPage`, `SkillTrackSessionPage` — `PaywallModal` `premium_feature`
- `ScenarioCatalogPage` / `buildScenarioCardModels` — `isPremiumLocked`, `hrefOverride` to `/app/premium`
- `practiceUnlockService` — tier drives **free-mode unlock** after semi-guided practice

**Direct `usePremiumStore` (bypasses `useEntitlement` for feature flags)**

- `VoiceTutorPage`, `FreerPracticePremiumPanel`, `GeneratedLessonPage` (`premiumRequired`), `ContextPromptDetailPage`, `SmartPromptsIntroPage`, `DailyLessonsHubPage`, `DailyLessonsIntroPage`, `PremiumUpsellPage`, `SettingsPage`, `LearningPathScreen` (lesson lock), `LessonDiscoveryPage`

**Mission templates**

- `missionAssigner.instantiateMission` — `requiresPremium && ctx.tier === 'free'` skips template

**Client mission context**

- `getClientMissionGeneratorContext` — uses `usePremiumStore` + **`DEMO_USAGE`** for `atScenarioCap`

### 8.3 Visual vs functional

- **Functional:** Lesson start blocked when `!canStartLesson && atLessonCap`; scenarios similarly; some routes **gate content** when `!isPremium` (e.g. voice tutor).
- **Visual:** Premium badges on cards, locked states, `PaywallModal`.
- **Duplication:** Same concept (“is premium?”) is checked in **both** `useEntitlement().tier` and **`usePremiumStore`** in different files.

### 8.4 Attach to real user plan later

- **Reusable:** `EntitlementProvider` pattern, `PaywallModal`, `UsageIndicator`, `TrialBanner`, tier enum.
- **Must change:** Replace **`DEMO_USAGE`** with **per-user usage** (or server); bind **`isPremium` / `trialEndsAt`** to **profile or billing**; **single source** for “can use feature X” (e.g. `can('voice_tutor')`) to reduce scatter.

---

## 9. Risks / issues before auth

1. **Progress not tied to `authStore.user.id`** — multi-user and “mock beta invitees” will see **wrong or shared** data.
2. **Many `localStorage` keys are global** — same problem for exams, KNM, skill tracks, scenario progress, A2 review.
3. **Welcome → `/app/premium` broken for logged-out users** — product and analytics friction.
4. **`premium` default `true`** — easy to ship features **without noticing** free-tier UX.
5. **Entitlement usage is demo-global** — caps do not validate per-user persistence logic.
6. **No middleware / admin guard** — `/admin` exposure if deployed publicly.
7. **Onboarding not authenticated-bound** — URL alone allows access; store not persisted.
8. **`setAuthenticated` onboarding reset** — may be intentional for “always onboard after login” or may be a **logic bug** (`user ? false : false`).
9. **`/app` forced dynamic** — consider splitting static marketing vs dynamic app if perf/SEO matters.
10. **Route overlap risk:** Future **`/pricing`** vs **`/app/premium`** — need one product truth for checkout/upsell deep links.

---

## 10. Recommended architectural approach (next implementation step)

1. **Define auth and user-state architecture** (single doc or ADR): session model (cookie vs token), what lives on **`UserProfile`**, **`plan`**, **`entitlements`**, **`onboardingCompleted`**, and **anonymous** vs **authenticated** ids.
2. **Introduce route groups:** `(public)` / `(app)` / optional `(onboarding)` with **explicit layouts**; add **middleware** (or edge checks) for **admin** and optionally for **`/app/*`** once server session exists.
3. **Unify learner id for storage:** replace `getRetentionUserId()` / hardcoded `DEFAULT_REVIEW_USER_ID` in product code paths with **session-derived id**; migrate or namespace `localStorage` keys.
4. **Centralize gating:** one **policy module** (or hook) fed by user + plan + usage; keep `PaywallModal` as presentation.
5. **Fix public pricing entry:** either **public `/pricing`** or gate **`WelcomePage`** links behind auth only after login.

---

## 11. Reuse vs refactor matrix

| Area | Classification | Notes |
|------|----------------|-------|
| Next.js App Router structure | **Reuse with refactor** | Add route groups + middleware; keep `/app` subtree mostly intact |
| Root `AppProviders` | **Reuse directly** | May add auth/session provider later |
| `AppLayout` + `Header` + `BottomNav` | **Reuse directly** | Nav items may become role/plan-aware |
| `RequireAuth` | **Reuse with refactor** | Replace client-only redirect with server/middleware + loading UX |
| `authStore` shape | **Reuse with refactor** | Extend with `plan`, `beta`, `syncVersion`; fix onboarding on login |
| `mockAuthService` | **Reuse with refactor** | Good stand-in for “invited users only” until API exists |
| `onboarding` UI flow | **Reuse with refactor** | Persist step or server-save; guard route |
| Progress / retention / review persistence | **Rebuild / separate** | Keys and `DEFAULT_REVIEW_USER_ID` must align with real user |
| Mission + practice hub wiring | **Reuse with refactor** | Already accepts `userId`; stop using fixed id |
| `EntitlementProvider` + `PaywallModal` | **Reuse with refactor** | Swap `DEMO_USAGE` and premium source |
| `premiumStore` | **Reuse with refactor** or **merge into profile** | Demotes to dev toggle when server plan exists |
| `DEMO_USAGE` in entitlements | **Rebuild / separate** | Replace with real counters |
| Admin area | **Missing entirely** (auth) | Add guard before any public deploy |
| Public marketing pages | **Missing entirely** (beyond welcome) | Add dedicated routes + layout |
| Pricing / waitlist | **Missing entirely** | New public routes |
| Route protection (server) | **Missing entirely** | Middleware / RSC checks |

---

## 12. File reference index (audit trail)

| Topic | Primary files |
|-------|----------------|
| Shell | `src/app/layout.tsx`, `src/app/app/layout.tsx`, `src/components/layout/AppLayout.tsx`, `Header.tsx`, `BottomNav.tsx` |
| Auth guard | `src/components/auth/RequireAuth.tsx`, `src/store/authStore.ts` |
| Welcome / marketing entry | `src/app/page.tsx`, `src/features/welcome/WelcomePage.tsx` |
| Mock auth | `src/features/auth/pages/LoginPage.tsx`, `SignUpPage.tsx`, `src/features/auth/services/mockAuthService.ts` |
| Onboarding | `src/app/onboarding/page.tsx`, `src/features/onboarding/OnboardingFlow.tsx`, `src/store/onboardingStore.ts` |
| Entitlements | `src/features/entitlements/*`, `src/store/premiumStore.ts`, `src/demo-data/index.ts` |
| Retention / user id constant | `src/lib/retention/retentionService.ts`, `src/lib/review-engine/reviewPersistence.ts` |
| Admin | `src/app/admin/layout.tsx`, `src/admin/components/layout/AdminLayout.tsx` |

---

*End of audit.*
