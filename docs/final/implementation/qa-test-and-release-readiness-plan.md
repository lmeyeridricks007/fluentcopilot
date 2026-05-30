# QA, Test, and Release Readiness Plan

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

This document defines **unit, integration, and E2E strategy**, **speech and AI validation**, **browser permission testing**, **premium billing testing**, **localization and accessibility testing**, **performance smoke tests**, **security/tenant isolation/privacy checks**, **release gates**, and **go/no-go criteria**.

---

## 2. Scope

- **In scope**: Test pyramid; what to automate; when to run; release gates and go/no-go; ownership.
- **Out of scope**: Detailed test cases (living in repo or test management tool); load testing design (only strategy).

---

## 3. Assumptions

- Staging environment available from Phase A; production from Phase D.
- Test data: seed data and optional anonymized copy; no production data in test envs.
- QA can be shared or developer-led; sign-off required before phase gate and before launch.

---

## 4. Unit / Integration / E2E Strategy

| Level | Scope | When | Owner |
|-------|--------|------|--------|
| **Unit** | Utils, pure functions, hooks, services with mocks | Every PR; CI | Dev |
| **Integration (API)** | API tests with real DB and Redis; mock external (LLM, Stripe) | Every PR or main | Dev |
| **Integration (frontend)** | Component tests (Testing Library); mock API | Every PR | Dev |
| **E2E** | Critical paths: auth, onboarding, lesson, scenario, voice, payment | Main or nightly; or pre-release | QA or Dev |
| **Manual** | Exploratory; permissions; device/browser matrix; accessibility | Before phase gate and before launch | QA |

Target: unit and API integration on every PR; E2E on main or before release; manual for edge cases and a11y.

---

## 5. Speech and AI Validation Strategy

| Area | Approach |
|------|----------|
| **LLM** | Mock adapter in integration tests; sandbox in staging E2E; validate response shape and moderation (send known bad input; expect block or sanitize) |
| **Speech STT/TTS** | Mock in unit/integration; real Azure in staging E2E with short samples; validate latency and format (audio plays) |
| **Pronunciation** | Real or mock in staging; validate score and tips returned; no PII in response |
| **Fallback** | Inject failure (timeout, 503); assert user sees fallback message and can retry or use text |
| **Cost** | Do not run high-volume real LLM/speech in CI; only in staging with caps |

---

## 6. Browser Permission Testing

| Permission | Test |
|------------|------|
| **Microphone** | Manual: allow/deny; verify app shows prompt and fallback when denied; verify recording works when allowed |
| **Location** | Manual (Phase E): allow/deny; verify location prompt only when allowed |
| **Notifications** | Manual (Phase D): opt-in; verify push received (if implemented) |
| **Storage/cookies** | Verify session persists across refresh; logout clears |

Automate where possible (e.g. E2E with granted permissions); document manual matrix for deny and device-specific.

---

## 7. Premium Billing Testing

| Scenario | Test |
|----------|------|
| **Checkout** | E2E: start trial (Stripe test mode); return to app; verify entitlement updated |
| **Webhook** | Replay Stripe events (subscription created/updated/deleted); verify DB and entitlement |
| **Cap** | Free user: complete N lessons or scenarios; next request returns 403 and upsell; premium user: no cap |
| **Cancellation** | Cancel in Stripe portal; verify entitlement reverts after period end |
| **Idempotency** | Send same webhook twice; verify no double grant or duplicate record |

Use Stripe test clock or test cards; never use live cards in automated tests.

---

## 8. Localization Testing

| Phase | Scope |
|-------|--------|
| **B** | Dutch only; verify no hardcoded English in UI (use keys); verify Accept-Language or locale in API |
| **E** | If second language: verify all strings from i18n; RTL if applicable; date/number format |
| **Automation** | Optional: snapshot or visual regression for key screens per locale |

---

## 9. Accessibility Testing

