# Auth, waitlist, onboarding & plan analytics (closed beta)

## Goals

- Validate invite-only login success vs friction (normalized failure reasons).
- Measure public → waitlist interest by surface (home, pricing, beta, login).
- Funnel onboarding by **stable `step_id`** and resume vs first-run.
- Compare **Basic vs Premium** on locks, completions, and post-onboarding routing.
- Keep payloads **structured and query-friendly**; avoid passwords and unnecessary PII.

## Principles

1. **Meaningful events** — Prefer funnel and decision events over noisy page spam.
2. **Stable names** — `snake_case` event names; do not rename without a migration note.
3. **Structured properties** — Use enums/categories (`failure_reason`, `user_plan`, `step_id`), not prose.
4. **Minimal sensitivity** — No passwords; no full free-text learner answers; email never in analytics payload.
5. **Centralized helpers** — `src/lib/analytics/authAnalytics.ts`, `waitlistAnalytics.ts`, `onboardingFunnelAnalytics.ts`, `planAnalytics.ts`, `betaFunnelAnalytics.ts` (+ shared types in `funnelAnalyticsTypes.ts`).
6. **Dispatch** — All events still flow through `emitAnalyticsEvent` (session envelope from `buildAnalyticsBaseContext`).

## Event taxonomy (high level)

| Prefix / area | Examples |
|---------------|----------|
| `login_*`, `session_*`, `plan_context_on_login` | Auth lifecycle |
| `waitlist_*`, `mailto_*`, `signup_disabled_*`, `beta_page_*` | Public / beta funnel |
| `onboarding_*`, `plan_context_on_onboarding_complete`, `plan_context_on_start_route` | Onboarding + personalization |
| `bootstrap_*`, `profile_*`, `progress_*`, `returning_user_*`, `first_login_*` | Post-auth bootstrap |
| `premium_*`, `basic_user_hit_lock` | Plan gating |

Legacy aliases: `waitlist_clicked` and `mailto_triggered` are still emitted alongside `waitlist_cta_clicked` and `waitlist_mailto_triggered` for backward compatibility.

## Auth events

| Event | When | Key properties |
|-------|------|----------------|
| `login_attempted` | Mock sign-in API called | `login_surface`, `auth_provider_type`, `has_existing_session` |
| `login_succeeded` | Session applied | `user_id`, `user_plan`, `plan` (duplicate), `login_surface`, `auth_provider_type`, `invited_user` |
| `login_failed` | Mock sign-in throws | `failure_reason` (normalized), `login_surface`, `auth_provider_type` |
| `plan_context_on_login` | After successful login | `user_plan`, `login_surface`, `beta_user` |
| `session_restored` | Valid persisted session | `user_id`, `user_plan`, `session_type: restored` |
| `sign_in_clicked` | Login form submit (pre-auth attempt) | `surface: login_form` |

### Normalized `failure_reason` (from mock `code`)

| Mock `code` | `failure_reason` |
|-------------|------------------|
| `not_found` | `unknown_email_not_invited` |
| `password_invalid` | `wrong_password` |
| `inactive` | `account_inactive` |
| `access_denied` | `beta_access_denied` |
| `signup_closed` | `signup_closed` |
| other | `unknown` |

## Waitlist & beta events

| Event | When | Key properties |
|-------|------|----------------|
| `waitlist_cta_viewed` | Waitlist anchor mounted | `source_surface`, `route`, `cta_variant`, `plan_context`, `signed_in_state` |
| `waitlist_cta_clicked` | User clicks waitlist CTA | Same + legacy `waitlist_clicked` with `surface` |
| `waitlist_mailto_triggered` | Same click (mailto) | Same + legacy `mailto_triggered` |
| `signup_disabled_clicked` | “Sign up coming soon” / explain link | `source_surface`, `surface` (duplicate), `route` |
| `beta_page_viewed` | Beta marketing page load | `route`, `source_surface` |
| `public_page_viewed`, `pricing_viewed`, `login_page_viewed` | Existing marketing trackers | As implemented |

## Onboarding events

Stable **`step_id`** values: `goal`, `current_level`, `target_path`, `focus_skills`, `study_rhythm`, `reason`, `summary` (also sent as `step_key` for older queries).

