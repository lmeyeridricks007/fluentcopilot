# Backend Implementation Plan

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

This document provides an **execution-ready backend implementation plan**: service boundaries, API sequencing, auth/session setup, profile, lesson engine, AI orchestration, speech processing, progress, gamification, entitlement, notification, admin/content support, async jobs/workers, webhooks, observability, backend testing, and API versioning.

---

## 2. Scope

- **In scope**: All server-side API and service work from Phase A through E; order of implementation; dependencies on data and integrations.
- **Out of scope**: Frontend; detailed DDL (see data-and-content-implementation-plan); provider-specific integration code (see integrations-implementation-plan; backend consumes adapters).

---

## 3. Assumptions

- Node.js or Python (decision in open-decisions-log); plan is language-agnostic for sequencing.
- Single deployable API service (monolith or BFF) for Phase A–D; optional service split in Phase E.
- PostgreSQL and Redis available from Phase A (session store, cache, optional queues).
- All secrets and config via env; no credentials in code.

---

## 4. Service Boundaries

| Service / Module | Responsibility | Phase |
|------------------|----------------|-------|
| **Auth** | Signup, login, logout, session/JWT, refresh; optional OAuth | A |
| **Profile** | User profile, onboarding completion, consent, preferences | A, B |
| **Lesson Engine** | Lesson list, lesson by id, lesson content, progress recording | B |
| **Progress** | Completion events, scores, progress summary | B |
| **Gamification** | XP, streak, achievements; invoked on progress events | B |
| **AI / Scenario** | Scenario list, conversation start/turn/end; LLM adapter; moderation | C |
| **Speech** | Voice session, STT, TTS, pronunciation; speech adapter | C |
| **Entitlements** | Subscription state, trial, usage caps, gating checks | D |
| **Notifications** | Preferences, send email/push; templates | D |
| **Reflection** (optional) | Reflection entry, generated lesson (Phase E) | E |
| **Location** (optional) | Location context for prompts (Phase E) | E |

Services can be modules in one codebase or separate processes; client sees one API gateway or BFF.

---

## 5. API Sequencing

### Phase A

