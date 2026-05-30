# Observability / Monitoring — Integration Deep-Dive

**Integration**: Strategy (Sentry for errors; OpenTelemetry-compatible for tracing/logs).  
**Version**: 1  
**Status**: Implementation-grade

---

## 1. Purpose

Specify **observability** for the AI Dutch Coach: error tracking (Sentry), structured logging, optional distributed tracing, and integration health. Enables debugging, alerting, and operational readiness (ARCH-004).

---

## 2. Core Concept

- **Errors**: Exceptions and error responses captured and sent to Sentry (or similar); backend and frontend; with context (request_id, user_id hashed, env). **Logs**: Structured JSON logs (level, message, request_id, user_id, duration); stdout or log aggregation. **Tracing**: Optional spans for API and integration calls (OpenTelemetry); correlate with logs.
- **Source of truth**: Our app emits; Sentry/log backend stores and indexes. We do not store full PII in logs (redact/hash).

---

## 3. Why This Integration Exists

- **Reliability**: Detect and fix errors quickly; monitor integration health (Stripe, LLM, Redis). **Compliance**: Audit trail of failures and access (no PII in logs). **Performance**: Trace slow requests and dependency calls.

---

## 4. Business Capabilities Enabled

- **Error tracking**: Alerts on new/rising errors; stack traces and context. **Logs**: Search by request_id, user_id, endpoint. **Health**: Dashboard for API and dependency status; runbooks.

---

## 5. Scope

### 6. In Scope

- Sentry (or equivalent): captureException, captureMessage; set user (id hashed), tags (env, feature); release version. Backend and frontend SDK. **Logging**: Structured fields (request_id, user_id, duration, status); LOG_LEVEL; no PII in message. **Health endpoint**: GET /health (and optional /health/ready with Redis/DB check). **Optional**: OpenTelemetry tracer for HTTP and Redis/DB; export to collector or Sentry.
- Local dev: Sentry DSN optional (or use test project); logs to stdout; no external required.

### 7. Out of Scope

- Full APM (optional later). Custom dashboards (provider UI). Log retention and archival policy (org decision).

---

## 8. Triggering Flows / Usage Points

| Trigger | Flow |
|---------|------|
| Unhandled exception | Middleware/catch → Sentry.captureException(err) → return 500. |
| 4xx/5xx response | Log with status, request_id; 5xx also Sentry. |
| Request start/end | Log request_id, method, path, user_id (hashed), duration, status. |
| Integration call | Optional span start/end (Stripe, LLM, Redis); trace id in log. |
| Health check | GET /health → 200; GET /health/ready → 200 if Redis (and DB) reachable else 503. |

---

## 9. Inputs

- **Sentry**: Error object, optional context (user, tags, extra). **Log**: Level, message, key-value fields. **Health**: None.

---

## 10. Outputs

- **Sentry**: Event id (for reference). **Log**: Written to stdout or stream. **Health**: 200 or 503 body (optional JSON: { status, checks }).

---

## 11. Data Domains Involved

- **Request context**: request_id, user_id (hashed in log), path, method. **Errors**: Stack trace, message; no secrets. **Integration**: Name, latency, success/fail (in span or log).

---

## 12. Source of Truth Rules

- **Logs**: Append-only; we do not correct past logs. **Sentry**: We send; Sentry is source of truth for error aggregation. **Health**: Our process and dependencies are source of truth for /health/ready.

---

## 13. Authentication Model

- **Sentry**: DSN (public or private; backend keeps in env). Frontend DSN can be public (rate limits and filter by origin). **Log backend**: If shipping to external (e.g. Datadog), use API key in env. **Health**: No auth (internal or load balancer).

---

## 14. Authorization / Consent Model

- **Health**: Expose only to internal/load balancer; do not expose to internet if sensitive. **Logs**: Only ops and support; no user consent for operational logs (legitimate interest).

---

## 15. Configuration Model

| Key | Type | Description |
|-----|------|-------------|
| SENTRY_DSN | string | Backend and/or frontend DSN |
| SENTRY_ENVIRONMENT | string | development, staging, production |
| LOG_LEVEL | string | debug, info, warn, error |
| OTEL_EXPORTER_OTLP_ENDPOINT | string | Optional tracing endpoint |

---

## 16. Environment Strategy

| Env | Setup |
|-----|--------|
| **Local** | SENTRY_DSN empty or test project; LOG_LEVEL=debug; logs to stdout. No tracing required. |
| **Staging** | Sentry project (staging); same structure as prod. |
| **Production** | Sentry project (prod); LOG_LEVEL=info; optional tracing to same or separate backend. |

---

## 17. Data Flow Design

- **Error**: Catch → add request_id, user (id) → Sentry.captureException → respond 500. **Log**: Each request log one line at end (request_id, method, path, status, duration, user_id hash). **Health**: Sequential or parallel check Redis (PING); DB (SELECT 1); return 200 if all ok else 503.

