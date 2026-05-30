# Operational Architecture

## Document Info

| Attribute | Value |
|-----------|--------|
| Phase | 10 – Operational Architecture |
| Status | **Final** |
| Source | operational-architecture-v1.md; audit passed |

---

## 1. Purpose and Scope

This document defines **operational** requirements and architecture for the AI Dutch Coach platform: deployment, monitoring, alerting, incident response, security operations, and cost controls. It supports runbooks and day-two operations.

**In scope**: Deployment model (EU, units), logging and metrics (ARCH-004), alerting, incident classification, backup and DR, security (secrets, vulnerabilities), cost controls (AI/speech usage), retention and export jobs, escalation for content moderation (IS-017).

**Out of scope**: Detailed runbook steps (maintained separately); provider-specific console steps.

---

## 2. Deployment Model

- **Region**: EU only for application and data (ARCH-001, BNFR-001). Single region for launch (e.g. eu-west-1 or equivalent).
- **Units**: SPA (CDN), API/service (compute), PostgreSQL (managed), Redis (managed), optional workers (async jobs). See Architecture deployment view.
- **CI/CD**: Build and test on commit; deploy to staging then production. Secrets from vault or env; no secrets in code.
- **Scaling**: API stateless, horizontal; DB connection pooling; Redis for cache and queue. Auto-scale based on CPU or request rate within budget.

---

## 3. Logging and Metrics (ARCH-004)

### 3.1 Logging

- **Structured logs** (JSON): request_id, timestamp, level, service, message, error (no PII). **Retention**: 30–90 days; then rotate or delete. **Query**: Centralized (e.g. CloudWatch, Datadog, or self-hosted) for debugging and audit.

### 3.2 Metrics

- **Application**: Request count, latency (p50, p95, p99), error rate by endpoint and status. **Business**: Lesson completions, scenario/voice sessions, trial starts, conversions (BFR-013). **Infrastructure**: CPU, memory, DB connections, Redis hit rate.
- **Dashboards**: Service health; funnel (trial → payment); cost (AI/speech usage per user or per day).

### 3.3 Distributed Tracing

- **Trace ID** propagated across API and internal calls; span for external calls (LLM, speech, payment). Use for latency debugging. **Retention**: Short (e.g. 7 days); no PII in spans.

---

## 4. Alerting

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| **API down** | Health check failing | Critical | Page on-call; investigate |
| **Error rate spike** | 5xx or 4xx rate above threshold | High | Notify; investigate |
| **DB/Redis down** | Connection failure | Critical | Page; failover if configured |
| **External dependency** | LLM or speech timeout rate high | High | Notify; consider fallback or status page |
| **Payment webhook failure** | Webhook return 5xx or repeated failure | High | Notify; check provider status; retry |
| **Cost anomaly** | AI/speech cost per day above budget | Medium | Notify; review usage and caps |

- **On-call**: Defined in team; escalation path. **Status page**: Optional; inform users of major outage.

---

## 5. Incident Response

- **Classification**: Critical (service down or data breach), High (degraded or key feature broken), Medium (minor feature or performance), Low (cosmetic or planned). **Process**: Detect → Triage → Mitigate → Communicate (internal and optionally users) → Post-mortem for Critical/High. **Data breach**: Follow GDPR and internal security process; notify supervisory authority and affected users if required.

---

## 6. Backup and DR

- **PostgreSQL**: Automated daily backups; point-in-time recovery if supported. **Retention**: 30 days or per policy. **DR**: Restore in same region first; cross-region optional for later. **Redis**: Cache only; no backup of PII. **Object storage**: Versioning or lifecycle; recoverable.

---

## 7. Security Operations

- **Secrets**: API keys (LLM, speech, payment) in vault or env; rotate periodically. **Vulnerabilities**: Scan dependencies (e.g. npm audit, Snyk); patch on schedule. **Access**: Least privilege; audit log for sensitive access. **Content moderation**: Automated per IS-017; escalation path for flagged content (human review); document in Content policy.

---

## 8. Cost Controls

- **AI (LLM)**: Per-user or per-request limits (fair use); monitor spend per day; alert on anomaly. **Speech**: Same; cap per user per day if needed. **Infrastructure**: Right-size; scale down when possible. **Optimization**: Cache LLM responses where safe; use smaller models for simple tasks; see Backend and Feature docs for caps.

---

## 9. Data Operations

- **Retention jobs**: Scheduled jobs to purge or anonymize data per Data doc (audio, old sessions, etc.). **Export job**: On user request (BFR-008), job aggregates user data and delivers link or email; SLA e.g. 72 hours. **Deletion job**: On account deletion, cascade or anonymize per Data doc; confirm completion.

---

## 10. Assumptions and Dependencies

- **Assumptions**: Single region at launch; team has on-call and access to logging/metrics. **Dependencies**: Backend (endpoints to monitor), Data (retention, export), Integrations (external status), Architecture (deployment units).

---

## 11. Traceability

- ARCH-004: Logging, metrics, tracing. BNFR-001: EU deployment. BFR-008: Export and deletion jobs. IS-017: Moderation escalation path. Business: Cost per user (~$1–2); cost controls in §8.
