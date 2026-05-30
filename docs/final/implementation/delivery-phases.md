# Delivery Phases

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

This document defines each **delivery phase** (A–E) in depth: goals, included and excluded capabilities, dependency prerequisites, exit criteria, risks, and recommended order. It is the authority for what belongs in which phase and when a phase is complete.

---

## 2. Scope

- **In scope**: Phase A (Foundation), B (Core learner experience), C (AI and speech), D (Premium and growth), E (Expansion and optimization). For each: goals, capabilities, exclusions, prerequisites, exit criteria, risks.
- **Out of scope**: Sprint-level scheduling; resource allocation (see staffing doc).

---

## 3. Phase A: Foundation and Architecture Readiness

### 3.1 Goals

- Establish repo, environments, and CI/CD so that all subsequent work deploys to at least one non-local environment.
- Establish authentication so that all user-facing features are gated by identity.
- Establish data model and migrations so that profile, lessons, and progress have a schema.
- Establish design system foundation and app shell so that UI work has a consistent base.
- Establish observability and feature-flag baseline so that we can observe and control rollout.
- Establish secrets and config so that no credentials are in code and envs are reproducible.

### 3.2 Included Capabilities

| Area | Included |
|------|----------|
| **Repo** | Monorepo or app+api structure; branch strategy; .gitignore; README; env example |
| **Frontend** | React + Vite + TypeScript + Tailwind; app shell; routing (auth and app routes); design tokens (colors, typography, spacing); minimal component set (Button, Input, Card, Layout); auth UI (login, signup, logout) |
| **Backend** | API skeleton (REST); auth (session or JWT); user and profile tables; health and readiness endpoints |
| **Data** | PostgreSQL schema: users, profiles, consent; migrations; seed for dev (optional test user) |
| **Auth** | Email/password signup and login; session or JWT; optional OAuth (Google/Apple) as stretch |
| **Environments** | Dev, staging (and optionally test); env vars and secrets strategy; no prod yet |
| **CI/CD** | Build and test on commit; deploy to staging on main (or release branch); no prod pipeline yet |
| **Observability** | Logging (structured); request id; optional Sentry for errors; no dashboards yet |
| **Analytics** | Event taxonomy agreed; PostHog (or equivalent) project created; no events required yet |
| **Design system** | Tokens; base components; accessibility (focus, contrast); mobile-first viewport |
| **Feature flags** | Provider chosen; SDK in FE and BE; one flag (e.g. "show_voice_entry") evaluable |
| **Secrets** | All secrets in env or vault; .env.example; no secrets in repo |

### 3.3 Excluded Capabilities

- No lesson content or lesson engine.
- No AI, speech, or payments.
- No gamification, progress, or subscriptions.
- No production environment or production secrets.
- No full onboarding flow (only login/signup and optional profile stub).

### 3.4 Prerequisites

- Product and architecture specs baselined.
- Integration specs for identity and observability available.
- Design direction (tokens, typography) agreed.
- Repo and project board created.

### 3.5 Exit Criteria

| # | Criterion | How verified |
|---|-----------|--------------|
| A1 | User can sign up and log in (email/password) | E2E or manual test in staging |
| A2 | Authenticated request receives session/JWT and 200; unauthenticated receives 401 | API test |
| A3 | Staging deploy succeeds from CI on merge to main (or release branch) | CI/CD run |
| A4 | Design tokens and at least 3 base components exist and are used in auth screens | Code review + Storybook or app |
| A5 | At least one migration runs; users and profiles tables exist | DB check |
| A6 | Feature flag can be evaluated in FE and BE | Manual or unit test |
| A7 | No secrets in repo; .env.example documents required vars | Audit + checklist |
| A8 | Structured logs include request_id | Log sample |

### 3.6 Risks

- Auth or env setup takes longer than expected and blocks Phase B. Mitigation: Time-box Phase A; defer OAuth to Phase B if needed.
- Design system scope creep. Mitigation: Limit to tokens and base components only; expand in Phase B.

