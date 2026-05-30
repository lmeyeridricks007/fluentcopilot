# Onboarding & Profile — Deep-Dive Specification

## 1. Purpose

Onboarding & Profile collects and persists learner attributes (language, level, goals, context) and consent flags so the system can personalize content, recommend the first lesson, and gate optional features (microphone, location, etc.). This spec defines the full scope, data model, workflows, and integration points for FD-01.

## 2. Core Concept

- **Profile**: A structured set of attributes per user (native language, level, goals, occupation, family, etc.) used for personalization (BFR-005) and level-based content (IS-002).
- **Consent**: Per-user, per-type flags (microphone, location, notifications, photo, AI context) with explicit grant/withdraw; optional features depend on them (BFR-009).
- **Onboarding**: The guided flow after sign-up (or first launch) that collects profile and consent; supports partial save and resume.

## 3. Why This Feature Exists

- **Personalization**: Recommendations, scenario selection, and difficulty depend on profile (BFR-005, IS-002, IS-003).
- **Compliance**: Consent is required for optional data and features (BFR-009); withdrawal must be supported.
- **Activation**: A completed onboarding leads to a clear “first step” (recommended lesson) and entry to the main app.

## 4. User / Business Problems Solved

- Users provide context once and get relevant lessons and scenarios.
- Business gets structured data for analytics and product optimization.
- Legal/compliance: clear consent per purpose; user can withdraw anytime.

## 5. Scope

### 6. In Scope

- Multi-step onboarding flow: profile (language, country, time in NL, family, occupation, hobbies, routines), level & goals (current A0–C1, target A2/B1/B2, objective: exam/work/social), consent (microphone, location, notifications, photo, AI context).
- Partial save and resume; validation of required fields (level, target, at least one goal).
- Persistence of profile and consent; edit later from Settings.
- First (or next) lesson recommendation at end of onboarding (FD01-FR-004).
- Analytics: onboarding_started, onboarding_step_completed, onboarding_completed, consent_granted/withdrawn.

### 7. Out of Scope

- Actual sign-up/login (Authentication).
- Enforcement of entitlements (Entitlements).
- Content of recommended lesson (Lesson Engine / Personalization).
- Device permission prompts (e.g. OS microphone prompt); only consent *flags* in onboarding; actual permission requested when feature first used.

## 8. Main User Personas

- **New expat**: Sets native language, current level, target (e.g. B1 for work); may skip optional fields.
- **Integration candidate**: Goals include “integration exam”; target A2 or B1.
- **Privacy-conscious user**: Declines optional consents; can still use core lessons; voice/location features disabled or degraded.

## 9. Main User Journeys

| Journey | Steps |
|--------|--------|
| **First-time onboarding** | Post sign-up → Step 1: profile (required + optional) → Step 2: level & goals → Step 3: consent (each explained) → Save → Recommendation CTA → Home. |
| **Resume** | User returns mid-onboarding → Load last step and saved data → Continue from that step. |
| **Edit profile later** | Settings → Profile → Edit attributes → Save. |
| **Withdraw consent** | Settings → Privacy/Consent → Toggle off (e.g. location) → Save; features depending on it disabled. |

## 10. Triggering Events / Inputs

- **Start**: Redirect from Auth after first sign-up; or app open with `onboarding_completed = false`.
- **Step submit**: User taps Next/Skip on each step; backend validates and saves (partial or full).
- **Complete**: User completes last step (e.g. consent); backend marks onboarding complete and computes recommendation.
- **Edit**: User opens Settings → Profile or Consent; submits changes.

## 11. States / Lifecycle

- **Not started**: `onboarding_completed = false`; no or minimal profile.
- **In progress**: Partial profile and/or consent saved; `onboarding_completed = false`; resume at last step.
- **Completed**: `onboarding_completed = true`; profile and consent persisted; user can enter home and edit later.
- **Consent withdrawn**: Consent flag set to false; dependent features (e.g. location tips) disabled until re-granted.

No “locked” state; user can always edit profile and consent from Settings.

## 12. Business Rules

- **BR-2**: User level (A0–C1) drives content difficulty and recommendations.
- **BFR-005**: Profile used for personalization.
- **BFR-009**: Explicit consent for optional data; withdrawal allowed.
- **Minimum to complete**: Current level, target level, at least one goal (e.g. exam, work, social). Other profile fields optional.
- **Consent**: Each type independent; granting one does not grant others; UI must explain purpose of each.

