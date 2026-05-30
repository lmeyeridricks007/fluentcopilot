# Auth & onboarding QA pass (closed beta)

**Date:** 2026-03-26  
**Scope:** Public marketing → pricing/beta → login → bootstrap → onboarding → app home → plan gating → account → persistence & multi-user behavior.

---

## 1. Executive summary

A full pass was performed against the eight QA dimensions requested, grounded in the twelve user journeys listed in the task brief. The implementation was already strong on **user-scoped storage keys**, **logout clearing in-memory learner stores**, and **honest pricing/beta CTAs**. The **highest-severity product defect** found was **post-login navigation always sending every user to `/onboarding`**, including returning learners who had already completed onboarding — a trust-breaking routing bug.

Additional **high-trust** issues: the **forgot-password flow promised email delivery** while the mock service performs a no-op success, and **`setAuthenticated` always forced `hasCompletedOnboarding` to `false`**, which was fragile if any code path re-applied session without an immediate bootstrap alignment.

This pass **fixes the critical redirect**, **hardens auth slice semantics for user switching**, **replaces forgot-password with beta-accurate guidance**, and **improves onboarding progress clarity and summary copy**. Remaining work is mostly **medium/low** (deeper persistence edge cases, broader copy passes, automated E2E).

---

## 2. What is working well

- **Multi-user storage:** Profile, progress manifest, drafts, and domain keys are built with `userId` segments (`storageKeys.ts`, `userScopedLocalKey`) — correct direction for one device, multiple beta accounts.
- **Logout cleanup:** `authStore.logout` clears learner profile store, progress store, premium flag, onboarding UI store, and auth slice — avoids holding the previous user’s in-memory snapshot.
- **Bootstrap orchestration:** `runAccountBootstrap` coordinates profile load, onboarding resolution, and `hasCompletedOnboarding` from durable profile — single source of truth after login.
- **Pricing & beta honesty:** Plan cards and banners state invite-based plans, no checkout, and waitlist-first CTAs — aligned with closed beta.
- **Login errors:** Mock failure messages are specific (`loginFailureMessages.ts`) and link to waitlist/beta help.
- **Plan visibility:** Account summary shows plan badge and beta context (`AccountSummaryCard`, `BetaInfoCard`).
- **Analytics:** Funnel events documented in `auth-onboarding-analytics.md` support beta learning.

---

## 3. Highest-impact issues (before fixes)

| Severity | Issue |
|----------|--------|
| **Critical** | After successful login, `LoginForm` always `router.replace('/onboarding')`, ignoring `hasCompletedOnboarding` and bootstrap outcome — returning users incorrectly forced through onboarding entry. |
| **High** | Forgot-password UI claimed “check your email” while `mockAuthService.forgotPassword` is a no-op — misleading and erodes trust. |
| **High** | `setAuthenticated` set `hasCompletedOnboarding` to `false` for every login (redundant `user ? false : false`), risky if session is reapplied without bootstrap in the same tick. |
| **Medium** | Onboarding progress bar showed a **percentage only** — harder to reason about than “step X of Y”. |
| **Medium** | Onboarding summary copy did not explicitly connect choices to **where the app sends you next**. |

---

## 4. Issues by QA dimension

### Marketing clarity

- **Working:** Home hero states Dutch/inburgering focus; pillars link to features and exam prep; CTAs include waitlist, features, beta explainer, sign-in.
- **Medium:** Features and Exam Prep pages were not deeply rewritten in this pass; value prop is already concrete but could be tightened further with user-testing.
- **Low:** Hero CTA count is high (four actions + sign-in link) — acceptable for beta; could A/B simplify later.

### Pricing clarity

- **Working:** Basic vs Premium differentiation, comparison table, “no buy now” disclaimer, invite-based assignment copy.
- **Low:** Could add a one-line “what you get on day one in the app” per plan — future enhancement.

### Beta messaging

- **Working:** `BetaNoticeBanner`, `InviteOnlyCallout`, login page, signup-disabled panels — consistent invite-only story.
- **Fixed (related):** Forgot-password no longer implies automated email during beta.

### Login friction

- **Critical fixed:** Post-login redirect uses `getPrivateEntryPath(hasCompletedOnboarding)`; optional `?next=` when safe (`isSafePrivateNextPath`).
- **High fixed:** `?next=` supported for deep links after login when onboarding is complete; login page wrapped in `Suspense` for `useSearchParams`.
- **High fixed:** Wrong-password state shows targeted help + links to beta help and password help page.
- **Medium:** Social buttons still show “not connected” — intentional; could hide row on login until wired.

### Onboarding quality

