# Staffing and Operating Model

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

This document defines **roles needed**, **minimum vs ideal team shape**, **collaboration model**, and **what can be parallelized vs sequential** so that the implementation plan can be executed with a lean or scaled team.

---

## 2. Scope

- **In scope**: Roles (Product/UX, Frontend, Backend, Data, QA, DevOps, Content, Growth); minimum and ideal team; ownership per phase; meetings and handoffs.
- **Out of scope**: Hiring process; salary; specific individuals.

---

## 3. Assumptions

- Project may start with a **lean team** (2–4 people); may grow to **ideal** (5–7) for Phase C–D.
- Some roles can be combined (e.g. one person does Backend + Integrations; one does Product + UX).
- No dedicated PM or full-time DevOps required for Phase A–B if devs own CI/CD and one person owns product decisions.
- QA can be developer-led with sign-off from one responsible person until dedicated QA joins.

---

## 4. Roles

| Role | Responsibility | Phase where critical |
|------|----------------|----------------------|
| **Product** | Scope, prioritization, acceptance criteria, launch decisions, stakeholder communication | All; especially B (scope lock), D (launch) |
| **UX / Design** | Flows, wireframes, copy, design system direction, accessibility | A (tokens, components), B (onboarding, lessons), C (voice/scenario), D (upsell) |
| **Frontend** | React/Vite app, UI implementation, analytics instrumentation, feature flags | A–E |
| **Backend** | API, services, auth, integrations (adapters), workers, webhooks | A–E |
| **Data** | Schema, migrations, seed data, retention/deletion, content model | A–B (foundation), C–D (conversations, billing) |
| **Integrations** | Provider setup, adapters, secrets, go-live verification | A (auth, observability), C (LLM, speech), D (Stripe, email) |
| **QA** | Test strategy, automation, manual testing, release sign-off | A (smoke), B (E2E), C (voice/AI), D (billing, launch) |
| **DevOps** | CI/CD, environments, secrets, deploy, monitoring, runbook | A (CI, staging), D (prod, alerting) |
| **Security/Privacy** | GDPR, consent, export/delete, secrets audit | A (baseline), D (export/delete, launch) |
| **Content** | Lesson and scenario content, seed data, launch content set, moderation process | B (seed), D (launch content) |
| **Growth/Monetization** | Pricing, funnel, experiments, launch channels | D (launch), E (referral) |

---

## 5. Minimum Viable Team Shape (Phase A–B)

| Count | Composition | Coverage |
|-------|-------------|----------|
| **2** | 1 full-stack + 1 product/UX | Full-stack does FE + BE + data + CI; product/UX does scope, design direction, copy; QA and DevOps are shared (dev-led tests, simple CI) |
| **3** | 1 frontend + 1 backend + 1 product/UX | Clear FE/BE split; product/UX owns scope and design; backend may own integrations and data; no dedicated QA/DevOps |
| **4** | 1 frontend + 1 backend + 1 product/UX + 1 QA or DevOps | Same as 3; fourth person covers QA (test plan, E2E, sign-off) or DevOps (CI/CD, staging, secrets) |

**Recommendation for Phase A–B:** At least 2 (full-stack + product) or 3 (FE + BE + product). Phase B benefits from either a dedicated frontend or backend so that lesson engine and lesson UI can progress in parallel.

---

## 6. Ideal Team Shape (Phase C–D)

| Count | Composition | Coverage |
|-------|-------------|----------|
| **5** | 1 product, 1 UX/design, 1 frontend, 1 backend, 1 QA or DevOps | Full coverage; one of QA or DevOps; backend may own integrations |
| **6** | + 1 QA or DevOps or content | Dedicated QA and DevOps; or content for launch set |
| **7** | + content + growth/monetization or second FE/BE | Launch content and funnel ownership; or parallel FE/BE for speed |

**Recommendation for Phase C–D:** 5–6: product, UX, frontend, backend, QA, DevOps (or backend covers DevOps). Content can be part-time or product-led until launch set is defined.

---

## 7. What Can Be Parallelized

| Stream A | Stream B | Condition |
|----------|----------|-----------|
| Design system (FE) | Data model + Auth (BE) | From start of Phase A |
| Lesson engine API (BE) | Lesson UI (FE) | Once API contract agreed |
| Scenario API (BE) | Voice API (BE) | Both need LLM/speech adapters; can split ownership |
| Scenario UI (FE) | Voice UI (FE) | Once respective APIs exist |
| Stripe + entitlements (BE) | Upsell UI (FE) | After entitlement API exists |
| Notifications (BE) | Analytics funnel (FE/BE) | No dependency |
| Hardening (DevOps) | GDPR flows (BE) | No dependency |

