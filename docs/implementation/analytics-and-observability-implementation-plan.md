# Analytics and Observability Implementation Plan

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

This document defines **instrumentation** and **production visibility** rollout: event taxonomy, where to capture (frontend vs backend), dashboards, alerts, and operational use of analytics and observability for the AI Language Coach.

---

## 2. Scope

- **In scope**: Product analytics (PostHog or equivalent); event taxonomy; error and performance monitoring (Sentry); logging; dashboards and alerts for launch.
- **Out of scope**: Data warehouse or BI schema; third-party analytics tools beyond chosen stack.

---

## 3. Assumptions

- PostHog (or agreed tool) for product analytics; EU host preferred.
- Sentry for errors and optional tracing; OpenTelemetry-compatible where useful.
- No PII in event properties or logs; user identified by id or anonymous_id.
- Consent: do not send analytics if user withdrew consent (check before send).

---

## 4. Event Taxonomy (Canonical Events)

| Event | Source | When | Key properties (no PII) |
|-------|--------|------|--------------------------|
| page_view | Frontend | Route change (key screens) | path, referrer |
| signup_started | Frontend | Sign up form shown or first field | — |
| signup_completed | Frontend/Backend | Account created | — |
| login_completed | Frontend | Login success | — |
| onboarding_step_completed | Frontend | Each step | step_name, step_order |
| onboarding_completed | Frontend | Final step | — |
| lesson_started | Frontend/Backend | Lesson opened | lesson_id, level |
| lesson_completed | Backend | Progress recorded | lesson_id, score, duration_sec |
| scenario_started | Frontend | Scenario session started | scenario_id |
| scenario_completed | Backend | Session ended | scenario_id, turn_count |
| voice_session_started | Frontend | Voice session started | — |
| voice_session_completed | Backend | Session ended | duration_sec |
| upsell_viewed | Frontend | Paywall or gate shown | trigger (cap_reached, feature_tap) |
| upsell_clicked | Frontend | CTA clicked | — |
| trial_started | Backend | Stripe subscription created (trial) | — |
| payment_success | Backend | First paid invoice | — |
| subscription_cancelled | Backend | Cancellation or churn | — |

Extend as needed; keep names and properties documented in one place (this doc or shared wiki). Reference: docs/final/integrations/analytics-event-tracking.md.

---

## 5. Where to Capture

| Event | Frontend | Backend |
|-------|----------|---------|
| page_view | ✓ | — |
| signup_started, signup_completed | ✓ | Optional: signup_completed also from API |
| login_completed | ✓ | — |
| onboarding_* | ✓ | — |
| lesson_started | ✓ or both | lesson_completed: Backend on progress POST |
| scenario_started | ✓ | scenario_completed: Backend on session end |
| voice_session_* | ✓ started | Backend completed |
| upsell_* | ✓ | — |
| trial_started, payment_success, subscription_cancelled | — | ✓ (webhook or service) |

Frontend: init SDK after consent (if required); identify user after login (merge anonymous to identified). Backend: send server-side for billing and completion events so they are reliable.

---

## 6. Instrumentation Rollout by Phase

| Phase | Analytics | Observability |
|-------|----------|---------------|
| A | PostHog project created; init in frontend; page_view and auth events (signup, login) | Sentry init frontend and backend; request_id in logs |
| B | onboarding_*, lesson_started, lesson_completed; identify user | Log lesson and progress; optional span for lesson load |
| C | scenario_*, voice_session_* | Span for LLM and speech calls; latency and errors |
| D | upsell_*, trial_started, payment_success; funnel dashboards | Alerts on error rate and latency; dashboard for key flows |
| E | Optional: experiment events; retention and engagement | Cost and performance dashboards |

---

## 7. Dashboards

| Dashboard | Purpose | Phase |
|-----------|---------|-------|
| **Funnel** | Signup → onboarding → first lesson → first scenario/voice → trial → payment | D |
| **Engagement** | DAU/WAU/MAU; lessons per user; sessions per user | D |
| **Errors** | Sentry: count by endpoint and type; trend | A (basic), D (launch) |
| **Latency** | P50/P95 by endpoint; LLM and speech latency | C, D |
| **Revenue** | Trials started; conversions; MRR (from Stripe or internal) | D |
| **Cost** | LLM and speech usage/cost (if tracked) | E |

Create in PostHog and Sentry (or chosen tools); link from runbook.

---

## 8. Alerts

| Alert | Condition | Action |
|-------|-----------|--------|
| Error rate | 5xx or Sentry errors above threshold (e.g. 5% or 10/min) | Notify on-call; runbook "High error rate" |
| Latency | P95 above threshold (e.g. 5s for conversation turn) | Notify; check provider status |
| Health check | /health or /ready failing | Notify; runbook "API down" |
| Stripe webhook | Webhook endpoint 5xx or timeout | Notify; check handler and Stripe dashboard |
| Payment success drop | Optional: conversion rate drop vs baseline | Notify product |

Configure in Sentry and/or monitoring tool; avoid alert fatigue (thresholds and grouping).

---

## 9. Logging

| Item | Implementation |
|------|----------------|
| **Format** | Structured JSON; request_id, timestamp, level, message |
| **No PII** | No email, name, or free text in logs; user_id and ids only |
| **Levels** | Error for 5xx and exceptions; Warn for 4xx and retries; Info for request summary |
| **Retention** | 30–90 days; then delete or archive |
| **Access** | Restrict to ops and engineering; audit access if required |

---

## 10. Dependencies

- **Integrations**: PostHog and Sentry setup (integrations-implementation-plan).
- **Frontend**: SDK init; event calls (frontend-implementation-plan).
- **Backend**: Server-side events; logging and Sentry (backend-implementation-plan).
- **Consent**: Check consent before sending analytics (security-privacy-and-compliance-plan).

---

## 11. Risks

- **PII in events**: Review all properties; no email or name in event payload.
- **Over-instrumentation**: Cost and noise; limit to taxonomy and key flows.
- **Consent bypass**: Always check consent flag before sending; default to no if unknown.

---

## 12. Readiness and Done Criteria

- **Phase A**: PostHog and Sentry in place; page_view and auth events; request_id in logs; errors in Sentry.
- **Phase D**: Full funnel and engagement dashboards; alerts on errors and latency; revenue and cost visible.
- **Phase E**: Retention and experiment events if needed; cost and performance reviewed.
