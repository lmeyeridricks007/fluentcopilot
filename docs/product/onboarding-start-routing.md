# Onboarding → first in-app experience (start routing)

After onboarding completes, the app chooses a **deterministic first route** and a **short handoff message** from the same profile signals already persisted on `UserProfileDocumentV1`. This is an **initial** experience only: navigation and tabs stay available; nothing is permanently locked.

## Decision model

`resolveOnboardingStartExperience(data)` returns:

| Field | Meaning |
|--------|---------|
| `pathwayKey` | Internal category (`a2_curriculum`, `exam_prep`, `practice_confidence`, `b1_dashboard`, `fallback_learn`) |
| `route` | First pathname (no query) |
| `emphasis` | What to stress on the destination (`a2_path`, `exam_modules`, `scenarios_skills`, `dashboard_explore`) |
| `decisionTrace` | Machine-readable priority reason (analytics / debugging) |
| `welcomeHeadline` / `welcomeSubline` | Copy for the one-time handoff banner |
| `summaryCtaLabel` | Onboarding summary step button |

Implementation: `src/lib/onboarding-routing/` (`onboardingPathwayMapper`, `onboardingWelcomeBuilder`, `onboardingStartExperience`, `onboardingStartRouteResolver`).

## Priority (explicit)

1. **`targetPath`** from the pathway step — always wins when set (`a2`, `a2_mastery`, `exam_prep`, `b1`).
2. **`primaryGoal === exam_inburgering`** → exam prep.
3. **`learningReason === exam_visa`** → exam prep.
4. **Confidence / speaking-first** (`confidence_b1`, `speaking_more`, `learningReason === confidence`) → practice hub.
4b. **`everyday_dutch` + focus speaking** → practice hub.
5. **Unknown non-empty `targetPath`** → fallback learn (safe curriculum entry).
6. **Default** → A2 curriculum (`/app/learn`).

Mixed signals (e.g. exam reason + A2 path): **explicit `targetPath` overrides** inferred goals so the choice the user made on the pathway step stays trustworthy.

## Routes

| Pathway | Route | First-screen behavior |
|---------|--------|------------------------|
| `a2_curriculum`, `fallback_learn` | `/app/learn` | Handoff banner; if curriculum path UI is on, **My path** tab selected |
| `exam_prep` | `/app/exam-prep` | Handoff above existing exam landing |
| `practice_confidence` | `/app/practice` | Handoff above Practice hub |
| `b1_dashboard` | `/app/home` | Handoff on home |

## Handoff (session)

`sessionStorage` key `lt.v1.onboardingStartHandoff` holds `{ route, pathwayKey, headline, subline }` for one paint cycle. `OnboardingEntryHandoff` (per destination) shows the card and clears storage on dismiss. No URL params — avoids shareable “stuck” states.

## Profile persistence

`onboardingStartExperienceV1` on the profile stores the last resolved snapshot (route, pathway, copy, `decisionTrace`, key signals) for analytics and future overrides (e.g. `chosenStartingPath`). It does **not** block navigation.

Optional: `firstPersonalizedHandoffShownAt` reserved for future use.

## Analytics

- `onboarding_start_route_resolved` / `onboarding_start_path_selected` — at completion (includes `decision_trace`, signals).
- `onboarding_start_experience_shown` — handoff mounted.
- `onboarding_personalized_route_entered` — same moment as shown (funnel-friendly name).

## Integration points

- **Completion:** `markLearnerProfileOnboardingComplete` merges `onboardingStartExperienceV1`; `useOnboardingFlow` writes handoff + `router.push(route)`.
- **Legacy helpers:** `getPostOnboardingEntryPath` delegates to `resolveOnboardingStartExperience`.
- **Returning users:** Bootstrap still sends completed users to `/app/home` unless product later adds “resume recommended route” (profile has `onboardingStartExperienceV1` if needed).

## Assumptions

- Exam and B1 routes are valid first destinations in the current shell (verified: `/app/exam-prep`, `/app/home`, `/app/learn`, `/app/practice` exist).
- Curriculum path tab forcing applies only when `isCurriculumPathUiEnabled()` is true; otherwise Learn stays on browse with banner only.

## Next step

**Implement plan gating across the app** (entitlements, path access, and consistent “next best” that respect the same pathway signals without hard-locking users).