| Item | Approach |
|------|----------|
| **Automated** | axe-core (or similar) in CI or E2E on key pages (login, home, lesson, settings) |
| **Manual** | Keyboard navigation; screen reader (e.g. VoiceOver, NVDA) on critical flows (onboarding, lesson, scenario) |
| **Criteria** | WCAG 2.1 AA (contrast, focus, labels, landmarks); document exceptions if any |
| **When** | Phase B for key flows; Phase D before launch |

Reference: industry-standards-best-practices.md (IS-*).

---

## 10. Performance Smoke Tests

| Item | Target |
|------|--------|
| **LCP** | < 2.5s on 4G-like throttling (key pages) |
| **API latency** | Health < 200ms; lesson load < 1s; conversation turn < 10s (LLM dependent) |
| **Bundle** | Frontend main bundle size; alert if significant increase |
| **DB** | No N+1 on lesson list and progress; index on user_id, lesson_id |

Run in staging before release; optional: run in CI with thresholds.

---

## 11. Security / Tenant Isolation / Privacy

| Check | Approach |
|-------|----------|
| **Auth** | Unauthenticated request to /v1/* returns 401; wrong token returns 401 |
| **Isolation** | User A cannot access User B's profile, progress, or conversations (API returns 403 or 404) |
| **Export/delete** | Request export → file contains only requester's data; request delete → requester's data gone; no access after delete |
| **Secrets** | No API keys or secrets in frontend bundle; grep or scanner in CI |
| **Injection** | Input validation and parameterized queries; no raw SQL with user input |

Include in integration tests and security checklist before launch.

---

## 12. Release Gates

| Gate | Criteria |
|------|----------|
| **Phase A exit** | Auth and health tests pass; deploy smoke pass; no secrets in repo |
| **Phase B exit** | Onboarding and lesson E2E pass; progress and gamification verified; a11y baseline |
| **Phase C exit** | Scenario and voice E2E (or manual) pass; moderation and fallback tested |
| **Phase D exit** | Billing and entitlement E2E pass; GDPR export/delete tested; security and a11y pass; launch checklist complete |
| **Production release** | All Phase D criteria; go/no-go meeting; rollback plan and runbook in place |

---

## 13. Go/No-Go Criteria

| Category | Go | No-Go |
|----------|-----|--------|
| **Functionality** | All P0/P1 bugs fixed; critical paths pass | P0 bug open; critical path broken |
| **Performance** | Latency and LCP within target | Degraded or timeout on critical path |
| **Security** | No critical/high vulnerabilities; isolation verified | Critical vuln; tenant leak |
| **Privacy** | Export/delete tested; consent respected | Export/delete broken; consent ignored |
| **Billing** | Checkout and webhook tested; entitlement correct | Payment or entitlement broken |
| **Operational** | Monitoring and alerting on; runbook and rollback tested | No monitoring; no runback tested |
| **Stakeholder** | Product and leadership sign-off | Blocking concern from stakeholder |

Document go/no-go checklist (see launch-checklist.md) and run meeting before launch.

---

## 14. Dependencies

- **Staging**: Deployable and stable for E2E and manual testing.
- **Test data**: Seed and optional anonymized data; Stripe test mode.
- **Backend/Frontend**: Feature complete for phase; API contract stable for E2E.

---

## 15. Risks

- **Flaky E2E**: Stabilize with retries, explicit waits, and stable selectors; quarantine flaky tests and fix.
- **Coverage gap**: Prioritize critical path and billing; document what is manual.
- **Late security review**: Include security and privacy in Phase D definition; not after launch.

---

## 16. Readiness and Done Criteria

- **Phase A**: Unit and API integration tests in CI; auth E2E or manual; deploy smoke.
- **Phase B**: Onboarding and lesson E2E; progress and gamification tests; a11y automated on key screens.
- **Phase C**: Scenario and voice tests (E2E or manual); moderation and fallback tests.
- **Phase D**: Billing and entitlement E2E; GDPR tests; security and a11y pass; go/no-go checklist and meeting.
- **Ongoing**: Regression suite; run before each release; add tests for new critical paths.