### 3.7 Recommended Order

Execute A in this order: (1) Repo + env + secrets, (2) Auth backend + Auth UI, (3) CI/CD + first deploy, (4) Data model + migrations, (5) Design system + app shell, (6) Observability + feature flags, (7) Gate review.

---

## 4. Phase B: Core Learner Experience

### 4.1 Goals

- User can complete onboarding (profile, level, goals, consent).
- User can browse and start lessons (guided lessons, flashcards, quizzes).
- User sees progress and basic gamification (XP, streak).
- Content is served from backend; lesson metadata and (minimal) seed content exist.

### 4.2 Included Capabilities

| Area | Included |
|------|----------|
| **Onboarding** | Multi-step flow (profile, level, goals, consent); persistence; redirect to home |
| **Profile** | Profile API (get, patch); profile and consent tables; level and goals |
| **Lesson engine** | Lesson list API (filter by level/topic); lesson by id; progress record (start, complete, score) |
| **Lessons** | Guided lesson UI (cards, steps); flashcards; quizzes; content rendering |
| **Progress** | Progress API; progress and gamification tables; completion and score |
| **Gamification** | XP and streak calculation; award on lesson complete; display on home |
| **Recommendations** | Simple recommendation (e.g. next lesson by level); home dashboard |
| **Content** | Lesson metadata model; seed lessons (at least 5–10); no CMS |
| **Mobile web** | Responsive; touch targets; viewport; bottom nav or equivalent |

### 4.3 Excluded Capabilities

- No AI scenarios, voice tutor, or pronunciation.
- No subscriptions, payments, or entitlement gating (everyone sees full lesson set).
- No daily reflection, location, or exam prep.
- No push notifications.
- No advanced recommendations (only simple next-lesson).

### 4.4 Prerequisites

- Phase A exit criteria met.
- Lesson metadata schema and seed data plan (see data-and-content-implementation-plan).

### 4.5 Exit Criteria

| # | Criterion | How verified |
|---|-----------|--------------|
| B1 | User can complete onboarding and land on home | E2E test |
| B2 | User can open a lesson, complete cards/quiz, and see result | E2E test |
| B3 | Progress is persisted and visible (e.g. on home or profile) | API + UI check |
| B4 | XP and streak update after lesson completion | API + UI check |
| B5 | At least 5 seed lessons available and browsable | Manual test |
| B6 | Lesson UI is responsive on phone viewport | Manual test |
| B7 | Consent choices persisted and reflected in profile/settings | Manual test |

### 4.6 Risks

- Lesson content scope creep. Mitigation: Seed with minimal set; expand in Phase D/E.
- Gamification complexity. Mitigation: Only XP and streak in Phase B; achievements in Phase D if needed.

### 4.7 Recommended Order

(1) Onboarding API + UI, (2) Lesson engine API + seed data, (3) Lesson UI (guided + flashcards + quiz), (4) Progress API + gamification, (5) Home and recommendations, (6) Gate review.

---

## 5. Phase C: AI and Speech Experience

### 5.1 Goals

- User can run an AI text scenario (e.g. café) and get AI responses.
- User can use voice tutor: speak, get STT → LLM → TTS, and see/hear response.
- User can do listening practice (audio + questions).
- User can get pronunciation feedback after speaking.
- Fallback and degraded behavior (e.g. "Voice unavailable; use text") are implemented.

### 5.2 Included Capabilities

| Area | Included |
|------|----------|
| **LLM** | LLM adapter (OpenAI primary, Anthropic fallback); prompt orchestration; moderation on output |
| **Scenario** | Scenario API (list, start, turn, end); conversation persistence; scenario UI (chat) |
| **Speech** | STT, TTS, pronunciation (Azure); adapter and error handling |
| **Voice tutor** | Voice session API; microphone capture; TTS playback; transcript; speed/replay |
| **Listening** | Listening exercise API and UI; audio playback; questions; no transcript during attempt |
| **Pronunciation** | Pronunciation API; display score and tips; optional replay |
| **Fallbacks** | Timeout and retry; circuit breaker; user-visible "Try again" or "Use text" |
| **Moderation** | AI output moderation; user input moderation for scenario |