| Event | When | Key properties |
|-------|------|----------------|
| `onboarding_started` | Flow mounts | `step_index`, `total_steps`, `user_plan`, `onboarding_source` (`first_login` \| `resumed`) |
| `onboarding_resumed` | Started with `step_index > 0` | Same |
| `onboarding_step_viewed` | Step changes | `step_id`, `step_index`, `total_steps`, `route`, `user_plan`, `onboarding_source`, `has_previous_answers` |
| `onboarding_step_completed` | User advances | Above + `primary_goal`, `target_path` when relevant |
| `onboarding_completed` | Profile marked complete, navigation to app | Structured selections, `time_to_complete_ms`, `user_plan`, `entry_path`, `pathway_key`, etc. |
| `onboarding_abandoned` | Back to marketing from step 0, or `beforeunload` while incomplete | `abandon_reason`, `step_id`, `step_index`, `total_steps`, `user_plan`, `route` |
| `onboarding_start_route_resolved` | Destination chosen at end of onboarding | `pathway_key`, `route`, `route_destination`, `decision_trace`, paths/goals |
| `onboarding_start_path_selected` | Same moment (compat) | Same |
| `onboarding_start_route_entered` | Handoff banner shown on destination | `pathway_key`, `route`, `route_destination`, `recommended_path`, `user_plan` |
| `onboarding_personalized_route_entered` | Legacy alias | Same shape |
| `plan_context_on_onboarding_complete` | After onboarding completed | `user_plan`, `route_destination`, `recommended_path`, `selected_target_path` |
| `plan_context_on_start_route` | Route resolved and/or handoff shown | `phase`: `route_resolved` \| `handoff_banner_shown`, `user_plan`, `route_destination`, `recommended_path` |

**Funnel analysis:** Join `onboarding_step_viewed` by `step_id` / `step_index`; filter users without `onboarding_completed` to approximate drop-off. `onboarding_abandoned` supplements exits (tab close, exit to public).

## Plan & gating

| Event | Notes |
|-------|--------|
| `premium_feature_locked`, `basic_user_hit_lock` | Include `user_plan`, `beta_user` when signed in (via `trackPremiumFeatureLockedForBasicUser`). |
| `premium_feature_viewed` | Lock modal: includes `user_plan`, `beta_user`. |
| `plan_context_on_login` | Snapshot after login. |

## Bootstrap (session / profile)

`bootstrap_completed` now includes: `had_existing_profile`, `had_existing_progress`, `onboarding_complete`, `user_plan`, `user_state_type` (`new` \| `returning` \| `session_initialized`), plus existing `user_id`, `target`.

## Shared properties (when relevant)

- `route`, `source_surface` / `surface` / `login_surface`
- `user_plan` (`basic` \| `premium`)
- `auth_provider_type` (e.g. `mock_beta`)
- `step_id`, `step_index`, `total_steps`
- `onboarding_source`, `abandon_reason`, `phase`
- `beta_user`, `invited_user`, `session_type`
- `cta_variant`, `plan_context`, `signed_in_state` (waitlist)

## Privacy guardrails

- Never log passwords or raw credentials.
- Do not log email addresses in analytics properties.
- Prefer category IDs for goals/paths/rhythms over long free-text (full onboarding answers stay in profile storage, not analytics).
- `failure_reason` is normalized; raw mock codes are not duplicated on `login_failed` to avoid redundant dimensions.

## Example questions this model answers

1. **Invite login health:** `login_succeeded` / (`login_succeeded` + `login_failed`) by `failure_reason` and `login_surface`.
2. **Waitlist demand by surface:** Count `waitlist_cta_clicked` by `source_surface` and `route`.
3. **Onboarding drop-off:** Last `onboarding_step_viewed` before session end vs `onboarding_completed`; step completion rates via `onboarding_step_completed`.
4. **Time to complete:** `time_to_complete_ms` on `onboarding_completed`.
5. **Basic vs Premium locks:** `premium_feature_locked` / `basic_user_hit_lock` grouped by `user_plan` and `feature_key`.
6. **Routing quality:** `onboarding_start_route_resolved` vs `onboarding_start_route_entered` with `recommended_path` / `route_destination`.

## Recommended next step

Run a focused QA pass on the full **auth → bootstrap → onboarding → first app screen** journey, including Basic vs Premium mock users and waitlist CTAs from each public surface.
