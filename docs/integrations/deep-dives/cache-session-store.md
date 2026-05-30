# Cache / Session Store — Integration Deep-Dive

**Integration**: Concrete (Redis).  
**Version**: 1  
**Status**: Implementation-grade

---

## 1. Purpose

Specify **Redis** usage for entitlement cache, session store, rate limiting, and optional webhook idempotency. Ensures low-latency entitlement checks and reliable session invalidation without hitting DB on every request.

---

## 2. Core Concept

- **Redis**: In-memory key-value store; we use for sessions (session_id → user_id, TTL), entitlement cache (user_id → tier, usage, TTL), rate limit counters, and processed webhook event ids (idempotency).
- **Source of truth**: DB is source of truth for subscriptions and users; Redis is cache; invalidate on write (webhook, trial start, logout).

---

## 3. Why This Integration Exists

- **Entitlements**: GET /entitlements and per-request gating need fast reads; caching tier and usage (e.g. TTL 300s) reduces DB load. **Sessions**: Session-based auth requires fast lookup and invalidation (logout). **Rate limiting**: Sliding window or counter per user/IP. **Webhooks**: Idempotency keys with TTL.

---

## 4. Business Capabilities Enabled

- **Fast entitlement**: Cache hit returns tier without DB. **Session auth**: Validate session in Redis. **Rate limit**: Block or throttle abusive clients. **Webhook safety**: Process each event id once.

---

## 5. Scope

### 6. In Scope

- Redis connection (single instance or managed); key patterns: session:{id}, entitlement:{user_id}, ratelimit:{scope}:{id}, webhook:stripe:processed:{event_id}. TTLs: session (e.g. 7d), entitlement (300s), idempotency (24h). Invalidation: entitlement on webhook and trial/start; session on logout.
- Local dev: Redis in Docker or local install; same client code. Optional in-memory fallback for tests (mock).

### 7. Out of Scope

- Redis Cluster; pub/sub for this spec (optional for invalidation broadcast). Caching of lesson content (optional; can be same Redis).

---

## 8. Triggering Flows / Usage Points

| Trigger | Flow |
|---------|------|
| Authenticated request | Middleware: read session cookie → Redis GET session:{id} → user_id → attach to context. |
| GET /entitlements | Redis GET entitlement:{user_id} → if hit return; else DB query → SET Redis with TTL 300 → return. |
| Payment webhook / trial start | Handler: update DB → Redis DEL entitlement:{user_id} (invalidate). |
| Logout | Redis DEL session:{id}. |
| Rate limit check | Redis INCR ratelimit:{scope}:{key}; EXPIRE if first; if over limit return 429. |
| Webhook | Check SET webhook:stripe:processed:{event_id}; if not exists process and SET with TTL. |

---

## 9. Inputs

- **Session**: session_id (from cookie). **Entitlement**: user_id. **Rate limit**: scope (e.g. login), key (user_id or IP). **Webhook**: event_id.

---

## 10. Outputs

- **Session**: user_id or null. **Entitlement**: { tier, usage, ... } or cache miss (then DB). **Rate limit**: allowed / denied. **Idempotency**: already_processed / ok.

---

## 11. Data Domains Involved

- **Sessions**: session_id → user_id, optional metadata. **Entitlements**: user_id → serialized entitlement object. **Rate limits**: key → count. **Webhook**: event_id → 1 (presence).

---

## 12. Source of Truth Rules

- **DB** is source of truth for subscription and user. **Redis** is cache; always invalidate on write (subscription update, trial start, logout). On cache miss, load from DB and repopulate.

---

## 13. Authentication Model

- **Redis**: Connection URL (REDIS_URL) with optional password. No per-request auth; network security (Redis not exposed publicly). **Our API**: Session in Redis proves auth; entitlement cache is internal.

---

## 14. Authorization / Consent Model

- N/A for Redis itself. Entitlement cache reflects authorization (tier); invalidation ensures consistency.

---

## 15. Configuration Model

| Key | Type | Description |
|-----|------|-------------|
| REDIS_URL | string | redis://[:password]@host:port[/db] |
| SESSION_TTL_SECONDS | number | Session key TTL |
| ENTITLEMENT_CACHE_TTL_SECONDS | number | Entitlement key TTL (e.g. 300) |
| RATE_LIMIT_* | number | Per-scope limits (e.g. 10/min for login) |

---

## 16. Environment Strategy

| Env | Setup |
|-----|--------|
| **Local** | Redis on localhost (docker run -p 6379:6379 redis) or Redis in Docker Compose. REDIS_URL=redis://localhost:6379/0. |
| **Staging** | Managed Redis or same as prod with separate DB number. |
| **Production** | Managed Redis (EU); REDIS_URL from vault; optional replication. |

---

## 17. Data Flow Design

- **Session**: On login, SET session:{id} = user_id, EXPIRE ttl. On request, GET; if missing 401. On logout DEL. **Entitlement**: GET; miss → load from DB → SET with TTL. On webhook/trial start DEL. **Rate limit**: INCR key; EXPIRE key 60; if count > limit return 429.

---

## 18. Sync / Polling / Webhook Design