## 13. Configuration Model

- **Onboarding steps**: Ordered list of steps (e.g. profile, level_goals, consent); each step has required/optional fields; product config or code.
- **Consent types**: Enum: microphone, location, notifications, photo, ai_context. Labels and descriptions from i18n.
- **Validation**: Required fields per step; email format if collected; level in [A0, A1, A2, B1, B2, C1]; target ≥ current (optional rule).
- **Feature flags**: Optional A/B test for showing/hiding optional steps.

## 14. Data Model

- **profiles** (or user_profile): `user_id` (PK/FK), `native_language`, `known_languages` (array), `country_of_origin`, `time_in_nl_months`, `family_status`, `age_group`, `occupation`, `industry`, `hobbies`, `daily_routines`, `current_level` (CEFR), `target_level`, `learning_goal` (exam/work/social or multi), `onboarding_completed` (boolean), `onboarding_step_index` (for resume), `created_at`, `updated_at`.
- **consents**: `user_id`, `consent_type` (microphone, location, notifications, photo, ai_context), `granted` (boolean), `granted_at`, `withdrawn_at` (nullable). Composite unique (user_id, consent_type). Or single row per user with columns per type.
- **Recommendation**: Computed at completion; not stored as “profile”; Personalization/Lesson Engine returns first lesson id.

## 15. Read Model / Projection Needs

- **Onboarding state**: Need `onboarding_completed` and `onboarding_step_index` for client to show onboarding vs home and resume step. Can be part of GET /me or GET /profile.
- **Consent for gating**: Other services (Voice, Location, Daily Reflection) need to check consent; GET /consent or included in GET /me.
- **Profile for recommendations**: Personalization and Lesson Engine read profile (level, goals, occupation, etc.) for recommendations and scenario selection; can be served from Profile service or shared DB.

## 16. APIs / Contracts

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| GET | `/v1/me` or `/v1/profile` | Current user + profile + onboarding state | — | 200 { user, profile, onboarding_completed, onboarding_step_index?, consents? } |
| PATCH | `/v1/profile` | Update profile attributes | Partial JSON (e.g. current_level, target_level, occupation) | 200 updated profile; 400 validation |
| POST | `/v1/onboarding` | Submit step or full onboarding | { step, payload } or { completed: true, ... } | 200 { saved, next_step?, recommendation? }; 400 validation |
| GET | `/v1/consent` | Get consent flags | — | 200 { microphone, location, ... } |
| PATCH | `/v1/consent` | Update consent (grant/withdraw) | { microphone: true, location: false, ... } | 200 updated consents; 400 invalid |

**Recommendation**: Returned by POST /onboarding when completed, or by GET /home/recommendations (Personalization); not necessarily from Profile service.

## 17. Events / Async Flows

- **onboarding_started**: When user lands on first step (analytics).
- **onboarding_step_completed**: Per step (analytics).
- **onboarding_completed**: When last step saved with valid required fields (analytics; may trigger welcome or first-lesson push).
- **consent_granted** / **consent_withdrawn**: Per type (analytics and optional audit). Downstream: features that depend on consent may subscribe to react (e.g. disable location tips).

## 18. UI / UX Design

- **Flow**: Linear steps with Next/Skip where allowed; Back to edit previous step; progress indicator (e.g. 1/3).
- **Profile step**: Form fields with labels and hints; required marked; optional skippable; validation inline.
- **Level & goals**: Level dropdown (A0–C1); target dropdown (A2/B1/B2); checkboxes or multi-select for objectives (integration exam, workplace, social).
- **Consent step**: One block per consent type; short explanation and “Allow” / “Skip” or toggle; link to privacy policy.
- **Resume**: If incomplete, show onboarding from last step with data pre-filled.
- **Post-complete**: “Get started” or “Start your first lesson” CTA; navigate to home or directly to recommended lesson.

## 19. Main Screens / Components

- **OnboardingLayout**: Wrapper with progress, step content, Next/Back.
- **ProfileStep**: Form (native language, country, time in NL, family, occupation, hobbies, routines).
- **LevelGoalsStep**: Level, target, goals (exam, work, social).
- **ConsentStep**: Per-type consent blocks with explanation and toggle/button.
- **Settings**: ProfileEditForm, ConsentSettings (same fields, edit anytime).

