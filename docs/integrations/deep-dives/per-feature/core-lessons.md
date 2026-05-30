# Core Lessons — Per-Feature Integration Specification

**Feature**: FD-02 Core Lessons (Vocabulary, Grammar, Flashcards, Quizzes)  
**Source**: docs/final/feature-domain-breakdown.md §4; docs/features/deep-dives/core-lessons.md

---

## 1. Purpose

This document specifies **which integrations the Core Lessons feature uses** and **how**: media delivery (CDN/object storage), entitlement and cap enforcement (cache + entitlements service backed by payment), and analytics. It enables implementers to wire the lesson flow correctly and operate it in local, staging, and production.

---

## 2. Feature Reference

- **Domain**: FD-02 Core Lessons
- **User goal**: Learn vocabulary and grammar in short, level-appropriate lessons; reinforce with flashcards and quizzes.
- **Business goal**: CEFR-aligned micro-learning (IS-007, IS-008, IS-010); enforce free-tier caps (BFR-011, BR-8).
- **Integration dependencies** (from feature-domain-breakdown): CDN for media; optional CMS for content. Entitlement/cap enforced via Entitlements service (which uses Cache and Payment/Webhook).

---

## 3. Integrations Used (Summary)

| Integration | Role in Core Lessons | Criticality |
|-------------|----------------------|-------------|
| **Object storage / CDN** | Serve lesson media (images, audio for exercises); content tables store keys/paths; API or CDN returns URLs to client | High |
| **Cache / session store (Redis)** | Entitlement cache (tier, usage) for fast cap check before lesson start and after completion | High |
| **Entitlements (subscription/trial)** | Gate: free user at daily cap → block new lesson, show upsell; premium/trial → unlimited. Uses Payment + Webhook for state; Cache for read path | Critical |
| **Analytics** | lesson_started, lesson_completed, lesson_abandoned, quiz_passed/failed, free_cap_reached | High |

---

## 4. Per-Integration Detail

### 4.1 Object Storage / CDN

- **Why this feature needs it**: Lessons reference media (images, optional audio). Client needs a URL to load assets; we do not stream binary through our API.
- **Data flow**: Lesson payload from Lesson Engine includes `media_key` or `media_url`. If URL is relative, API or BFF resolves with CDN_BASE_URL; if private, backend generates signed URL (object-storage adapter) and returns in payload. Client GETs URL directly.
- **Triggering**: GET /v1/lessons/:id or GET /v1/lessons returns lesson list/detail with media URLs. No separate “get media” call if URLs are in response.
- **Auth**: Signed URLs (if private bucket) are short-lived; no extra auth on client. Backend uses storage credentials (env).
- **Failure**: If storage/CDN unavailable, media URLs may 404; client shows “Media unavailable” or placeholder. Lesson text still usable. Retry: backend does not retry URL generation per request; optional retry for GET from storage when building response.
- **Local**: MinIO or mock adapter; lesson fixtures use local or mock URLs. See [object-storage.md](../../object-storage.md) § Local Development Setup.
- **Observability**: Log media key resolution errors; metric for 404 rate from client (optional). See main deep-dive § Observability.
- **Reference**: [object-storage.md](../../object-storage.md)

### 4.2 Cache / Session Store (Redis)

- **Why this feature needs it**: Entitlement check (tier + usage) must be fast on every “start lesson” and “record completion”; Redis caches GET /entitlements result per user to avoid DB on every request.
- **Data flow**: Before allowing lesson start: backend reads entitlement from Redis (key entitlement:{user_id}); on miss, loads from DB (subscriptions + usage_counts), writes cache with TTL (e.g. 300s), returns tier and usage. After lesson completion: backend increments usage (DB or counter); invalidates entitlement cache for that user so next read is fresh.
- **Triggering**: Every GET /v1/lessons/:id (optional check) and POST /v1/progress/lesson (cap check before accept; then invalidate after write). Lesson list may also be filtered by entitlement (e.g. show “locked” for premium-only content).
- **Auth**: Session or JWT identifies user_id; cache key is per user. No integration-specific auth.
- **Failure**: If Redis down, fallback to DB for entitlement (slower); do not block lesson. See [cache-session-store.md](../../cache-session-store.md) § Failure Handling.
- **Local**: Redis in Docker or local; same as other features. See [cache-session-store.md](../../cache-session-store.md) § Local Development Setup.
- **Observability**: Cache hit rate for entitlement; latency of entitlement check. See main deep-dive.
- **Reference**: [cache-session-store.md](../../cache-session-store.md)

### 4.3 Entitlements & Subscription (Payment + Webhook + Cache)

