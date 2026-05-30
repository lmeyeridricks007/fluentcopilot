# Plan gating & entitlements (closed beta)

## Plan model

- **`BetaPlanId`**: `'basic' | 'premium'` — source of truth on the mock registry row and mirrored on session `UserProfile.plan` after login (`docs/product/mock-beta-user-registry.md`).
- **`premiumStore.isPremium`** is synced from `user.plan === 'premium'` in `accountBootstrap` for legacy UI; **gates must not rely on the store alone**.
- **Product rules** live in `src/lib/entitlements/`: `featureKeys.ts`, `planRules.ts`, `featureAccess.ts`, `lockedStateContent.ts`, `practiceRouteLocks.ts`.

## Who sees what (beta)

| Account | Registry example |
|--------|-------------------|
| Basic | `leemeyeridricks@gmail.com` |
| Premium | Other invited emails |

## Feature map

**Premium-only** (`PREMIUM_ONLY` in `planRules.ts`):

- `exam_prep_modules` — everything under `/app/exam-prep` except the **landing** (`/app/exam-prep` only).
- `exam_practice_exams` — same layout gate today (bundled with modules for Basic).
- `practice_skill_tracks` — `/app/practice/tracks` (+ nested).
- `practice_simulation` — `/app/practice/simulation` (+ nested).
- `practice_voice_tutor` — `/app/practice/voice` (+ nested).
- `practice_pronunciation` — `/app/practice/pronunciation-feedback`.
- `practice_open_conversation` — `/app/practice/free/…`, `/app/practice/semi/…`.
- `insights_readiness_detail` — B1 readiness card shows headline only; reason line + progress link hidden on Basic.
- `premium_lesson_content` — lessons flagged `isPremium` in mocks (unchanged pattern, now driven by **plan** via `useProductEntitlements`).

**Basic keeps**

- Learn browse/path/review (subject to existing **daily caps** in `EntitlementProvider`).
- Practice hub: scenario library, listening hub, guided flows, missions, weak areas, etc.
- Exam prep **landing**: preview card + **gated** domain cards (modal explains Premium).

## UX patterns

1. **Route layouts** — `app/app/exam-prep/layout.tsx` and `app/app/practice/layout.tsx` render `PremiumLockedScreen` (full-width, back link, primary + optional pricing CTA).
2. **Exam landing** — `GatedExamTypeCard` + `FeatureLockModal` for Basic.
3. **Badges** — `PremiumBadge` on Voice + skill tracks header on Practice hub for Basic.
4. **Paywall modal** — caps still use `PaywallModal`; added **View public pricing** → `/pricing`.
5. **Settings / profile** — show **Beta account: Basic | Premium**; no fake checkout toggles.

## Daily caps

`EntitlementProvider` sets **unlimited** when `accountPlanPremium || inTrial`. Registry **Basic** users always hit caps unless a persisted trial end date is still in the future (legacy demo data).

## Analytics (see `analytics.ts`)

- `premium_feature_locked`, `premium_feature_viewed`, `premium_feature_cta_clicked`, `pricing_opened_from_lock`, `basic_user_hit_lock`
- Existing: `premium_block_shown`, `premium_upgrade_clicked`, etc.

## Future (real billing)

1. Keep `FeatureKey` + `canAccessFeature(plan, key)`.
2. Replace `user.plan` with subscription claims or API snapshot.
3. Remove or narrow `premiumStore` to marketing trial only if needed.

## Next step

**Build the profile state layer** (richer learner profile + preference persistence beyond plan) so entitlements can eventually merge with server-side subscription state.
