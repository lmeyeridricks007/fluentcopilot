# Analytics / Event Tracking — Integration Deep-Dive

**Integration**: Strategy (PostHog or Amplitude; recommend PostHog for EU/privacy).  
**Version**: 1  
**Status**: Implementation-grade

---

## 1. Purpose

Specify **analytics and event tracking** for the AI Dutch Coach: funnel, engagement, conversion (BFR-013), experiments. Enables product and business decisions; EU-friendly and consent-aware.

---

## 2. Core Concept

- **Events**: Backend and frontend send events (e.g. lesson_started, lesson_completed, trial_started, payment_success) with user_id (or anonymous_id before login), properties, timestamp. **Identity**: Merge anonymous_id to user_id after login. **Source of truth**: Analytics provider stores events; we do not re-export full event stream (aggregates and cohorts only).

---

## 3. Why This Integration Exists

- **Conversion**: BFR-013 (trial_started, trial_ended, payment_success, churn) and funnel. **Engagement**: Lesson completion, scenario usage, retention. **Experiments**: A/B tests (with feature flags) and impact on conversion.

---

## 4. Business Capabilities Enabled

- **Funnel**: Signup → onboarding → first lesson → trial start → payment. **Cohorts**: Active users, at-risk (no login 7d). **Experiments**: Test paywall copy, onboarding flow.

---

## 5. Scope

### 6. In Scope

- Event API: identify(user_id, traits); track(event, properties); alias(anonymous_id, user_id) on login. Backend: BFR-013 and key actions (lesson_completed, scenario_completed). Frontend: page view, button clicks, flow steps (no PII in properties). Consent: respect “analytics” consent; do not send or mask if declined. EU: PostHog self-host or EU region; data processing agreement.
- Local dev: PostHog dev instance or mock (no-op or log); optional disable in dev.

### 7. Out of Scope

- Full session replay (optional later). Raw export to data warehouse (optional). Marketing pixels (separate consent).

---

## 8. Triggering Flows / Usage Points

| Trigger | Flow |
|---------|------|
| User signs up / logs in | Backend or frontend: alias(anonymous_id, user_id); identify(user_id, { email_domain, created_at }). |
| Lesson completed | Backend: track(lesson_completed, { lesson_id, score, duration_sec }) with user_id. |
| Trial started / Payment success | Backend: track(trial_started | payment_success, { plan, amount }) from webhook or API. |
| Frontend flow | track(onboarding_step, { step }); track(button_click, { name, screen }). |

---

## 9. Inputs

- **identify**: user_id, traits (optional). **track**: event name, properties (object). **alias**: anonymous_id, user_id.

---

## 10. Outputs

- **Provider**: 200/204 accepted. **Our side**: Fire-and-forget; do not block UI or API on analytics.

---

## 11. Data Domains Involved

- **Events**: lesson_completed, scenario_completed, trial_started, trial_ended, payment_success, payment_failed, subscription_canceled, onboarding_completed, screen_view. **User**: user_id, anonymous_id; no email in event properties (or hashed).

---

## 12. Source of Truth Rules

- **BFR-013**: Backend is source of truth for conversion events (from webhook/DB); send once per occurrence. **Identity**: Our user_id is canonical; alias on first login.

---

## 13. Authentication Model

- **Provider**: API key or write key (backend and frontend); stored in env (backend) and build-time (frontend). **Our API**: Events sent in context of authenticated request (user_id from session) or from job (webhook).

---

## 14. Authorization / Consent Model

- **Consent**: If user declines “analytics” or “marketing”, do not send or mask (e.g. send without user_id). Document in privacy policy. **GDPR**: Lawful basis (legitimate interest or consent); allow opt-out; data processing agreement with provider.

---

## 15. Configuration Model

| Key | Type | Description |
|-----|------|-------------|
| ANALYTICS_PROVIDER | string | posthog \| amplitude \| none |
| POSTHOG_API_KEY / AMPLITUDE_API_KEY | string | Write key |
| POSTHOG_HOST | string | Optional self-host URL (EU) |
| ANALYTICS_ENABLED | boolean | Disable in dev if true |

---

## 16. Environment Strategy

| Env | Setup |
|-----|--------|
| **Local** | ANALYTICS_ENABLED=false or mock; or PostHog dev project (no PII). |
| **Staging** | Separate project or same with env=staging. |
| **Production** | PostHog EU or self-host; production key; consent respected. |

---

## 17. Data Flow Design

- **Backend**: After action (lesson completed, webhook processed) → track(event, { ... }) with user_id; async (do not block response). **Frontend**: On login → alias(anonymous_id, user_id); on step → track(step); use batch/send once per page if possible. **Consent**: Check consent flag before send; or send with consent property and filter in provider.

---

