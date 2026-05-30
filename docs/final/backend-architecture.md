# Backend Architecture

## Document Info

| Attribute | Value |
|-----------|--------|
| Phase | 7 – Backend Architecture |
| Status | **Final** |
| Source | backend-architecture-v1.md; audit passed |

---

## 1. Purpose and Scope

This document defines the **backend architecture** for the AI Dutch Coach API and services: API style, auth, core service responsibilities, deployment units, and high-level request flows. It enables engineers to implement and evolve the server side in line with Business, Architecture, and Feature docs.

**In scope**: API layer (REST/GraphQL), authentication and authorization, service boundaries (Profile, Lesson Engine, AI Conversation, Speech, Gamification, Notifications, Entitlements), key endpoints (conceptual), error handling, rate limiting, observability.

**Out of scope**: Detailed DDL (Data doc); external API contracts (Integrations doc); runbooks (Operations doc).

---

## 2. Architecture Alignment

- **Single API layer** (ARCH-002): One gateway or BFF that all clients call. Internal services can be modules or separate processes; client sees one entry point.
- **EU deployment** (ARCH-001, ARCH-003): API and services run in EU region; data in EU (Data doc).
- **Observability** (ARCH-004): Structured logging, metrics, distributed tracing (details in Operations).

---

## 3. API Layer

### 3.1 Style

- **REST** as primary; resource-oriented URLs. Optional **GraphQL** for flexible client queries (e.g. home dashboard) if needed later.
- **Versioning**: URL prefix `/v1/` or header; maintain backward compatibility for at least one version.
- **Format**: JSON request/response; UTF-8. BCP 47 for `Accept-Language` and locale (IS-024).

### 3.2 Responsibilities

- **Auth**: Validate session or JWT; attach user id to request context.
- **Authorization**: Per-route or per-resource; entitlements checked for premium endpoints (FD-12).
- **Validation**: Request body and query params; return 400 with clear errors.
- **Rate limiting**: Per user and per IP; stricter for expensive endpoints (e.g. /voice/turn, /conversation/turn).
- **Routing**: Forward to internal services or modules.

### 3.3 Error Handling

| HTTP | Use |
|------|-----|
| 400 | Validation error; invalid input |
| 401 | Unauthenticated; missing or invalid token |
| 403 | Forbidden; e.g. entitlement or consent missing |
| 404 | Resource not found |
| 429 | Rate limit exceeded |
| 500 | Server error; do not leak internals |
| 503 | Dependency unavailable (e.g. LLM, speech); retry-after if applicable |

- **Response body**: `{ "error": { "code": "...", "message": "..." } }`; validation errors can include `fields`. **Logging**: Log 5xx and 4xx with request id; no PII in logs.

---

## 4. Authentication and Authorization

### 4.1 Authentication

- **Session-based** (cookie, httpOnly, secure) or **JWT** (Bearer in Authorization header). Sign-up and login produce session or tokens; refresh token optional.
- **Storage**: Session store in Redis (EU); or stateless JWT with short expiry and refresh.
- **Logout**: Invalidate session or token; client clears storage.

### 4.2 Authorization

- **User context**: Every authenticated request has `user_id` (and optionally `locale`, `entitlement` from cache).
- **Entitlement checks**: For premium-only endpoints (e.g. POST /voice/start, POST /conversation/start), verify subscription or trial (Entitlements service). Return 403 if not entitled.
- **Consent checks**: For endpoints that need microphone or location data, verify consent flags (Profile or Consent store). Return 403 or 400 if consent missing.
- **Free-tier limits**: Entitlements or Lesson Engine returns usage (e.g. lessons today); API blocks and returns 403 with `reason: "free_cap_reached"` for client to show upsell.

---

## 5. Core Services and Key Endpoints (Conceptual)

