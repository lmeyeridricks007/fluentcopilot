# Workstream Breakdown

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

This document breaks down implementation work into **workstreams** (Product/UX, Frontend, Backend, Data, Integrations, QA, DevOps, Security/Privacy, Content/Operations, Growth/Monetization), with objectives, key deliverables, prerequisites, work items, owner role suggestions, dependencies, risks, acceptance criteria, and rollout implications per stream and per phase.

---

## 2. Scope

- **In scope**: Definition of each workstream; phase-by-phase deliverables; ownership suggestions; dependencies between streams.
- **Out of scope**: Individual task assignment; sprint planning; exact dates.

---

## 3. Workstream Definitions

### 3.1 Product / UX

| Attribute | Detail |
|-----------|--------|
| **Objective** | Define and validate user flows, copy, and UX so that engineering builds the right thing; own prioritization and scope per phase. |
| **Key deliverables** | Specs lock; acceptance criteria per feature; onboarding and lesson UX; AI/voice UX; upsell and notification UX; design direction and design system input. |
| **Owner role** | Product Manager and/or UX Designer (can be same person in lean team). |
| **Dependencies** | Specs (Business, Feature, UI) from prior documentation; design system from Frontend stream for implementation. |
| **Risks** | Scope creep; late spec changes. Mitigation: Phase scope lock; change control. |

**Phase A:** Specs baselined; design system direction (tokens, typography, component list).  
**Phase B:** Onboarding and lesson flows; copy; acceptance criteria for lessons and progress.  
**Phase C:** Scenario and voice flows; fallback copy; pronunciation feedback UX.  
**Phase D:** Upsell and paywall UX; notification copy and timing; launch content list.  
**Phase E:** Reflection and location UX; exam prep UX; content ops process.

---

### 3.2 Frontend

| Attribute | Detail |
|-----------|--------|
| **Objective** | Deliver mobile-web-first React/Vite UI for all user-facing flows; design system; PWA and accessibility. |
| **Key deliverables** | App shell; routing; auth UI; onboarding; lesson UI (guided, flashcards, quizzes); scenario and voice UI; entitlement gates and upsell; notifications surface; analytics instrumentation. |
| **Owner role** | Frontend Engineer or Full-stack (FE focus). |
| **Dependencies** | Backend API contracts (auth, profile, lessons, scenario, voice, entitlements); design tokens and components; feature flags SDK. |
| **Risks** | API contract drift. Mitigation: Contract or OpenAPI; align before implementation. |

**Phase A:** App shell; routing; design tokens and base components; auth UI.  
**Phase B:** Onboarding; lesson list and run (guided, flashcards, quizzes); home; progress and gamification display.  
**Phase C:** Scenario (chat) UI; voice UI (mic, playback, transcript); listening UI; pronunciation feedback UI.  
**Phase D:** Entitlement gates; upsell modal; notification preferences; analytics events.  
**Phase E:** Reflection UI; location prompt UI; exam prep UI; performance and a11y polish.

See frontend-implementation-plan.md for screen-by-screen and detailed work items.

---

### 3.3 Backend

| Attribute | Detail |
|-----------|--------|
| **Objective** | Deliver APIs and services for auth, profile, lessons, progress, gamification, scenario, voice, entitlements, and notifications. |
| **Key deliverables** | Auth API; profile and onboarding API; lesson engine API; progress and gamification APIs; scenario and conversation API; voice and pronunciation API; entitlement service; webhook handlers (Stripe); notification send. |
| **Owner role** | Backend Engineer or Full-stack (BE focus). |
| **Dependencies** | Data model and migrations (Data stream); integration adapters (Integrations stream); env and secrets (DevOps). |
| **Risks** | Integration latency or failure. Mitigation: Adapters with retry and fallback; timeouts. |

**Phase A:** Auth API; user and profile schema; health/readiness.  
**Phase B:** Profile and onboarding API; lesson engine API; progress API; gamification logic.  
**Phase C:** LLM adapter and scenario API; speech adapter and voice API; pronunciation API; moderation.  
**Phase D:** Entitlement service; Stripe webhook handler; notification service; rate limiting and hardening.  
**Phase E:** Reflection API; location API; content ops support; scaling and tuning.