## 18. Sync / Polling / Webhook Design

- **Outbound only**: We send events; no webhooks from analytics for MVP. **Async**: Fire-and-forget; queue optional for backend to avoid blocking.

---

## 19. Failure Handling

| Failure | Handling |
|---------|----------|
| Provider 4xx/5xx | Log; do not retry in request (or retry once). Optional: queue failed events for retry. |
| Network timeout | Do not block user; drop or queue. |
| Consent declined | Do not send; or send with user_id omitted. |

---

## 20. Retry Strategy

- **Backend**: Optional single retry on 5xx; or enqueue and job retries. **Frontend**: No retry (avoid duplicate); or queue in localStorage and flush on next load (optional).

---

## 21. Rate Limiting / Quota Considerations

- **Provider**: Event volume limits; batch if needed. **Our side**: Throttle high-frequency events (e.g. max 1 lesson_completed per lesson per user per day in backend; frontend debounce clicks).

---

## 22. Security / Compliance Requirements

- **No PII in properties**: Prefer lesson_id, plan_id; avoid email/name in event properties. **Consent**: Honor opt-out. **DPA**: With provider (PostHog/Amplitude). **Data residency**: EU if required (PostHog EU or self-host).

---

## 23. Auditability / Logging Requirements

- **Log**: Do not log full event body (may contain identifiers). Log send success/fail count (aggregate). **Audit**: Conversion events (BFR-013) also in our DB or data pipeline for audit.

---

## 24. Observability / Monitoring

- **Metrics**: Event send rate; failure rate. **Alerts**: Failure rate spike; provider down. **Dashboard**: Funnel and conversion in provider UI.

---

## 25. UI / UX Implications

- **None direct**: Analytics is invisible to user except consent banner. **Performance**: Do not block render on analytics; load script async.

---

## 26. Admin / Operations Implications

- **Cohorts**: Define in provider for targeting or analysis. **Experiments**: Run in provider or feature-flag provider; measure in analytics.

---

## 27. API / Adapter Design

- **Interface**: AnalyticsAdapter.identify(userId, traits); track(event, properties); alias(anonymousId, userId). **Implementations**: PostHogAdapter, AmplitudeAdapter, NoopAdapter (when disabled). **Backend**: Use adapter in services (lesson, webhook); inject user_id from context.

---

## 28. Event / Async Flow Design

- **Backend**: After DB write, call track in same process (async) or enqueue job. **Frontend**: track on user action; batch and send on interval or page unload.

---

## 29. Data Persistence Requirements

- **None in our DB**: Events in provider. **Optional**: Store BFR-013 in our DB for audit (e.g. conversion_events table); then also send to analytics.

---

## 30. Local Development Setup

- **Disable**: ANALYTICS_ENABLED=false; adapter no-op. **Or**: PostHog dev project; use test user_id; no real PII. **Mock**: Capture events in array for tests (assert event name and minimal properties).

---

## 31. Testing Requirements

- **Unit**: Mock adapter; assert track called with event and user_id. **Integration**: With mock or dev project: trigger lesson_completed → assert event received. **E2E**: Optional; consent on/off and assert no send when off.

---

## 32. Rollout / Feature Flag Strategy

- **Feature flag**: “analytics_enabled” per cohort or region. **Consent**: Show consent banner; persist choice; respect in adapter.

---

## 33. Example Scenarios

**Login**: Frontend alias(anon_123, user_456); identify(user_456, { created_at }). **Webhook**: Backend track(payment_success, { user_id, plan: 'monthly', amount: 9.99 }). **Lesson**: Backend track(lesson_completed, { user_id, lesson_id, score }).

---

## 34. Edge Cases

- **Duplicate events**: Idempotency by (event, user_id, idempotency_key) if provider supports; or accept duplicates and dedupe in analysis. **Anonymous to user**: Alias once on login; do not alias again. **Consent change**: Stop sending or mask from moment of opt-out.

---

## 35. Recommended Technical Design

- **Backend**: AnalyticsAdapter injected; track in lesson service and webhook handler; user_id from context. **Frontend**: Init SDK with write key; alias on login; track key steps; respect consent. **Consent**: Store in profile or cookie; adapter checks before send.

---

## 36. Suggested Implementation Phasing

- **Phase 1**: PostHog (or Amplitude); backend BFR-013 and lesson_completed; frontend identify and alias; consent check. **Phase 2**: Full event taxonomy; experiments. **Phase 3**: Self-host or EU region; advanced cohorts.

---

## 37. Summary

**Analytics** is **strategy-based** (PostHog recommended for EU). **Backend** sends conversion and key actions; **frontend** sends identity and flow events. **Consent** required; no PII in properties. **Local**: Disable or mock. Required for funnel and BFR-013; data residency and DPA for compliance.
