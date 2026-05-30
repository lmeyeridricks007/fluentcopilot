# Profile state layer (stable learner profile)

## Purpose

The **learner profile layer** is the in-app source of truth for **stable, per-user** data: identity fields needed outside the auth envelope, **plan**, **onboarding completion**, **selected pathway**, and **preferences**. It is a memory mirror of the persisted `UserProfileDocumentV1` (user-scoped localStorage), hydrated after the session user is known.

It is **not** where mutable learning activity lives.

## Ownership

### The profile layer owns

- Durable copy of: `userId`, `displayName`, `email`, `plan`, `betaAccessAllowed`, `authProviderType`
- `onboardingComplete`, `onboardingCompletedAt`, onboarding draft data and derived signal fields
- `selectedPath` (canonical pathway id) plus onboarding-derived targets in `onboardingData`
- Goals, focus areas, routine / study rhythm, reason-for-learning ids
- `preferences` (structured `Record<string, unknown>`, e.g. personalization snapshots)
- Lifecycle: `isNewUser`, `firstLoginAt`, `createdAt`, `updatedAt`, `schemaVersion`

### The profile layer does not own

- Lesson completion, practice history, review queues, missions / XP / streaks
- Exam attempts, weak areas, readiness history
- Drafts and active session payloads (see drafts / progress domains)
- **Session** fields: `isAuthenticated`, session validity, `loginAt` as the live session clock (those stay in auth)

## Session vs profile

| Concern | Session / auth (`authStore`, mock sign-in) | Profile (`useLearnerProfileStore`, `UserProfileDocumentV1`) |
|--------|--------------------------------------------|---------------------------------------------------------------|
| Who is logged in | Yes | Mirrors `userId` + stable identity copy |
| Plan for gating | Seed from registry at login | **Preferred** effective plan once hydrated (`profile.plan` overrides session when set) |
| Onboarding complete flag | `hasCompletedOnboarding` (aligned from profile during bootstrap) | **Durable** `onboardingComplete` |
| Pathway | — | `selectedPath` + selectors |

Bootstrap order: session is valid → `beginLearnerProfileHydration(userId)` → load/create profile on disk → align onboarding + premium from **profile** → `finalizeLearnerProfileHydration(userId, doc)`.

On **logout**, `clearLearnerProfileStore()` runs so the next user never sees the previous user’s profile in memory.

## Files (implementation)

- `src/lib/profile/profileStore.ts` — Zustand store: `status`, `userId`, `document`, `error`
- `src/lib/profile/profileActions.ts` — persist, merge, finalize hydration, dev reset
- `src/lib/profile/useProfile.ts` — React hook for components
- `src/lib/profile/profileSelectors.ts` — `getCurrentPlan`, `getSelectedPathway`, `getUserGoals`, etc.
- `src/lib/profile/profileTypes.ts` — `SelectedPathwayId`, re-exports document types
- `src/lib/storage/storageTypes.ts` — canonical `UserProfileDocumentV1`

## Hydration and updates

- **Hydrate**: `runAccountBootstrap` calls `beginLearnerProfileHydration` then, after the profile document is final, `finalizeLearnerProfileHydration`.
- **Writes**: Use `persistLearnerProfileDocument` / `mergeLearnerProfilePatch` / onboarding helpers in `bootstrapProfileLoader` (they persist through `persistLearnerProfileDocument`). Disk is written first; the store updates when `store.userId === doc.userId`.
- **Merges**: `mergeLearnerProfilePatch` shallow-merges top-level fields and deep-merges `preferences`; always bumps `updatedAt`.

## Plan and entitlements

- `getCurrentPlan(profile, sessionPlan)` prefers non-empty `profile.plan`, else session plan.
- `useProductEntitlements` and `EntitlementProvider` use that effective plan for `canAccess` and caps.

## Pathway model

- **Canonical persisted field**: `selectedPath` (aligned with onboarding `TARGET_PATH_OPTIONS`: `a2` | `a2_mastery` | `exam_prep` | `b1`).
- **`getUserTargetPathId`**: lenient read (includes `onboardingData.targetPath` and nested personalization).
- **`getSelectedPathway`**: returns a typed `SelectedPathwayId` only when the resolved id is one of the known options.

## Analytics (profile-related)

Events include: `profile_loaded`, `profile_initialized`, `profile_updated`, `selected_pathway_updated`, `onboarding_completion_state_changed`, `plan_state_loaded` (see `src/lib/analytics.ts`).

## Consumer pattern

```tsx
import { useProfile } from '@/lib/profile'

const { profile, isProfileReady, isProfileLoading, effectivePlan, onboardingComplete, selectedPathway, updateProfile } =
  useProfile()
```

Prefer `isProfileReady` before trusting `profile` for routing that depends on durable onboarding/pathway. For plan gates, `useProductEntitlements` already falls back to session until the profile is ready.

## Next step

**Build the progress state layer** — isolate lesson completion, SRS, missions, and other mutable domains from this stable profile surface.