| Order | API / Area | Endpoints (conceptual) | Done criteria |
|-------|------------|------------------------|----------------|
| 1 | Health | GET /health, GET /ready | Return 200; ready checks DB/Redis if needed |
| 2 | Auth | POST /v1/auth/signup, POST /v1/auth/login, POST /v1/auth/logout | Signup creates user; login returns session/JWT; logout invalidates |
| 3 | Session middleware | All /v1/* (except auth, health) require auth | 401 when no valid session/token |
| 4 | Profile (minimal) | GET /v1/me or GET /v1/profile, PATCH /v1/profile | Return user and profile; update name, etc. |
| 5 | Consent (schema) | GET/PATCH /v1/consent or part of profile | Store consent flags; return in profile |

### Phase B

| Order | API / Area | Endpoints (conceptual) | Done criteria |
|-------|------------|------------------------|----------------|
| 6 | Onboarding | POST /v1/onboarding or PATCH profile + consent | Persist onboarding data; set onboarding_complete |
| 7 | Lessons | GET /v1/lessons (query: level, topic), GET /v1/lessons/:id | List and single lesson; filter by profile level |
| 8 | Progress | POST /v1/progress/lesson (start, complete, score) | Record completion; idempotent where appropriate |
| 9 | Gamification | GET /v1/gamification/summary (XP, streak) | Computed from progress; award on lesson complete |
| 10 | Home / Recommendations | GET /v1/home/recommendations | Next lesson or daily suggestion; uses progress and level |

### Phase C

| Order | API / Area | Endpoints (conceptual) | Done criteria |
|-------|------------|------------------------|----------------|
| 11 | Scenarios | GET /v1/scenarios, POST /v1/conversation/start, POST /v1/conversation/turn, POST /v1/conversation/end | List; start creates session; turn calls LLM + moderation; end closes |
| 12 | Voice | POST /v1/voice/start, POST /v1/voice/turn (audio or text), POST /v1/voice/end | Start session; turn: STT → LLM → TTS; store transcript |
| 13 | Pronunciation | POST /v1/pronunciation/analyze (audio) or part of voice/turn | Return score and tips; store result |
| 14 | Listening | GET /v1/listening/exercises, GET /v1/listening/:id, POST /v1/listening/:id/submit | List; get exercise (audio URL, questions); submit answers |
| 15 | Moderation | Internal: call moderation API on user input and LLM output | Block or replace unsafe content; log for review |

### Phase D

| Order | API / Area | Endpoints (conceptual) | Done criteria |
|-------|------------|------------------------|----------------|
| 16 | Entitlements | GET /v1/entitlements, GET /v1/entitlements/usage | Subscription status; usage (lessons today, scenarios this week) |
| 17 | Gating | Middleware or per-route: check entitlement for premium endpoints | 403 + reason when cap or subscription missing |
| 18 | Notifications | GET/PATCH /v1/notifications/settings, internal: send email/push | Preferences; send via Resend/SendGrid; optional push registration |
| 19 | Webhooks | POST /webhooks/stripe (or /v1/webhooks/stripe) | Verify signature; handle subscription events; idempotent; update entitlement |
| 20 | Rate limiting | Global and per-route (e.g. /voice/turn, /conversation/turn) | 429 with Retry-After; configurable limits |

### Phase E

| Order | API / Area | Endpoints (conceptual) | Done criteria |
|-------|------------|------------------------|----------------|
| 21 | Reflection | POST /v1/reflection/entries, GET /v1/reflection/entries, POST /v1/reflection/:id/generate-lesson | Store entry; generate lesson (LLM); return lesson |
| 22 | Location | Optional: POST /v1/location/context or client-only | If server needs location for prompts; privacy-safe |
| 23 | Exam / Content ops | GET /v1/exam/... (extended); admin or content APIs if needed | Exam modules; content CRUD if not CMS |

---

## 6. Auth / Session Setup

| Item | Implementation | Phase |
|------|----------------|-------|
| **Signup** | Validate email, password (policy); hash password (bcrypt/argon2); create user + profile; return session or JWT | A |
| **Login** | Verify credentials; create session (store in Redis) or issue JWT; set cookie or return token | A |
| **Session store** | Redis: session_id → user_id, expiry; extend on activity if needed | A |
| **Middleware** | Extract session/JWT; attach user_id (and optionally locale, entitlement) to request; 401 if missing/invalid | A |
| **Logout** | Invalidate session or token; clear cookie | A |
| **Refresh** | If JWT: refresh token flow; rotate refresh token | A or B |
| **OAuth** | Optional: Google/Apple; create or link user; same session flow | A or B |

---

## 7. Profile Service

| Item | Implementation |
|------|----------------|
| **Storage** | users table (id, email, password_hash, created_at); profiles (user_id, name, level, goals, onboarding_complete, ...); consent (user_id, purpose, granted_at) |
| **GET /v1/me or /v1/profile** | Return user + profile + consent; used by frontend for header and settings |
| **PATCH /v1/profile** | Update name, level, goals, preferences; validate |
| **Onboarding** | POST or PATCH that sets onboarding_complete; may create default consent records |
| **Consent** | PATCH /v1/consent with { purpose: boolean }; store per purpose (analytics, marketing, etc.) |

---

## 8. Lesson Engine

| Item | Implementation |
|------|----------------|
| **Data** | lessons table (id, external_id, level, topic, title, content_json, order); lesson_steps or content in JSON |
| **GET /v1/lessons** | Query by level, topic; paginate; filter by progress (e.g. not completed) if needed |
| **GET /v1/lessons/:id** | Return full lesson (metadata + content); 404 if not found |
| **Progress** | POST /v1/progress/lesson with lesson_id, event (started, completed), score; idempotent by (user, lesson, event) |
| **Recommendations** | Algorithm: next lesson by level, least recently done, or curriculum order; return 1–5 items |

---

## 9. AI Orchestration (Scenario) Service

| Item | Implementation |
|------|----------------|
| **Adapter** | Call LLM adapter (OpenAI/Anthropic) with system + user messages; handle timeout, retry, circuit breaker |
| **Moderation** | Before/after LLM: call moderation API; replace or block unsafe output; log |
| **Conversation state** | conversation_sessions (id, user_id, scenario_id, started_at, ended_at); conversation_turns (session_id, role, content, created_at) |
| **Start** | Create session; optional: inject scenario prompt into system message |
| **Turn** | Append user message; call LLM; append assistant message; persist; return assistant message (and optional TTS URL if voice) |
| **End** | Set ended_at; optional: compute summary or analytics event |
| **Rate limit** | Per user per day/week for free tier; enforce in Entitlements (Phase D) |

---

## 10. Speech Processing Service

| Item | Implementation |
|------|----------------|
| **Adapter** | Call speech adapter: STT (audio → text), TTS (text → audio URL or blob), Pronunciation (audio → score + tips) |
| **Voice session** | voice_sessions table; store transcript and audio URLs if needed for replay |
| **Flow** | Receive audio from client (upload or stream); STT → text; pass to LLM (same as scenario); TTS → audio URL; return text + URL |
| **Pronunciation** | Receive audio; call pronunciation API; store result; return score and tips |
| **Listening** | Store exercise metadata and audio URL; questions; submit stores answers and score |
| **Caching** | Cache TTS by (text, voice_id) to reduce cost and latency |
| **Timeouts** | Set timeouts for STT/TTS/LLM; return 503 and user message on failure |

---

## 11. Progress and Gamification

| Item | Implementation |
|------|----------------|
| **Progress** | progress_events or lesson_completions table; aggregate for "completed lessons", "last active" |
| **XP** | Award XP on lesson complete, scenario complete, etc.; configurable per activity; store in user or gamification table |
| **Streak** | Compute from progress events: consecutive days with at least one completion; store current_streak, longest_streak |
| **Achievements** | Optional: badges or milestones; Phase B minimal = XP + streak only |
| **GET /v1/gamification/summary** | Return XP, level (if derived), streak, optional achievements |

---

## 12. Entitlement Service

| Item | Implementation |
|------|----------------|
| **Source of truth** | subscriptions table (user_id, stripe_subscription_id, status, trial_end, current_period_end, ...); updated by Stripe webhook |
| **Usage** | usage table or counters: lessons_today, scenarios_this_week; reset by period; increment on use |
| **Check** | For premium endpoint: if free user and over cap → 403; if free user and under cap → allow and increment; if subscriber/trial → allow |
| **GET /v1/entitlements** | Return { plan, status, trial_end, caps } |
| **GET /v1/entitlements/usage** | Return current usage vs caps (for UI) |
| **Webhook** | On subscription created/updated/deleted: upsert subscriptions; on invoice paid: optional event for analytics |

---

## 13. Notification Service

| Item | Implementation |
|------|----------------|
| **Preferences** | notification_preferences (user_id, email_ok, push_ok, ...); PATCH /v1/notifications/settings |
| **Sending** | Use email provider (Resend/SendGrid); templates for verification, receipt, reminder |
| **Push** | Optional: store push subscription; send via provider (OneSignal, FCM, Web Push); Phase D |
| **Async** | Send via queue (e.g. Redis queue, Bull) to avoid blocking request; or sync for Phase D minimal |
| **Events** | Trigger from: signup (verification), payment (receipt), scheduled (reminder cron) |

---

## 14. Admin / Content Support

| Item | Phase | Notes |
|------|-------|--------|
| **Seed data** | B | Script or migration to insert lessons; no admin UI required for Phase B |
| **Content CRUD** | E | Optional: internal API or CMS for content team; or DB + script |
| **Moderation review** | D | Log flagged content; optional admin view to review; manual process acceptable |
| **User support** | D | Optional: lookup user by email/id for support; no full admin panel required for launch |

---

## 15. Async Jobs / Workers

| Job | When | Phase |
|-----|------|-------|
| **Email send** | After signup, after payment, scheduled reminder | D |
| **Usage reset** | Daily cron for daily caps; weekly for weekly caps | D |
| **Export/delete** | GDPR: run export or delete in background; notify when done | D |
| **TTS cache warming** | Optional: pre-generate common phrases | E |
| **Analytics flush** | Optional: batch events to analytics provider | D |

Use Redis queue or provider (e.g. Bull, Celery, SQS); at least one worker process or serverless function.

---

## 16. Webhooks

| Webhook | Verification | Idempotency | Events to handle |
|---------|--------------|-------------|-------------------|
| **Stripe** | Verify signature (Stripe-Signature); reject invalid | Store event id; skip if already processed | customer.subscription.created/updated/deleted, invoice.paid, checkout.session.completed |
| **Optional: others** | Per integration spec | Same pattern | — |

Always respond 200 quickly; process in background if needed; log and alert on repeated failures.

---

## 17. Observability

| Item | Implementation |
|------|----------------|
| **Logging** | Structured JSON; request_id on every request; no PII in logs |
| **Errors** | Sentry (or equivalent); attach request_id; 5xx and unhandled exceptions |
| **Metrics** | Latency per endpoint; error rate; optional: LLM/speech latency, cost |
| **Tracing** | OpenTelemetry or provider; span per request and per integration call |
| **Health** | /ready: DB and Redis connectivity; /health: liveness |

---

## 18. Backend Testing Plan

| Type | Scope |
|------|--------|
| **Unit** | Services, utils, validation; mock DB and adapters |
| **Integration** | API tests with test DB; auth, profile, lessons, progress, scenario (mock LLM), entitlement (mock Stripe) |
| **Contract** | OpenAPI or contract tests for critical endpoints; frontend/backend alignment |
| **Webhook** | Replay Stripe events; verify idempotency and state update |
| **Load** | Optional: critical paths (lesson load, conversation turn) for Phase D |

Run in CI; integration tests against test DB; no production data.

---

## 19. API Versioning Strategy

| Approach | Implementation |
|----------|----------------|
| **URL prefix** | /v1/ for all app APIs; /webhooks/ for webhooks (no version) |
| **Compatibility** | Non-breaking changes (new optional fields, new endpoints) without new version; breaking changes → /v2/ and deprecation period |
| **Deprecation** | Header or doc: "v1 deprecated after YYYY-MM"; client migration path |
| **Accept-Language** | All responses respect locale where applicable (e.g. error messages) |

---

## 20. Dependencies

- **Data**: Schema and migrations (data-and-content-implementation-plan).
- **Integrations**: Auth (own), LLM, Speech, Stripe, Email, Observability (integrations-implementation-plan); backend consumes adapters.
- **DevOps**: Env, secrets, deploy (devops-and-environment-plan).

---

## 21. Risks

- LLM or speech latency causes timeouts: set timeouts and retries; return 503 and fallback message.
- Webhook duplicate or out-of-order: idempotency by event id; handle subscription.updated after subscription.deleted if needed.
- Entitlement race: use DB transaction or atomic increment when checking and updating usage.

---

## 22. Readiness and Done Criteria

- **Phase A:** Auth and profile APIs work; health/ready; session middleware; no secrets in code.
- **Phase B:** Lesson engine, progress, gamification, recommendations; onboarding and home data.
- **Phase C:** Scenario and voice APIs; moderation; fallback behavior.
- **Phase D:** Entitlements, webhook, notifications, rate limiting, hardening.
- **Phase E:** Reflection, location (if server-side), exam extension, content ops support.