Critical path (sequential): Auth → Onboarding → Lesson engine → Lesson UI → Progress → LLM/Speech → Scenario/Voice UI → Stripe → Gating → Launch. Parallel work shortens calendar time when team has 2+ devs.

---

## 8. What Should Be Sequential

| First | Then | Reason |
|-------|------|--------|
| Auth | All authenticated features | No feature without identity |
| Data model (users, profiles) | Profile and onboarding API | Schema first |
| Lesson engine API | Lesson UI | Contract and data first |
| LLM adapter | Scenario API | Scenario depends on LLM |
| Speech adapter | Voice API | Voice depends on speech |
| Stripe webhook | Entitlement service | Entitlement reads from subscription state |
| Entitlement service | Gating and upsell UI | UI needs entitlement API |

---

## 9. Ownership Suggestions by Phase

| Phase | Primary owner (example) | Support |
|-------|-------------------------|--------|
| **A** | Backend (auth, env, API skeleton); Frontend (shell, design system, auth UI) | Product (scope); DevOps (CI if separate) |
| **B** | Backend (lesson engine, progress, gamification); Frontend (onboarding, lessons, home) | Data (migrations, seed); Content (lesson content); Product (acceptance) |
| **C** | Backend (LLM, speech adapters, scenario/voice API); Frontend (scenario UI, voice UI) | Integrations (provider setup); QA (voice/E2E) |
| **D** | Backend (Stripe, entitlements, notifications); Frontend (gating, upsell); DevOps (prod, monitoring) | Product (launch); QA (billing, GDPR); Content (launch set) |
| **E** | Product (prioritization); Frontend/Backend (reflection, location, exam) | Content (content ops); DevOps (scale/cost) |

Ownership is suggestion; adjust to actual team. One person should be "tech lead" or "delivery lead" to unblock and align.

---

## 10. Collaboration Model

| Ceremony | Purpose | Frequency |
|----------|---------|-----------|
| **Kick-off per phase** | Align on scope, exit criteria, ownership | Start of A, B, C, D, E |
| **Backlog refinement** | Break features into stories; estimate; order | Weekly or before sprint |
| **Stand-up** | Blockers; progress; dependencies | Daily or 3x/week |
| **Phase gate review** | Verify exit criteria; go/no-go for next phase | End of each phase |
| **Launch go/no-go** | Checklist; decision to launch | Once before launch |
| **Retro** | What went well; improvements | End of phase or sprint |

Document in team charter or wiki; keep lightweight for lean team.

---

## 11. Handoffs

| From | To | Handoff |
|------|-----|---------|
| Product/UX | Frontend/Backend | Acceptance criteria; design/copy; API contract agreement |
| Backend | Frontend | API contract (OpenAPI or doc); env example |
| Data | Backend | Migration files; seed script; schema doc |
| Integrations | Backend | Adapter interface; credentials in env |
| QA | All | Test plan; sign-off; bug list |
| DevOps | All | Env and deploy docs; runbook |

Reduce handoff by co-locating or pairing (e.g. FE+BE agree contract together).

---

## 12. What to Postpone Safely

| Item | Postpone to | Reason |
|------|-------------|--------|
| OAuth (Google/Apple) | Phase B or later | Email/password sufficient for Phase A |
| Advanced gamification (badges, levels) | Phase D or E | XP and streak enough for B |
| Push notifications | Phase D optional or E | Email sufficient for launch |
| Native app | Post-launch | Mobile web first |
| CMS | Phase E | DB + seed sufficient for B–D |
| Search | Phase E | Small catalog; filter enough |
| Referral program | Phase E | Share link enough for launch |
| Second language | Phase E | Dutch only for launch |

---

## 13. Where to Future-Proof Early

| Area | Why |
|------|-----|
| **API versioning** | Avoid breaking clients when changing contracts |
| **Adapter pattern (LLM, speech)** | Switch provider or add fallback without rewriting services |
| **Consent and entitlement model** | GDPR and billing are hard to retrofit |
| **Structured logging and request_id** | Debugging and tracing from Day 1 |
| **Feature flags** | Rollout and kill switch without deploy |
| **Locale and teaching_language in schema** | Multi-language later without big migration |

---

## 14. Dependencies

- **Delivery phases**: Scope per phase (delivery-phases.md).
- **Workstream breakdown**: Stream ownership (workstream-breakdown.md).
- **Dependency map**: Critical path and parallelization (dependency-map.md).

---

## 15. Risks

- **Too few people**: Critical path stretches; quality or scope cut. Mitigation: Strict phase scope; defer non-essential to next phase.
- **Single point of failure**: One person holds key knowledge. Mitigation: Document runbooks; pair on critical areas (auth, billing).
- **Role conflict**: Product vs eng on scope. Mitigation: Phase exit criteria and gate; product owns "what", eng owns "how" and estimates.