## 20. Permissions / Security Rules

- **Authenticated only**: All profile and consent endpoints require valid session; user can only read/update own profile and consents.
- **No cross-user access**: Filter by `user_id` from auth context.
- **PII**: Profile contains PII; store in EU (BNFR-001); no logging of full profile in plain text.

## 21. Notifications / Alerts / Side Effects

- **First recommendation**: Shown on screen at end of onboarding; optional push “Your first lesson is ready” (Notifications module).
- **Consent withdrawn**: In-app message optional (“Location tips are now disabled. You can re-enable in Settings.”). No alert required.

## 22. Integrations / Dependencies

- **Authentication**: Provides `user_id`; redirect to onboarding after sign-up.
- **Personalization / Lesson Engine**: Consumes profile for recommendations (FD01-FR-004); provides first lesson id at completion.
- **Entitlements**: Not directly; profile does not gate premium (entitlements do).
- **Voice, Location, Daily Reflection, Notifications**: Check consent before enabling; read from GET /consent or /me.

## 23. Edge Cases / Failure Cases

- **User closes mid-flow**: Last saved step and payload persisted; resume at that step (FD01-FR-003).
- **Validation error**: Required field missing or invalid (e.g. level) → 400 with field errors; do not advance.
- **Network error on save**: Retry; show “Couldn’t save. Try again.” Optional: hold in client and sync when back online.
- **Onboarding already completed**: If user hits onboarding URL again, redirect to home or show “Edit profile” in Settings.
- **Consent withdrawn while using feature**: Next use of that feature (e.g. voice) checks consent → 403 or in-app message; prompt to re-enable in Settings.

## 24. Non-Functional Requirements

- **Latency**: Onboarding save < 2s (NFR from FD-01). Profile/consent read < 500ms.
- **Data residency**: Profile and consent in EU (BNFR-001).
- **Availability**: Profile service same as API; needed for first-time and returning users.

## 25. Analytics / Auditability Requirements

- **Events**: onboarding_started, onboarding_step_completed (step index), onboarding_completed, consent_granted (type), consent_withdrawn (type). Include user_id (or anonymous id pre-login if any); no sensitive profile in event payload.
- **Audit**: Optional audit log for consent changes (who, when, type, granted/withdrawn) for compliance.

## 26. Testing Requirements

- Unit: Validation rules (required fields, level enum, consent types).
- Integration: POST onboarding step → 200 and DB updated; resume returns correct step; PATCH profile and consent; GET /me returns profile and consents.
- E2E: Complete onboarding flow; leave and resume; edit profile and consent from Settings.

## 27. Recommended Architecture

- **Profile service**: Owns profiles and consents tables; exposes GET/PATCH /profile, GET/PATCH /consent, POST /onboarding. Calls Personalization or Lesson Engine for recommendation when onboarding completed (or returns and client calls GET /home/recommendations).
- **Single source of truth**: Profile and consent in PostgreSQL (EU); no duplicate store.

## 28. Recommended Technical Design

- **Validation**: Schema (e.g. Zod/Joi) for request bodies; return 400 with `fields: { current_level: "Invalid value" }`.
- **Idempotency**: POST /onboarding with same step and payload can be idempotent (last write wins).
- **i18n**: All labels and consent explanations from locale; BCP 47 (IS-024).

## 29. Suggested Implementation Phasing

- **Phase 1**: Minimal onboarding (level, target, one goal); save and complete; redirect to home; first recommendation from Lesson Engine/Personalization.
- **Phase 2**: Full profile step (native language, country, family, occupation, etc.); consent step (microphone, location, notifications, photo, AI context); resume.
- **Phase 3**: Edit profile and consent in Settings; analytics events; optional A/B for step order.

## 30. Summary

Onboarding & Profile collects and stores user profile and consent. It supports partial save and resume, validates required fields (level, target, one goal), and at completion triggers a first-lesson recommendation. Consent is per-type and withdrawable; optional features depend on it. Profile drives personalization and level-based content across the app. Data resides in EU; APIs are authenticated and user-scoped. Implementation should ensure clear UX for consent and robust validation and resume behavior.