### 5.3 Excluded Capabilities

- No subscription gating (voice and scenario available to all in Phase C for testing; gating in Phase D).
- No daily reflection or location.
- No advanced exam prep (only basic listening if part of listening practice).
- No streaming TTS/STT (upload/sync only is acceptable).

### 5.4 Prerequisites

- Phase B exit criteria met.
- LLM and Speech integration specs implemented (sandbox keys, adapters).
- Moderation pipeline in place for AI and user content.

### 5.5 Exit Criteria

| # | Criterion | How verified |
|---|-----------|--------------|
| C1 | User can start a scenario, send messages, receive AI replies, and end session | E2E test |
| C2 | User can start voice session, speak, receive TTS response, and end session | E2E test (or manual with device) |
| C3 | Listening exercise plays audio and accepts answers | E2E or manual test |
| C4 | Pronunciation feedback appears after voice turn or dedicated exercise | Manual test |
| C5 | Moderation blocks unsafe AI output (test with known bad prompt) | Test |
| C6 | Fallback message shown when LLM or speech fails | Test (e.g. mock failure) |
| C7 | No provider API keys in frontend | Audit |

### 5.6 Risks

- Speech latency or quality. Mitigation: Use EU region; set timeout and fallback; iterate on voice in Phase E.
- LLM cost. Mitigation: Per-user caps and model choice (e.g. mini) as in integration spec.

### 5.7 Recommended Order

(1) LLM adapter + scenario API, (2) Scenario UI, (3) Speech adapter (STT, TTS, pronunciation), (4) Voice UI and listening UI, (5) Fallbacks and moderation, (6) Gate review.

---

## 6. Phase D: Premium, Growth, and Readiness

### 6.1 Goals

- Paying user can subscribe (Stripe); trial and paid state are correct.
- Free user sees caps (e.g. lessons/day, scenarios/week) and upsell when limit reached.
- Entitlement is enforced server-side for premium features (voice, pronunciation, unlimited scenarios).
- Notifications (email and optional push) work for reminders and re-engagement.
- Analytics and funnel events are instrumented.
- Production hardening: monitoring, alerting, incident response, GDPR export/delete.
- Launch content set and moderation operations are ready.

### 6.2 Included Capabilities

| Area | Included |
|------|----------|
| **Payments** | Stripe products/prices; Checkout; webhooks; subscription and trial state in DB |
| **Entitlements** | Entitlement service; check on premium endpoints; usage tracking (lessons, scenarios) |
| **Upsell** | Entitlement gate UI; upsell modal when cap reached or premium feature tapped |
| **Notifications** | Email (Resend/SendGrid): verification, receipts, optional reactivation; optional Web Push |
| **Analytics** | Funnel events (trial_started, payment_success, etc.); event taxonomy implemented |
| **Hardening** | Production env; secrets in vault; HTTPS; rate limiting; error handling; logging |
| **Monitoring** | Dashboards (errors, latency, key flows); alerting on failure and latency |
| **GDPR** | Export and delete flows; consent withdrawable; retention as per Data doc |
| **Content** | Launch lesson set; moderation ops (who reviews flagged content); no CMS required |
| **Feature flags** | Rollout flags for premium, notifications; experiment flags if needed |

### 6.3 Excluded Capabilities

- No daily reflection or location-aware prompts (Phase E).
- No advanced exam prep modules (Phase E).
- No referral program or complex growth loops (Phase E).
- No native app.

### 6.4 Prerequisites

- Phase C exit criteria met.
- Stripe account and webhook endpoint; sandbox tested.
- Production environment and secrets strategy ready.
- Launch checklist available (see launch-checklist.md).

### 6.5 Exit Criteria

