# Sub-feature: Achievements

**Feature**: See folder and `docs/features/deep-dives/feature-index.md`  
**Sub-feature**: achievements  
**Parent deep-dive**: `docs/features/deep-dives/gamification.md`  
**Domain reference**: FD-10  
**Status**: Scaffold v0.1 — expand to parity with `core-lessons/lesson-catalog.md`; run sub-feature review before marking final.

---

## 1. Purpose

Rule evaluation; unlock persistence; anti-farming constraints.

---

## 2. Core Concept

This module is one bounded capability within its parent feature. It owns a narrow slice of state transitions, APIs, or UI and composes with adjacent sub-features listed in the parent deep-dive. Boundaries: avoid duplicating responsibilities of sibling modules (see feature-index sub-feature table).

---

## 3. User Problems Solved

- Addresses the learner or operator need described in the Purpose.
- Reduces friction relative to an ad-hoc or monolithic implementation by exposing a clear contract (inputs/outputs).

---

## 4. Trigger Conditions

- Primary: user intent (navigation, form submit, or explicit action) as defined in parent workflows (`docs/final/user-workflows-journeys.md`).
- Secondary: system triggers (webhooks, cron, push receipt) where applicable—confirm in parent spec.

---

## 5. Inputs

- Authenticated context: `user_id`, session claims, optional `device_id`.
- Request payloads or query params per parent API section (to be detailed when BFF contracts are frozen).
- Configuration and feature flags from Admin / environment (see §9).

---

## 6. Outputs

- Success path: persisted entities, HTTP 200/201 with bodies per API doc, and emitted analytics/domain events (see §12).
- Failure path: 4xx validation, 402/403 entitlement, 429 rate limit, 5xx with safe client messaging (see §18).

---

## 7. Workflow / Lifecycle

1. Validate authn/authz and entitlements (FD-12) where required.
2. Validate input schema; apply idempotency keys for mutating operations that touch billing or usage.
3. Execute domain logic; persist; enqueue async work if needed.
4. Emit events and return response.
5. Client updates UI state or navigates per `docs/ui/` patterns.

---

## 8. Business Rules

- Align with `docs/final/business-requirements.md`, `docs/final/feature-domain-breakdown.md`, and IS-* security items referenced in the parent deep-dive.
- Respect tier gates: free vs trial vs premium; usage caps; consent flags (FD-01) for microphone, location, notifications, AI context.

---

## 9. Configuration Model

- Feature flags: `achievements` enablement, staged rollout percentage, kill switch.
- Environment: provider keys (webhooks, OAuth, push), webhook signing secrets, rate limits.
- Admin/CMS: copy and thresholds where operators tune behavior without deploy.

---

## 10. Data Model

- Map to tables in `docs/final/data/` and parent spec: primary keys, foreign keys to `users`, indexes for hot queries, retention class (PII, EU residency BNFR-001).
- This scaffold does not duplicate DDL—extract exact columns when implementing migrations.

---

## 11. API Endpoints

| Method | Endpoint | Notes |
|--------|----------|-------|
| TBD | TBD | Fill from `docs/final/backend-architecture.md` / OpenAPI when available |

Include example JSON request/response in the next revision (see §22).

---

## 12. Events Produced

- Analytics: `achievements_started`, `achievements_succeeded`, `achievements_failed` (names illustrative—align with analytics catalog).
- Domain (async): optional outbox events for downstream personalization (FD-14) or notifications (§15 feature).

---

## 13. Events Consumed

- Payment provider webhooks, content publish hooks, or activity pipelines—only those listed in parent spec; otherwise none.

---

## 14. Integrations

- External: OAuth, payments, push, speech, LLM, maps—per parent feature.
- Internal: Profile, Entitlements, Lesson engine, Moderation service—see architecture diagrams.

---

## 15. UI Components

- Compose from design system in `docs/ui/` and shared components; list concrete component names when screens exist in repo.

---

## 16. UI Screens

- Routes, entry points from Home/Learn/Settings; deep links; empty and loading states.

---

## 17. Permissions & Security

- RBAC / entitlement checks server-side; never trust client-only gating for premium.
- CSRF for cookie sessions; signed URLs for media; webhook signature verification; rate limiting on auth and send endpoints.

---

## 18. Error Handling

- Map provider errors to stable error codes; retry with backoff for idempotent reads; dead-letter queue for async failures; user-visible strings from i18n keys.

---

## 19. Edge Cases

- Concurrent updates, duplicate webhook delivery, clock skew on trial end, partial onboarding, offline mobile (if applicable), empty content catalogs.

---

## 20. Performance Considerations

- Pagination, caching hot reads, connection pooling, payload size limits, cold starts for LLM/speech, CDN for static assets.

---

## 21. Observability

- Structured logs with `request_id`, `user_id` hashed where needed; RED metrics; SLOs for p95 latency; alerts on error rate and queue depth.

---

## 22. Example Scenarios

**API**: Placeholder — add one happy path and one entitlement-denied JSON example.  
**DB**: Placeholder — one row example after schema lock.  
**UI**: Placeholder — 3-step user flow when designs are wired.

---

## 23. Implementation Notes

- Service ownership: align with bounded contexts in `docs/final/backend-architecture.md`.
- Migrations: forward-only; backfill jobs for historical data if needed.
- Rollout: feature flag → canary → full; monitor §21 metrics.

---

## 24. Testing Requirements

- Unit: pure domain logic and mappers.
- Integration: API + DB + provider sandboxes.
- Contract: consumer-driven tests for BFF/mobile.
- E2E: critical path from `docs/final/user-workflows-journeys.md`.
- Security: OWASP top risks for this surface (auth, injection, IDOR).

---

## Implementation implications

| Area | Detail |
|------|--------|
| **Backend services** | TBD — name service from architecture doc |
| **Database tables** | TBD — link to data model doc |
| **Jobs / workers** | TBD |
| **External APIs** | TBD |
| **Frontend components** | TBD |
| **Shared UI components** | TBD |