See backend-implementation-plan.md for service and API order.

---

### 3.4 Data

| Attribute | Detail |
|-----------|--------|
| **Objective** | Schema, migrations, seed data, and retention/deletion support for all features. |
| **Key deliverables** | Migrations (users, profiles, consent, lessons, progress, gamification, conversations, voice sessions, subscriptions, usage, reflections); seed data for dev and staging; retention and deletion jobs or flows. |
| **Owner role** | Backend or dedicated Data/Platform engineer. |
| **Dependencies** | Product and feature specs for entity model; Backend for migration consumption. |
| **Risks** | Migration ordering or rollback. Mitigation: Linear migrations; test rollback in staging. |

**Phase A:** users, profiles, consent; first migration and seed.  
**Phase B:** lessons, progress, gamification tables; lesson seed data.  
**Phase C:** conversation_sessions, conversation_turns, voice_sessions, pronunciation_results.  
**Phase D:** subscriptions, usage, notification preferences; webhook event idempotency table.  
**Phase E:** reflections; content versioning if CMS; retention and export/delete jobs.

See data-and-content-implementation-plan.md.

---

### 3.5 Integrations

| Attribute | Detail |
|-----------|--------|
| **Objective** | Provider setup, adapters, secrets, and go-live verification for identity, LLM, speech, payments, email, analytics, observability, feature flags, moderation. |
| **Key deliverables** | Auth (own + OAuth if used); LLM adapter (OpenAI, Anthropic); speech adapter (Azure, optional ElevenLabs); Stripe (products, webhook); Resend/SendGrid; PostHog; Sentry; feature flags; moderation (OpenAI or Azure). |
| **Owner role** | Backend or Full-stack; can be same as Backend stream in lean team. |
| **Dependencies** | Integration specs (docs/final/integrations); env and secrets (DevOps). |
| **Risks** | Provider outage or key rotation. Mitigation: Fallbacks; rotation runbook. |

**Phase A:** Auth provider (own); observability (Sentry); feature flags; secrets layout.  
**Phase B:** — (no new external in B).  
**Phase C:** LLM; speech (STT, TTS, pronunciation); moderation.  
**Phase D:** Stripe; email; analytics (funnel events); optional push.  
**Phase E:** — (optional: search, CMS when needed).

See integrations-implementation-plan.md.

---

### 3.6 QA

| Attribute | Detail |
|-----------|--------|
| **Objective** | Test strategy; automated and manual tests; release gates; regression and performance. |
| **Key deliverables** | Test plan; unit and integration tests (backend, frontend); E2E tests (critical paths); AI and speech validation approach; billing and entitlement tests; accessibility and security checks; release checklist and go/no-go. |
| **Owner role** | QA Engineer or shared (developer-led tests + QA sign-off). |
| **Dependencies** | Deployable staging env; API and UI stable enough to automate. |
| **Risks** | Late test coverage. Mitigation: Tests alongside features; Phase D hardening includes QA sign-off. |

**Phase A:** Test env; auth and health tests; smoke after deploy.  
**Phase B:** E2E onboarding and lesson flow; progress and gamification tests.  
**Phase C:** E2E scenario and voice (or manual with device); moderation and fallback tests.  
**Phase D:** Billing and entitlement E2E; GDPR export/delete test; security and accessibility pass; launch checklist.  
**Phase E:** Regression suite; performance and cost checks.

See qa-test-and-release-readiness-plan.md.

---

### 3.7 DevOps

| Attribute | Detail |
|-----------|--------|
| **Objective** | CI/CD; environments; secrets; deploy pipeline; production hardening; monitoring and alerting. |
| **Key deliverables** | Repo structure; CI (build, test, lint); CD to staging; production env and CD; secrets management; dashboards and alerts; runbook basics; rollback and hotfix process. |
| **Owner role** | DevOps or Backend with DevOps responsibility. |
| **Dependencies** | Cloud or host provider; integration secrets. |
| **Risks** | Production incident without runbook. Mitigation: Basic runbook in Phase D; post-launch plan. |

**Phase A:** Repo; CI; staging deploy; env and secrets strategy.  
**Phase B:** — (staging sufficient).  
**Phase C:** — (optional: prod-like staging).  
**Phase D:** Production env; production CD; monitoring and alerting; runbook; rollback.  
**Phase E:** Scale and cost tuning; optional multi-region.