| # | Criterion | How verified |
|---|-----------|--------------|
| D1 | User can start trial and convert to paid (or revert); webhook updates entitlement | E2E in test mode |
| D2 | Free user hits lesson or scenario cap and sees upsell; premium user has no cap | E2E test |
| D3 | Email sends (verification, receipt, or reminder); no broken links | Manual test |
| D4 | Funnel events (trial_started, payment_success, etc.) appear in analytics | Analytics check |
| D5 | Production deploy succeeds; health and readiness pass | Deploy run |
| D6 | User can request data export and account deletion; data removed per policy | Manual test |
| D7 | Alerting fires on simulated failure (e.g. API down) | Test |
| D8 | Launch checklist completed | Checklist sign-off |
| D9 | Go/no-go decision documented | Stakeholder sign-off |

### 6.6 Risks

- Stripe webhook or entitlement bug causes wrong access. Mitigation: Idempotent webhook; entitlement tests; manual verification before launch.
- Production incident with no runbook. Mitigation: Basic runbook in Phase D; post-launch stabilization plan.

### 6.7 Recommended Order

(1) Stripe + entitlement service, (2) Entitlement gating and upsell UI, (3) Notifications, (4) Analytics instrumentation, (5) Production hardening and monitoring, (6) GDPR flows, (7) Launch content and moderation ops, (8) Launch checklist and go/no-go.

---

## 7. Phase E: Expansion and Optimization

### 7.1 Goals

- Daily reflection and location-aware prompts are available.
- Advanced exam prep (if not fully in D) and content operations are mature.
- Multi-language and multi-country readiness (schema, flags, content approach) are in place.
- Cost and performance are optimized; scale readiness documented.

### 7.2 Included Capabilities

| Area | Included |
|------|----------|
| **Reflection** | Reflection API (create entry, generate lesson); reflection UI; photo/location optional |
| **Location** | Location permission and phrase trigger (client or API); privacy-compliant |
| **Exam prep** | Extended exam modules (reading, listening, speaking, writing, KNM); practice and sim exam |
| **Content ops** | Process for adding/editing lessons; optional CMS pilot; localization workflow |
| **Multi-language** | Locale and teaching-language in schema and API; no second language launch required |
| **Cost** | LLM and speech usage review; caching and caps; cost alerts |
| **Performance** | Frontend and API performance review; DB and cache tuning |
| **Scale** | Read replicas or scaling doc; rate limits and quotas |

### 7.3 Excluded Capabilities

- No second teaching language launch (readiness only).
- No native app (readiness only).
- No enterprise or school SSO (future).

### 7.4 Prerequisites

- Phase D complete; product launched.
- Post-launch stabilization period (see post-launch-stabilization-plan) or parallel with early Phase E.

### 7.5 Exit Criteria

| # | Criterion | How verified |
|---|-----------|--------------|
| E1 | User can add reflection entry and receive generated lesson | E2E or manual test |
| E2 | Location prompt triggers when enabled and near venue (or on next open) | Manual test |
| E3 | Exam prep modules (at least 2 components) available and usable | Manual test |
| E4 | Content ops process documented and used at least once | Doc + run |
| E5 | Multi-language readiness (schema, flags) documented | Doc |
| E6 | Cost and performance report or dashboard exists | Review |

### 7.6 Risks

- Phase E scope expands and delays stabilization. Mitigation: Phase E is post-launch; prioritize stabilization and then expansion.

### 7.7 Recommended Order

(1) Daily reflection, (2) Location prompts, (3) Exam prep extension, (4) Content ops and optional CMS, (5) Multi-language readiness, (6) Cost and performance optimization.

---

## 8. Phase Dependency Summary

| Phase | Depends on | Blocks |
|-------|------------|--------|
| A | Specs; repo; design direction | B, C, D, E |
| B | A exit | C, D |
| C | B exit | D |
| D | C exit | E; Launch |
| E | D exit (and launch) | — |

No phase can start until its predecessor’s exit criteria are met. Parallel work within a phase is allowed where dependencies permit (see dependency-map.md).
