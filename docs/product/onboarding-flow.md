# Onboarding flow (v2, closed beta)

## Structure

Seven screens (indices `0…6`), mobile-first, one main question per step:

| Step | Key | Collects |
|------|-----|----------|
| 0 | `goal` | Primary goal (single-select id → `primaryGoal`) |
| 1 | `current_level` | Self-reported level (`currentLevelSelfReport`) |
| 2 | `target_path` | First pathway (`targetPath`: a2, a2_mastery, exam_prep, b1) |
| 3 | `focus_skills` | Focus areas (multi-select ids → `focusSkills`) |
| 4 | `study_rhythm` | Cadence (`studyRhythm`) |
| 5 | `reason` | Motivation (`learningReason`) |
| 6 | `summary` | Recap + CTA into app |

Constants and copy live in `src/features/onboarding/onboardingOptions.ts`.  
Orchestration: `OnboardingFlow.tsx` + `useOnboardingFlow.ts`.  
Step UI: `OnboardingStep*.tsx`, `OnboardingSummary.tsx`.

## Persistence

- **While in progress:** debounced `persistOnboardingDraft(userId, step, data)` → profile `onboardingStep` + `onboardingData` (user-scoped).
- **On completion:** `markLearnerProfileOnboardingComplete(userId, data)` merges answers into `onboardingData`, copies structured snapshot into `preferences.personalization`, mirrors `selectedPath`, `focusAreas`, `studyRhythm`, `currentLevel`, `desiredLevel`, sets `onboardingComplete`, updates Zustand auth profile fields used in session.

Legacy v1 drafts (native language / country filled but no `primaryGoal`) are treated as **fresh** start — see `onboardingStateResolver.ts`.

## Personalization

- **`getPersonalizationHints(data)`** — `dashboardHeroHint`, `recommendedEntryPath`, etc.
- **`getPostOnboardingEntryPath(data)`** — first route after onboarding.
- **`readPersonalizationSnapshot(profile)`** — read answers back from storage for home / missions / recommendations.

## Analytics

`onboarding_started`, `onboarding_resumed`, `onboarding_step_viewed`, `onboarding_step_completed`, `onboarding_completed` (with choice properties on complete). Categories: `eventCategories.ts` → `onboarding`.

## Related

- [`first-login-initialization.md`](./first-login-initialization.md)
- [`account-session-bootstrap.md`](./account-session-bootstrap.md)
- [`localstorage-schema.md`](./localstorage-schema.md)