- **Fixed:** Visible “Step X of Y” + progress bar; summary description ties choices to routed start experience.
- **Working:** Resume via bootstrap + `onboarding_resumed` analytics; seven-step flow with summary.
- **Medium:** Individual step microcopy could still be user-tested for reading level and length.

### Plan gating

- **Working:** Gated exam cards, lock modal, premium locked screen with analytics and CTAs (`planAnalytics` integration from prior work).
- **Low:** Spot-check other premium surfaces as new modules ship — consistency pass.

### Local persistence correctness

- **Working:** Profile and progress separated; incremental onboarding saves; bootstrap recovery paths documented in product docs.
- **Not exhaustively re-tested in this pass:** Autosave/resume for every exam vertical — recommend targeted manual QA + future E2E.
- **Medium (future):** Corrupted JSON recovery — rely on existing bootstrap recovery; document any gaps if found in testing.

### Multi-user separation on one device

- **Working:** Logout clears Zustand slices tied to session; durable data remains keyed by `userId` so the next login loads the correct documents.
- **Fixed:** `setAuthenticated` now clears onboarding completion when the **user id changes** (or logs in after logout), instead of blindly forcing false for every call in a way that could race with same-user edge cases.
- **Recommendation:** Manually run journey **#10** (Lee → sign out → Sharon → sign out → Lee) on a dev build after each auth touch.

---

## 5. Severity / priority summary

### Critical (addressed in code)

1. Post-login redirect ignoring onboarding completion.

### High (addressed in code)

1. Forgot-password false promise of email reset.  
2. Login `next` param + Suspense for search params.  
3. Wrong-password helper links.  
4. `setAuthenticated` / multi-user semantics for `hasCompletedOnboarding`.

### Medium (partially addressed or documented)

1. Onboarding step labeling and summary connection to routing.  
2. Broader marketing/features copy — deferred.

### Low / future

1. Hide disabled OAuth row until real providers exist.  
2. Per-plan “day one in app” blurbs on pricing.  
3. Automated journey tests (Playwright) for login redirect and two-user switch.

---

## 6. Recommended fixes (backlog)

- Add **E2E tests** for: login → app home when `onboardingComplete`; login → onboarding when not complete; user A/B switch.  
- **Wire real forgot-password** when backend exists; keep current static page as fallback with feature flag.  
- **Optional:** `applyMockSignInSession` return `targetRoute` from bootstrap so UI never infers path from store (single return channel).

---

## 7. What was fixed during this QA pass

| Area | Change |
|------|--------|
| Login redirect | `LoginForm` uses `getPrivateEntryPath(hasCompletedOnboarding)` after `login()`; respects safe `?next=` for completed users. |
| Login page | `app/(public)/login/page.tsx` wraps `PublicLoginPage` in `Suspense` for `useSearchParams`. |
| Auth store | `setAuthenticated` preserves `hasCompletedOnboarding` only for the **same** `user.id`; otherwise resets to `false` until bootstrap sets from profile. |
| Forgot password | Replaced fake email-reset form with **beta-accurate** guidance and waitlist CTA (`ForgotPasswordPage.tsx`). |
| Login UX | Link label “Password help (beta)”; extra recovery copy for `password_invalid`. |
| Onboarding | “Step X of Y” header; summary copy mentions routed starting experience. |

**Files touched:** `src/features/auth/components/LoginForm.tsx`, `src/app/(public)/login/page.tsx`, `src/store/authStore.ts`, `src/features/auth/pages/ForgotPasswordPage.tsx`, `src/features/onboarding/OnboardingFlow.tsx`, `src/features/onboarding/OnboardingSummary.tsx`.

---

## 8. What still remains for future work

- Full **manual execution** of all twelve journeys on a staging build (especially exam autosave/resume and corrupted-storage recovery).  
- **Copy pass** on Features / Exam Prep public pages for differentiation.  
- **OAuth row** removal or feature-flag until implemented.  
- **Real** password reset integration and email templates.  
- **Automated tests** for multi-user and post-login routing.

---

## 9. Overall quality assessment (after fixes)

The first-run experience is **materially closer to production-quality**: returning invited users land in the **correct** private entry (home vs onboarding), beta password expectations are **honest**, and onboarding **communicates progress and outcome**. Persistence and multi-user design were already sound at the storage layer; auth slice behavior is now **less fragile** when identities change.

---

## 10. Recommended next step

**Internal beta testing** with a short script covering: first-time onboarding, return login, wrong password, forgot-password page, Basic vs Premium gates, sign-out → second user → sign-out → first user again. Follow with **live content refinement** on marketing pages based on tester questions, then a **light instrumentation review** (ensure new redirect paths still emit expected analytics).
