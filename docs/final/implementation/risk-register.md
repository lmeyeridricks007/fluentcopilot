# Risk Register

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

This document captures **implementation and launch risks**: description, likelihood, impact, mitigation, owner, and status. It supports phase gates and go/no-go decisions.

---

## 2. Scope

- **In scope**: Technical, delivery, operational, and compliance risks that could affect build or launch.
- **Out of scope**: Business/market risks (e.g. demand); detailed mitigation plans (those are in respective plans).

---

## 3. Risk Summary Table

| ID | Risk | Likelihood | Impact | Phase | Mitigation | Owner |
|----|------|------------|--------|-------|------------|--------|
| R1 | Auth or env setup delays; blocks Phase B | M | H | A | Time-box Phase A; defer OAuth to B; strict exit criteria | Tech lead |
| R2 | Lesson engine or lesson content scope creep | M | M | B | Lock scope for B; move extras to backlog or Phase E | Product |
| R3 | LLM or speech provider outage or latency | M | H | C | Adapter with fallback (Anthropic, timeout); user fallback message; circuit breaker | Backend |
| R4 | Stripe webhook or entitlement bug; wrong access or double charge | L | H | D | Idempotent webhook; tests; manual verification before launch | Backend |
| R5 | Incomplete account deletion or export; GDPR breach | L | H | D | Checklist of all tables/buckets; test full flow in staging; audit | Backend/Security |
| R6 | Critical path slip (single bottleneck) | M | H | All | Identify critical path; avoid blocking on one person; parallelize where possible | Tech lead |
| R7 | Scope creep into Phase B/C (e.g. AI or payments early) | M | M | B, C | Strict phase scope; move to next phase or backlog | Product |
| R8 | Team size too small; delays or quality cut | M | M | All | Minimum team shape (2–3); defer non-essential; consider contract QA/DevOps | Product/Tech lead |
| R9 | Integration (LLM, Stripe) not ready when phase starts | L | M | C, D | Sandbox and env in Phase A; integration implementation order in plan | Integrations/Backend |
| R10 | Production incident with no runbook | M | M | D | Basic runbook in Phase D; post-launch stabilization plan | DevOps |
| R11 | PII in logs or analytics events | M | H | All | Redaction policy; audit; no PII in event properties | Backend/Frontend |
| R12 | Cost overrun (LLM, speech) | M | M | C, D | Per-user caps; caching; cost alerts; monitor daily spend | Backend/Product |
| R13 | Flaky E2E or late test coverage | M | M | B–D | Tests alongside features; stabilize E2E; quarantine flaky | QA/Dev |
| R14 | Design system or API contract drift | M | M | A, B | Lock tokens and contract early; Storybook; OpenAPI | Frontend/Backend |
| R15 | Launch without support owner or escalation | L | M | D | Designate owner; document escalation; FAQ | Product |

---

## 4. Risk Detail (Key Risks)

### R1: Auth or env setup delays

- **Mitigation**: Phase A time-box (e.g. 2–3 weeks); if not done, defer OAuth and non-essential (e.g. feature flags) to Phase B; do not start Phase B until auth and deploy work.
- **Trigger**: Phase A exceeds 4 weeks or auth still broken at gate.

### R3: LLM or speech provider outage or latency

- **Mitigation**: Timeouts (e.g. 15s LLM, 10s TTS); retry with backoff; circuit breaker; fallback to "Try again" or "Use text"; Anthropic as LLM fallback; monitor provider status.
- **Trigger**: Sentry alert on high 503 or timeout; user reports "stuck" or "slow".

### R4: Stripe webhook or entitlement bug

- **Mitigation**: Idempotency by event id; integration tests with replayed events; manual test: subscribe, cancel, check entitlement; staging test with test cards.
- **Trigger**: User reports wrong access or duplicate charge; webhook 5xx in Sentry.

### R5: Incomplete deletion or export

- **Mitigation**: Table and bucket checklist; script or job that performs full delete and export; run in staging; legal/privacy review of export scope.
- **Trigger**: User complaint or audit; test export/delete in staging fails.

### R6: Critical path slip

- **Mitigation**: Dependency map and milestones; single owner or pair for auth and lesson engine; daily or weekly check on critical path.
- **Trigger**: Milestone missed by more than 1 week; Phase gate delayed.

---

## 5. Risk Ownership

- **Tech lead / Backend**: R1, R3, R4, R6, R9, R11, R12.
- **Product**: R2, R7, R8, R15.
- **QA / Dev**: R13.
- **Frontend / Backend**: R14.
- **DevOps**: R10.
- **Security / Backend**: R5.

Owner = person or role responsible for mitigation and escalation.

---

## 6. Status and Review

| When | Action |
|------|--------|
| Phase kick-off | Review risks for that phase; confirm owner and mitigation |
| Phase gate | Re-assess likelihood and impact; add new risks if found |
| Before launch | Full risk review; go/no-go considers unresolved high-impact risks |
| Post-launch | Update status; close or downgrade risks that did not materialize |

Keep this register in docs/implementation/ and update as risks are retired or new ones appear.