| Service | Key responsibilities | Example endpoints (conceptual) |
|---------|----------------------|--------------------------------|
| **Profile** | User profile, onboarding, consent, preferences | GET/PATCH /v1/me, GET/PATCH /v1/profile, GET/PATCH /v1/consent, POST /v1/onboarding |
| **Lesson Engine** | Lessons, progress, recommendations, content | GET /v1/lessons, GET /v1/lessons/:id, POST /v1/progress/lesson, GET /v1/home/recommendations |
| **AI Conversation** | Scenarios, chat turns, moderation | GET /v1/scenarios, POST /v1/conversation/start, POST /v1/conversation/turn, POST /v1/conversation/end |
| **Speech** | Voice session, STT, TTS, pronunciation | POST /v1/voice/start, POST /v1/voice/turn (audio or text), POST /v1/voice/end, POST /v1/pronunciation/analyze |
| **Gamification** | XP, streaks, achievements | GET /v1/gamification/summary, (internal: award XP/streak on progress events) |
| **Notifications** | Preferences, push token, in-app | GET/PATCH /v1/notifications/settings, POST /v1/notifications/register-push |
| **Entitlements** | Subscription, trial, usage, gating | GET /v1/entitlements, GET /v1/entitlements/usage, (internal: check for premium endpoints) |

- **Payment**: Handled by payment provider; backend receives webhooks (Integrations doc) and updates Entitlements/Subscription state. **BFR-013**: Backend records trial_started, trial_ended, payment_success, churn for analytics.

---

## 6. Request Flows (High-Level)

### 6.1 Lesson Run

1. Client: GET /v1/lessons/:id (auth, entitlement for limit check).
2. API: Auth → Entitlements (usage) → Lesson Engine (content). Return 403 if free cap reached; else return lesson.
3. Client: POST /v1/progress/lesson (lesson id, answers, score).
4. API: Lesson Engine saves progress; notifies Gamification (XP, streak); return 200.

### 6.2 Scenario / Chat

1. Client: POST /v1/conversation/start (scenario_id). API: Entitlement + consent; create session; return session_id.
2. Client: POST /v1/conversation/turn (session_id, message). API: Moderation (IS-017); LLM; moderate response; persist; return AI message.
3. Client: POST /v1/conversation/end (session_id). API: Persist summary; trigger feedback generation; return summary. Gamification: award XP.

### 6.3 Voice

1. Client: POST /v1/voice/start (topic, level). API: Entitlement + microphone consent; create session; return session_id.
2. Client: POST /v1/voice/turn (session_id, audio_blob or text). API: STT if audio; LLM; TTS; persist; return audio URL or stream and transcript.
3. Client: POST /v1/voice/end (session_id). API: Optional pronunciation analysis (FD-06); persist; return summary. Gamification: award XP.

---

## 7. Internal Dependencies and Data

- **Profile** → PostgreSQL (users, profiles, consent).
- **Lesson Engine** → PostgreSQL (lessons, progress), Redis (cache), CDN (media URLs).
- **AI Conversation** → LLM API (Integrations), PostgreSQL (sessions, turns), moderation (internal or API).
- **Speech** → STT/TTS/Pronunciation APIs (Integrations), PostgreSQL (sessions), Redis (session state if needed).
- **Gamification** → PostgreSQL (events, XP, streaks, achievements); triggered by Lesson Engine / AI / Speech on completion.
- **Entitlements** → PostgreSQL (subscriptions, trials, usage counts), Redis (cache), Payment webhooks.

---

## 8. Non-Functional Requirements

| NFR | Target |
|-----|--------|
| **Availability** | 99.5% (excluding planned maintenance); Operations doc. |
| **Latency** | p95 < 2s for read endpoints; < 5s for conversation/voice turn (depends on LLM/speech). |
| **Rate limiting** | Per user: e.g. 100 req/min read, 20/min for conversation/voice; configurable. |
| **Security** | HTTPS only; no PII in logs; secrets in vault or env. |
| **Scalability** | Stateless API; horizontal scaling; async for heavy work (pronunciation, lesson generation). |

---

## 9. Assumptions and Dependencies

- **Assumptions**: Monolith or small set of services at launch (Architecture OQ-1); external AI and speech via APIs. **Dependencies**: Data doc (schemas), Integrations doc (LLM, speech, payment), Operations (logging, metrics, deployment).

---

## 10. Traceability

- BFR-002 (entitlement gating): Enforced in API and Entitlements. BFR-009 (consent): Checked for voice, location, reflection. BFR-011 (free caps): Enforced in Lesson Engine + Entitlements. BFR-013 (funnel events): Recorded in Entitlements and analytics. IS-017 (moderation): Applied in AI Conversation before returning AI output. ARCH-002, ARCH-004: Single API; observability.