---

## 18. Sync / Polling / Webhook Design

- **Sentry**: Fire-and-forget send; no polling. **Logs**: Stream to stdout; agent or platform collects. **Health**: Sync check on each GET.

---

## 19. Failure Handling

| Failure | Handling |
|---------|----------|
| Sentry unreachable | Do not block request; log to stdout. Optional: queue and retry. |
| Log backend down | Logs still go to stdout; ensure log aggregation has buffer. |
| Health check dependency down | Return 503; alert. |

---

## 20. Retry Strategy

- **Sentry**: SDK may retry; do not block. **Health**: No retry; single check.

---

## 21. Rate Limiting / Quota Considerations

- **Sentry**: Quota per project; sample if volume high (e.g. same error 100x → send 1). **Logs**: Volume and retention; avoid logging huge bodies.

---

## 22. Security / Compliance Requirements

- **No PII**: Do not log email, name, or token in plaintext. Hash or redact user_id in logs. **Secrets**: Never log STRIPE_SECRET, API keys, or passwords. **DSN**: Frontend DSN is public by design; restrict by origin in Sentry. **GDPR**: Minimize personal data in logs; retention policy.

---

## 23. Auditability / Logging Requirements

- **Audit**: Log auth failures (401), entitlement denials (403), and critical actions (e.g. subscription updated) with request_id and user_id (hashed). **Errors**: Always log with request_id for correlation.

---

## 24. Observability / Monitoring

- **Metrics**: Error rate (from Sentry or logs); request rate and latency (from logs or APM). **Alerts**: Error rate spike; health check failing; integration (Stripe, LLM) failure rate. **Dashboard**: Sentry issues; health status; optional Grafana on log metrics.

---

## 25. UI / UX Implications

- **User**: On 5xx show generic “Something went wrong”; do not expose stack trace. **Support**: Use request_id in support flow for lookup.

---

## 26. Admin / Operations Implications

- **Runbooks**: Link Sentry issue to runbook. **Health**: Load balancer uses /health/ready for traffic; /health for liveness.

---

## 27. API / Adapter Design

- **Sentry**: Init with DSN and env; middleware captureException; setUser({ id: hash(user_id) }). **Logger**: Structured logger (pino, winston) with request_id and redaction. **Health**: Route GET /health/ready that calls Redis.ping(), DB.query('SELECT 1').

---

## 28. Event / Async Flow Design

- **Sentry**: Async send. **Logs**: Sync write to stdout. **Health**: Sync.

---

## 29. Data Persistence Requirements

- **None in our DB**: Logs and errors go to Sentry and log backend. **Optional**: Store last health status in memory for /health (no persistence).

---

## 30. Local Development Setup

- **Sentry**: Omit DSN or use test DSN; errors still captured locally if DSN set. **Logs**: LOG_LEVEL=debug; view in terminal. **Health**: Redis and DB must be up for /health/ready to pass (or mock in tests).

---

## 31. Testing Requirements

- **Unit**: Logger redacts secrets; health returns 503 when Redis down (mock). **Integration**: Trigger 500 → assert Sentry received (or mock Sentry). **E2E**: Optional; health returns 200 when deps up.

---

## 32. Rollout / Feature Flag Strategy

- **Feature flag**: Optional “sentry_enabled” to disable in dev. **Release**: Set release version in Sentry for grouping.

---

## 33. Example Scenarios

**Error**: Request throws → middleware catches → Sentry.captureException(err), set tag request_id → return 500. **Log**: Request ends → log { level: 'info', request_id, method, path, status: 200, duration_ms, user_id: hash(u1) }. **Health**: GET /health/ready → Redis.ping() ok, DB ok → 200.

---

## 34. Edge Cases

- **Sentry rate limit**: Sample errors; do not drop all. **Log size**: Truncate large bodies; do not log full request body in production. **Health timeout**: Set timeout on Redis/DB check (e.g. 2s); 503 on timeout.

---

## 35. Recommended Technical Design

- **Backend**: Sentry SDK init at startup; global error handler; request_id middleware (generate or from header). **Logger**: Child logger per request with request_id; redact list for keys (password, token, authorization). **Health**: Separate route; minimal deps (Redis, DB); no auth.

---

## 36. Suggested Implementation Phasing

- **Phase 1**: Sentry (backend + frontend); structured logs with request_id; GET /health and /health/ready. **Phase 2**: OpenTelemetry spans for API and integrations; dashboard. **Phase 3**: Alerting rules and runbooks.

---

## 37. Summary

**Observability** is **strategy-based** (Sentry, OpenTelemetry-compatible). **Errors** to Sentry with context; **logs** structured with request_id and no PII. **Health** endpoint for liveness and readiness. **Local**: Sentry optional; logs to stdout. Security: no secrets or PII in logs. Required for production operations.
