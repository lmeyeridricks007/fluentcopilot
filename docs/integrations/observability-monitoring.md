# Error Monitoring & Observability Integration

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

Specifies **error monitoring** (Sentry) and **observability** (tracing, integration health): frontend errors, backend tracing, integration health checks, speech latency, AI failure monitoring, and alerting patterns (ARCH-004).

---

## 2. Why Needed

- Detect and debug production errors; trace request flow across API and integrations; monitor integration health and latency; alert on degradation.

---

## 3. Decision Status

| Item | Status |
|------|--------|
| Error tracking | **Required now** — Sentry |
| Tracing | **Required now** — OpenTelemetry-compatible (Sentry or Datadog) |
| Metrics | Backend (existing or Sentry/Datadog) |

---

## 4. Recommended: Sentry + OpenTelemetry

- **Sentry**: Frontend and backend errors; performance (transaction); optional distributed tracing. DSN is public (by design).
- **Tracing**: Use Sentry’s tracing or OpenTelemetry SDK; export to Sentry or Datadog. Span per outbound integration call (LLM, Speech, Stripe, etc.).

---

## 5. Credentials

| Credential | Purpose | Where | Frontend-safe? |
|------------|---------|--------|----------------|
| `INTEGRATION_SENTRY_DSN` | Report errors and perf | Frontend (build) + Backend | Yes |
| `INTEGRATION_SENTRY_AUTH_TOKEN` | Backend (releases, source maps) | Backend/CI | No |

---

## 6. Frontend Responsibilities

- **Init**: Sentry.init({ dsn: VITE_SENTRY_DSN, environment, tracesSampleRate, replaysOnErrorSampleRate }). Do not send PII in tags; use user id (hashed) if needed for grouping.
- **Errors**: Uncaught errors and unhandled rejections captured automatically. Breadcrumbs for navigation and API calls (without sensitive data).
- **Performance**: Transaction for route change or key flow (e.g. lesson load). Spans for API calls (fetch).
- **Session replay**: Optional; privacy-sensitive (mask inputs and PII). Enable only with consent or disabled by default.

---

## 7. Backend Responsibilities

- **Errors**: Capture exceptions; set context (request_id, user_id if any). Do not attach PII to events.
- **Tracing**: Create span for each request; child spans for LLM call, Speech call, DB query. Propagate trace id to integration adapters; add span per external call. Record duration and status.
- **Integration health**: Metric or span tag: integration name, success/failure, duration. Alert if failure rate > threshold or latency p95 > SLA.
- **Speech/AI latency**: Custom metric or span: `integration_speech_duration_seconds`, `integration_llm_duration_seconds`. Dashboard and alert.

---

## 8. Alerting Patterns

- **Frontend error rate** > 5%: Alert. **Backend 5xx** rate > 1%: Alert. **Integration** (LLM, Speech, Stripe) failure rate > 5% or timeout rate spike: Alert. **Latency** p95 > 5 s for conversation turn: Alert.
- Use Sentry alerts or downstream (PagerDuty, Slack) via webhook.

---

## 9. Logging

- Structured logs (request_id, trace_id, integration, duration, success). No PII. Correlation: same request_id in log and Sentry event.

---

## 10. Testing

- Trigger test error in staging; verify in Sentry. Verify trace has spans for API and integration calls. Test source map upload (backend auth token).
