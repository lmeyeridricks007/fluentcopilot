# Analytics & Event Tracking Integration

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

Specifies **product analytics** and event tracking: onboarding funnel, lesson engagement, AI usage, premium conversion (BFR-013), retention, and experiments. Defines canonical event taxonomy, user identity model, anonymous→authenticated merge, and privacy-safe handling.

---

## 2. Why Needed

- Measure funnel (signup, onboarding, first lesson, trial start, payment). Optimize conversion and retention. Support A/B tests (feature flags). Privacy-safe and GDPR-aligned.

---

## 3. Decision Status

| Item | Status |
|------|--------|
| Analytics provider | **Required now** — PostHog (recommended, EU option) or Amplitude |
| Server-side events | **Required** (conversion, payment, entitlement) |
| Client-side events | **Required** (screen, lesson start/complete, clicks) |

---

## 4. Recommended Provider: PostHog

- **Rationale**: EU hosting option; self-hostable; product analytics + feature flags; good for anonymous→identified merge. Alternative: Amplitude (EU available).
- **Chosen**: PostHog (EU instance) for Phase 1.

---

## 5. Credentials

| Credential | Purpose | Where | Frontend-safe? |
|------------|---------|--------|----------------|
| `INTEGRATION_POSTHOG_API_KEY` | Ingest events | Frontend (build) + Backend | Yes (project API key, write-only) |
| `INTEGRATION_POSTHOG_HOST` | https://eu.posthog.com | Frontend | Yes |
| `INTEGRATION_POSTHOG_PERSONAL_API_KEY` | Server-side (optional) | Backend | No (if used for exports) |

PostHog project API key is designed for client exposure (write-only). Use same key for frontend and backend or separate keys if provider supports.

---

## 6. Canonical Event Taxonomy

| Event | When | Source | Properties (example) |
|-------|------|--------|----------------------|
| `signup_started` | User opens signup | Frontend | — |
| `signup_completed` | Account created | Backend | user_id (hashed or id) |
| `onboarding_started` | First onboarding step | Frontend | — |
| `onboarding_step_completed` | Step N done | Frontend | step_id |
| `onboarding_completed` | Onboarding done | Frontend | — |
| `lesson_started` | Lesson opened | Frontend | lesson_id, source |
| `lesson_completed` | Lesson submitted | Backend | lesson_id, score, duration_sec |
| `scenario_started` | Scenario opened | Frontend | scenario_id |
| `scenario_completed` | Scenario ended | Backend | scenario_id, turns |
| `voice_session_started` | Voice tutor started | Frontend | — |
| `voice_session_ended` | Voice ended | Backend | duration_sec |
| `trial_started` | Trial started | Backend | source, user_id |
| `trial_ended` | Trial ended (convert or lapse) | Backend | converted: bool, user_id |
| `payment_success` | Invoice paid | Backend | user_id, amount (optional) |
| `payment_failed` | Invoice failed | Backend | user_id |
| `subscription_canceled` | User canceled | Backend | user_id |
| `consent_updated` | Consent toggled | Backend | type, granted: bool |

**No PII in properties**: Avoid email, name in event props; use user_id or distinct_id. For location/audio: do not send raw location or audio; only “feature_used” or “prompt_shown” level.

---

## 7. User Identity Model

- **Anonymous**: Before login, use persistent anonymous id (e.g. PostHog distinct_id = UUID in localStorage). Send events with this id.
- **Identified**: After login, call `identify(distinct_id, { user_id: our_user_id })` so provider merges anonymous and identified. Use same distinct_id as before or new; provider merges by alias.
- **Merge strategy**: Set user_id as distinct_id after login; alias previous anonymous id to user_id so funnel is continuous (onboarding→first lesson→trial).

---

## 8. Frontend vs Backend

- **Frontend**: Screen views, lesson_started, scenario_started, onboarding steps, button clicks. Use PostHog SDK; init with API key and host. Identify after login.
- **Backend**: lesson_completed, scenario_completed, voice_session_ended, trial_started, trial_ended, payment_success, payment_failed, subscription_canceled. Use PostHog HTTP API or server SDK; include user_id (or distinct_id) in every event.

---

## 9. Privacy and GDPR

- **Lawful basis**: Legitimate interest (analytics) or consent per policy. Allow opt-out (e.g. Do Not Track or in-app setting); if opt-out, do not send client-side events; server-side events may still be needed for billing (minimal).
- **Data**: No PII in event properties; user_id is internal id. PostHog EU: data in EU. Retention: set in PostHog (e.g. 25 months). User deletion: delete or anonymize by user_id when user requests account deletion (BFR-008).

---

## 10. Testing

- Send test events in dev; verify in PostHog dashboard. Test identify and merge (anonymous → login). Verify no PII in payloads.