- **Sync**: All Redis ops are synchronous in request. No polling. Optional: pub/sub to invalidate entitlement on other nodes (multi-instance).

---

## 19. Failure Handling

| Failure | Handling |
|---------|----------|
| Redis down | Session: 503 or fallback to “re-login”. Entitlement: fallback to DB (slower). Rate limit: allow (fail open) or 503. Webhook idempotency: use DB table as fallback. |
| Connection timeout | Retry once; then fallback. Log and alert. |

---

## 20. Retry Strategy

- **Connection**: Retry 2 times with backoff on connect. **Commands**: No automatic retry for GET/SET (idempotent but avoid duplicate SET). Reconnect on connection lost.

---

## 21. Rate Limiting / Quota Considerations

- **Redis**: Memory and connection limits. Key eviction: use volatile keys with TTL; avoid unbounded keys. **Our rate limits**: Configurable per endpoint; store in Redis with TTL.

---

## 22. Security / Compliance Requirements

- **REDIS_URL**: Password in URL or env; not in logs. **Network**: Redis in private network; not public. **Data**: Session and entitlement cache may contain user_id; no PII in value (tier, usage counts). **GDPR**: Session data is temporary; entitlement is derived; no long-term PII in Redis if possible.

---

## 23. Auditability / Logging Requirements

- Log: Redis connection failures; cache miss/hit metrics (optional). Do not log session or entitlement values (may contain identifiers).

---

## 24. Observability / Monitoring

- **Metrics**: Redis connection pool usage; command latency; cache hit rate for entitlement. **Alerts**: Redis down; high latency; connection exhaustion.

---

## 25. UI / UX Implications

- **Redis down**: User may see 503 or “Session expired” (if session lost); prompt re-login. Entitlement fallback to DB may add latency.

---

## 26. Admin / Operations Implications

- **Flush**: Avoid FLUSHALL in prod; invalidate specific key patterns if needed (e.g. entitlement:*). **Memory**: Monitor; set maxmemory and eviction policy (volatile-lru).

---

## 27. API / Adapter Design

- **Client**: Redis client (ioredis, node-redis). **Abstractions**: SessionStore (get, set, del); EntitlementCache (get, set, invalidate); RateLimiter (check, increment); IdempotencyStore (exists, set). Same interface; Redis implementation; optional InMemory for tests.

---

## 28. Event / Async Flow Design

- **Invalidation**: Webhook handler or trial/start handler calls EntitlementCache.invalidate(user_id) after DB update. Sync in same request.

---

## 29. Data Persistence Requirements

- **Redis**: Ephemeral (or persistence if Redis configured with RDB/AOF). We do not rely on Redis as only store for critical data; DB is source of truth. Session: acceptable to lose on Redis restart (user re-login). Entitlement: repopulate from DB on miss.

---

## 30. Local Development Setup

- **Redis**: Install Redis or `docker run -p 6379:6379 redis`. Set REDIS_URL=redis://localhost:6379. **Tests**: Use same Redis with db=1 or in-memory mock (e.g. fake SessionStore that returns test user_id).

---

## 31. Testing Requirements

- **Unit**: Mock SessionStore/EntitlementCache; assert invalidate called on webhook. **Integration**: With real Redis: set session → get → delete → get null. Entitlement: set → get hit → invalidate → get miss.

---

## 32. Rollout / Feature Flag Strategy

- **Feature flag**: Optional “entitlement_cache_enabled” to bypass cache (always DB) for debugging. Redis is required for session if using server-side session.

---

## 33. Example Scenarios

**Session**: Login → SET session:abc user_id=u1 EX 604800 → Request with cookie → GET session:abc → u1 → allow. Logout → DEL session:abc. **Entitlement**: GET entitlement:u1 → miss → SELECT from subscriptions → SET entitlement:u1 {...} EX 300 → return. Webhook → UPDATE subscriptions → DEL entitlement:u1.

---

## 34. Edge Cases

- **Redis restart**: All keys lost; sessions invalid (users re-login); entitlement cache repopulates on next request. **Stale entitlement**: TTL 300s; worst case 5 min stale until next invalidation or TTL expiry. **Multi-instance**: Invalidate only local cache unless using Redis pub/sub to broadcast DEL.

---

## 35. Recommended Technical Design

- **Single REDIS_URL**; connection pool. Key prefix optional (e.g. app:session:). TTLs in config. EntitlementCache invalidate on every subscription/trial write. SessionStore with secure cookie; same TTL as cookie max-age.

---

## 36. Suggested Implementation Phasing

- **Phase 1**: Redis for session and entitlement cache; invalidation on webhook and trial/start. **Phase 2**: Rate limiting in Redis; webhook idempotency in Redis. **Phase 3**: Optional pub/sub for multi-node invalidation.

---

## 37. Summary

**Cache/session store** uses **Redis** (concrete). Used for **sessions**, **entitlement cache** (TTL 300s, invalidate on write), **rate limiting**, and **webhook idempotency**. **Local**: Redis in Docker or local. **Failure**: Fallback to DB for entitlement; session loss requires re-login. Security: Redis in private network; no secrets in values. Required for performance and auth.