- **Why this feature needs it**: Free users have a daily lesson cap (e.g. 3–5); premium/trial unlimited. Core Lessons must enforce cap and return clear state for upsell (free_cap_reached).
- **Data flow**: Entitlement service (backend) returns tier (free | trial | premium), usage (lessons_today, lessons_limit), subscription_ends_at, etc. Lesson Engine: before accepting POST /v1/progress/lesson (or before allowing “start lesson” if we check at start), verify usage < limit for free; if at cap, return 403 with code free_cap_reached and client shows upsell. After completion, increment usage_counts; invalidate entitlement cache.
- **Triggering**: On lesson start (optional) and on lesson completion (required: check cap before recording completion; increment and invalidate after).
- **Auth**: Authenticated user only; user_id from session/JWT. Entitlement data from our DB (subscriptions, usage_counts) and cache; no direct call to Payment API in lesson flow (payment state comes via webhooks).
- **Failure**: If Entitlements service or DB down, fail closed (do not allow lesson completion) or return 503. Cache miss: load from DB. See [payment-provider.md](../../payment-provider.md) and [entitlements-subscription.md](./entitlements-subscription.md).
- **Local**: Stripe test mode + webhook CLI for subscription state; Redis for cache; seed subscription and usage for test users. See [payment-provider.md](../../payment-provider.md) § Local Development Setup.
- **Observability**: Entitlement check latency; 403 free_cap_reached count; cache invalidation on completion. See [payment-provider.md](../../payment-provider.md) and sub-feature [entitlement-enforcement.md](../../sub-features/payment-provider/entitlement-enforcement.md).
- **Reference**: [payment-provider.md](../../payment-provider.md), [entitlements-subscription.md](./entitlements-subscription.md), [sub-features/payment-provider/entitlement-enforcement.md](../../sub-features/payment-provider/entitlement-enforcement.md)

### 4.4 Analytics

- **Why this feature needs it**: Funnel and engagement (lesson_started, lesson_completed, lesson_abandoned, quiz_passed/failed, free_cap_reached) for product and BFR-013–related funnel.
- **Data flow**: Backend (or frontend) sends events with user_id and properties (lesson_id, score, duration_sec, etc.) to analytics provider. Fire-and-forget; do not block lesson flow.
- **Triggering**: lesson_started (when user opens lesson); lesson_completed (on POST /v1/progress/lesson success); lesson_abandoned (optional: timeout or exit without complete); quiz_passed/failed (on quiz submit); free_cap_reached (when 403 returned).
- **Auth**: Backend events use user_id from context; frontend may use same after login. See [analytics-provider.md](../../analytics-provider.md).
- **Failure**: Analytics failure must not block lesson; log and optionally retry in background. See main deep-dive § Failure Handling.
- **Local**: Mock or disable analytics; optional capture for tests. See [analytics-provider.md](../../analytics-provider.md) § Local Development Setup.
- **Observability**: Event send rate; failure rate. See main deep-dive.
- **Reference**: [analytics-provider.md](../../analytics-provider.md)

---

## 5. Implementation Implications

- **Backend services**: Lesson Engine (content, progress); Entitlements service (tier, usage, cap check); optional MediaResolver (CDN/signed URL). All depend on Cache and (for entitlement) subscriptions/usage_counts DB.
- **Jobs/workers**: None required for Core Lessons flow itself. Optional: job to reset daily usage_counts (if not done inline at midnight or per-request with date boundary).
- **DB tables**: lessons, lesson_progress, usage_counts (lessons_today, lessons_limit), subscriptions (for tier). Content tables with media_key.
- **UI**: Lesson list and detail (media loaded via URL); “Start lesson”; progress and quiz submit; cap-reached modal (upsell) when 403 free_cap_reached.
- **Admin/config**: Content/media keys; cap limits (lessons_per_day free); feature flag for “core_lessons_enabled”.
- **Monitoring**: Entitlement check latency; 403 rate; media 404 rate; lesson_completed rate.
- **Seed/demo data**: Lessons with media_key pointing to dev CDN or mock URLs; test user with free tier at cap and premium tier for E2E.
- **Testing**: Unit: cap check logic (at cap → 403); cache hit/miss. Integration: complete lesson as free user under cap; complete as free at cap → 403; complete as premium. E2E: load lesson (media URL); complete flow; see upsell at cap. Mock: storage (URLs), analytics (capture events).

---

## 6. Summary

Core Lessons depends on **object storage/CDN** for media URLs, **cache** for fast entitlement, **entitlements** (payment + webhook + DB) for tier and cap enforcement, and **analytics** for events. All integration usage is documented above with data flow, triggering, auth, failure, local, and observability; full adapter and provider detail remains in the main integration deep-dives.