See devops-and-environment-plan.md.

---

### 3.8 Security / Privacy

| Attribute | Detail |
|-----------|--------|
| **Objective** | GDPR, consent, retention, export/delete; secure auth and secrets; no PII in logs. |
| **Key deliverables** | Consent model and storage; export and delete flows; retention policy implementation; auth and session security; secrets audit; logging and PII policy. |
| **Owner role** | Backend or Security-minded engineer; can be shared. |
| **Dependencies** | Data model (consent, user); Backend APIs for export/delete. |
| **Risks** | Missed retention or deletion path. Mitigation: Checklist; test export/delete in Phase D. |

**Phase A:** Secrets and env; HTTPS; no secrets in code; consent table.  
**Phase B:** Profile and progress data handling; consent in onboarding.  
**Phase C:** Audio retention; moderation and safety.  
**Phase D:** Export and delete flows; consent withdraw; audit and runbook.  
**Phase E:** Review and document.

See security-privacy-and-compliance-plan.md.

---

### 3.9 Content / Operations

| Attribute | Detail |
|-----------|--------|
| **Objective** | Lesson and exam content; seed data; launch content set; moderation operations. |
| **Key deliverables** | Lesson metadata model and seed lessons; launch content set; moderation process (who reviews, how); content ops process for Phase E. |
| **Owner role** | Content lead or Product with content support. |
| **Dependencies** | Data model for lessons; Backend for content ingestion or CMS. |
| **Risks** | Content bottleneck. Mitigation: Minimal seed in B; expand in D; CMS in E if needed. |

**Phase A:** —  
**Phase B:** Seed lessons (5–10); metadata model.  
**Phase C:** —  
**Phase D:** Launch content set; moderation ops (runbook, roles).  
**Phase E:** Content ops process; optional CMS; exam content expansion.

See data-and-content-implementation-plan.md.

---

### 3.10 Growth / Monetization

| Attribute | Detail |
|-----------|--------|
| **Objective** | Subscription and trial flow; entitlement enforcement; upsell and funnel; referral and experiments (Phase E). |
| **Key deliverables** | Stripe setup and webhook; entitlement service; usage caps; upsell and paywall UI; funnel events; optional referral and experiment flags. |
| **Owner role** | Backend (entitlements, Stripe); Frontend (upsell UI); Product (funnel and pricing). |
| **Dependencies** | Stripe account; Integration spec for payments; Feature spec for caps and upsell. |
| **Risks** | Wrong entitlement or double charge. Mitigation: Idempotent webhook; tests; manual verification. |

**Phase A:** —  
**Phase B:** —  
**Phase C:** —  
**Phase D:** Stripe; entitlements; caps; upsell; funnel events.  
**Phase E:** Referral; experiment flags; pricing tests.

See monetization-and-entitlements-implementation-plan.md and growth-loops-and-launch-plan.md.

---

## 4. Cross-Stream Dependencies (Summary)

| From stream | To stream | Dependency |
|-------------|-----------|------------|
| Product/UX | Frontend, Backend | Acceptance criteria and scope |
| Backend | Frontend | API contracts |
| Data | Backend | Schema and migrations |
| Integrations | Backend | Adapters and keys |
| DevOps | All | Env, CI/CD, deploy |
| Security/Privacy | Backend, Data | Export/delete, retention |
| QA | All | Test env; sign-off per phase |
| Content | Data, Backend | Seed and content model |

---

## 5. Acceptance Criteria (Per Stream, Per Phase)

Acceptance for a phase is that **all** exit criteria for that phase (see delivery-phases.md) are met. Each stream contributes to those criteria. Stream-specific done criteria are in the respective implementation plans (frontend, backend, data, integrations, DevOps, security, QA).

---

## 6. Rollout Implications

- **Phase A:** No user rollout; internal/staging only.
- **Phase B:** Can be released to closed beta (no payments, no AI); optional.
- **Phase C:** Requires AI and speech providers; typically after B beta or internal validation.
- **Phase D:** First real launch (paying users); requires full launch checklist.
- **Phase E:** Post-launch; features can rollout with feature flags.
