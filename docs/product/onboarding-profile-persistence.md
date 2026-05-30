# Onboarding → profile persistence

Onboarding answers are **durable profile state** under `lt.v1.profile.<userId>`, not transient UI state. They feed recommendations, routing, and future personalization.

## Fields (stable ids)

| Concern | Profile fields | Source in onboarding UI |
|--------|----------------|-------------------------|
| Selected goals | `primaryGoalId`, `learnerGoals` (today `[primaryGoal]`) | Goal step → `primaryGoal` option id |
| Current level | `currentLevelSelfReportId`, derived `currentLevel` (CEFR) | Level step → `currentLevelSelfReport` |
| Target path / level | `selectedPath`, `desiredLevel` | Path step → `targetPath` |
| Focus areas | `focusAreas` | Skills step → `focusSkills` |
| Routine | `studyRhythm`, `routinePreferences` | Rhythm step → `studyRhythm` + minutes from rhythm |
| Reason for learning | `learningReasonId` | Reason step → `learningReason` |
| Lifecycle | `onboardingComplete`, `onboardingCompletedAt`, `onboardingStep`, `onboardingData` | Flow + explicit completion |

Values are **option ids** from `onboardingOptions`, not labels. `preferences.personalization` mirrors the same ids for backward compatibility and legacy reads.

## Partial vs complete

- **`onboardingComplete`** is the only completion signal. It is **never** inferred from “some fields are filled”.
- While incomplete, the profile may already contain any subset of learner fields (incremental saves).
- **`onboardingCompletedAt`** is set only when completion runs with a full answer snapshot (or repair path sets completion without answers, preserving any prior timestamp).

## Incremental save

`persistOnboardingDraft(userId, step, data)` (debounced from `useOnboardingFlow`):

1. Merges `onboardingData` = `{ ...existing, ...patch }`.
2. Applies `mergeOnboardingAnswersIntoProfileDocument` → explicit top-level fields + merged `preferences`.
3. Sets `onboardingComplete: false` and writes via `setUserProfile`.

Interrupting the flow keeps all saved steps.

## Completion

`markLearnerProfileOnboardingComplete(userId, answers)` merges the final snapshot, sets `onboardingComplete: true`, `onboardingStep: 0`, `onboardingCompletedAt: now`, `isNewUser: false`, and syncs summary fields into the auth session store where applicable.

## Code map

- Types: `src/lib/storage/storageTypes.ts` (`UserProfileDocumentV1`, `RoutinePreferencesV1`)
- Mapper: `src/lib/profile/onboardingProfileMapper.ts`
- Merge: `src/lib/profile/profileUpdates.ts`
- Selectors: `src/lib/profile/profileSelectors.ts`, `readPersonalizationSnapshot` in `onboardingPersonalization.ts`
- Persistence entrypoints: `src/lib/bootstrap/bootstrapProfileLoader.ts`

## Analytics

- `onboarding_profile_updated` — each debounced incremental write (`partial: true`)
- `onboarding_answer_saved` — when durable signal fields change (`changed_fields`)
- `onboarding_resume_loaded` — bootstrap resume hydration
- `onboarding_completed` — unchanged (flow completion)

## Personalization consumers

Prefer `@/lib/profile` selectors (`getUserPrimaryGoal`, `getUserTargetPathId`, `getUserFocusAreaIds`, `getUserRoutinePreferences`, …) so reads work for legacy profiles (`onboardingData` / `preferences.personalization` fallbacks).

## Next step

See [onboarding-start-routing.md](./onboarding-start-routing.md) for profile-driven first routes and handoff. **Next product step:** implement plan gating across the app.

## Assumptions

- The v2 flow exposes a **single** primary goal id today; `learnerGoals` is populated as a one-element array for forward-compatible “selected goals” reads.
- Registry-supplied `currentLevel` / `desiredLevel` on first login may be overwritten once the learner submits self-report and pathway steps (learner intent wins).
- Older profiles may only have `preferences.personalization` or `onboardingData`; selectors merge explicit fields, then draft data, then personalization.
