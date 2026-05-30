# Integration Implementation Patterns

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

Defines **reusable integration patterns** used across the product: adapter, provider abstraction, anti-corruption layer, webhook ingestion, async offload, idempotency, retry with backoff, circuit breaker, failover, signed URL, token refresh, entitlement sync, and client permission orchestration. Each pattern includes when to use, why it matters, how it applies here, pitfalls, and implementation notes.

---

## 2. Adapter Pattern

- **When**: Every external API (LLM, Speech, Stripe, Email, Storage).
- **Why**: Single place to translate our domain → provider request and provider response → our domain; isolate provider changes.
- **How**: Define internal interface (e.g. `LLMAdapter.generate(messages, options)`). Implement `OpenAIAdapter`, `AnthropicAdapter`. Orchestrator calls interface; does not know provider.
- **Pitfalls**: Leaking provider types into domain; adapter doing business logic (keep it thin).
- **Implementation**: Adapter in backend only; one adapter per provider per integration domain. Config or feature flag selects which implementation.

---

## 3. Provider Abstraction (Multi-Provider)

- **When**: Multiple providers for same capability (e.g. OpenAI + Anthropic; Azure TTS + ElevenLabs).
- **Why**: Failover and vendor flexibility; A/B or cost-based routing.
- **How**: Same as adapter; factory or registry returns adapter by name. Orchestrator calls abstract interface; on failure, try next provider if configured.
- **Pitfalls**: Different providers have different semantics (e.g. token limits); map to common options (max_tokens, temperature) and document provider-specific quirks in adapter.
- **Implementation**: See ai-llm.md, speech-voice.md.

---

## 4. Anti-Corruption Layer

- **When**: External model (e.g. Stripe Subscription object) must not dictate our domain model.
- **Why**: We persist only what we need (user_id, status, period_end); provider schema changes do not force DB migrations.
- **How**: Webhook handler or API response handler maps provider DTO to our entity (e.g. Subscription); persist our entity. Never store raw provider JSON as source of truth long-term (optional: store for audit with TTL).
- **Pitfalls**: Over-mapping (storing everything “just in case”); under-mapping (missing field needed for entitlement).
- **Implementation**: Stripe webhook → our `subscriptions` table; only fields we use. LLM response → our `ConversationTurn` or feedback DTO.

---

## 5. Webhook Ingestion Pattern

- **When**: Stripe (and optional: Resend/SendGrid events, push delivery status).
- **Why**: Provider pushes events; we must accept and process reliably.
- **How**: Dedicated route (e.g. POST /webhooks/stripe). Verify signature first; return 401/400 if invalid. Parse body; **idempotency by event id** (store processed ids; skip if already processed). Process in handler or enqueue for async; return 200 quickly (< 5 s) to avoid provider timeout. No auth cookie (webhook uses signature).
- **Pitfalls**: Processing twice (always idempotent); long processing causing timeout (offload to queue); logging full body (may contain PII—log only event id and type).
- **Implementation**: See payments-subscriptions.md. Use provider SDK for signature verification.

---

## 6. Async Job / Queue Offload

- **When**: Heavy or slow work (pronunciation analysis, daily lesson generation, bulk email).
- **Why**: Keep API response time low; avoid provider timeout on our side.
- **How**: API accepts request; enqueues job (Redis queue, SQS, or DB job table); returns 202 Accepted with job id. Worker picks up job; calls integration; updates DB. Client polls for result or gets notified (push/webhook).
- **Pitfalls**: Job visibility (user must see “Generating…” and then result); failure handling (retry job; dead-letter after N failures).
- **Implementation**: Pronunciation (FD-06) can be sync for short audio or async for long; daily lesson (FD-07) typically async.

---

## 7. Idempotency Handling

- **When**: Webhooks; payment or subscription state updates; any “apply once” operation.
- **Why**: Provider may retry; duplicate application causes wrong state (e.g. double grant premium).
- **How**: Store processed id (e.g. Stripe event id) in DB or Redis with TTL (e.g. 24 h). Before processing, check if id exists; if yes, return 200 and skip. Use unique constraint or conditional insert.
- **Pitfalls**: TTL too short (replay after TTL); storing only in memory (lost on restart). Prefer DB with unique constraint on (integration, event_id).
- **Implementation**: Stripe webhook handler; optional: idempotency key for our own API (e.g. POST /v1/voice/turn with Idempotency-Key header).

---

## 8. Retry with Backoff

- **When**: Transient failures (5xx, timeout, 429).
- **Why**: Temporary network or provider overload; retry often succeeds.
- **How**: Exponential backoff: 1 s, 2 s, 4 s (max 3 retries). Respect Retry-After if provider sends it. Do not retry 4xx (except 429). Log each retry; after max retries, fail and return 503 or fallback.
- **Pitfalls**: Retrying non-idempotent operations (e.g. charge); retrying forever (cap retries). Only retry GET or documented idempotent POST.
- **Implementation**: In adapter or shared HTTP client wrapper. See integration-error-handling-and-retries.md.

---

## 9. Circuit Breaker / Fallback

- **When**: Repeated failures to same provider (e.g. OpenAI down).
- **Why**: Fail fast instead of hanging; switch to fallback provider or degraded response.
- **How**: Track consecutive failures per provider; after N (e.g. 5), open circuit (stop calling for T seconds, e.g. 120). After T, half-open: one test request; if success, close circuit. If fallback provider, call fallback when primary circuit open.
- **Pitfalls**: Circuit per operation type (e.g. separate for “completion” vs “moderation”); shared circuit for same provider is OK. Do not open circuit on 4xx.
- **Implementation**: Use library (e.g. opossum in Node) or simple state machine in adapter. See ai-llm.md.

---

## 10. Signed Upload/Download Pattern

- **When**: User uploads (photos) or private content (audio, documents).
- **Why**: Client or CDN must not hold storage credentials; time-limited access.
- **How**: **Upload**: Backend generates pre-signed PUT URL (storage provider); returns URL and method to client; client PUTs file; client notifies backend “upload done”; backend verifies (e.g. head object) and saves key. **Download**: Backend generates pre-signed GET URL with expiry (e.g. 1 h); returns to client; client uses as src. Backend never streams secret key.
- **Pitfalls**: Expiry too long (security); not validating upload (type, size) after PUT. Prefer backend-upload (client POST multipart to our API) for simpler validation and moderation.
- **Implementation**: See media-storage.md.

---

## 11. Token Refresh Pattern

- **When**: OAuth or short-lived API tokens (e.g. Azure Speech token if using token instead of key).
- **Why**: Token expires; refresh without user interaction.
- **How**: Store refresh_token or re-issue from API key (per provider). Before each call, check expiry; if expired, refresh and cache new token. Use in-memory or short TTL cache. Do not refresh on every request if token is long-lived.
- **Pitfalls**: Refreshing in parallel (race); logging token. Single-thread refresh or lock.
- **Implementation**: Azure Speech: can use key directly (no refresh). OAuth: see identity-authentication.md.

---

## 12. Entitlement Sync Pattern

- **When**: Subscription state must match provider (Stripe).
- **Why**: We gate features by our DB; Stripe is source of truth for payment.
- **How**: Webhook updates our `subscriptions` table. On read, we never call Stripe for “is this user subscribed?”—we read from our DB. Optional: periodic reconciliation job (fetch Stripe subscriptions for our customers; diff with DB; fix drift). Prefer webhook-only for Phase 1.
- **Pitfalls**: Webhook delay or loss (eventual consistency); show “Updating…” if user just paid and we have not received webhook yet. Allow manual “Refresh subscription” in Settings that calls Stripe and syncs once.
- **Implementation**: See payments-subscriptions.md.

---

## 13. Client Permission Orchestration Pattern

- **When**: Feature needs browser permission (microphone, location, notifications).
- **Why**: One place to “request or explain”; avoid scattered permission logic.
- **How**: **PermissionGate** component: receives permission type and feature name. If not yet requested, show in-app explanation + “Enable”; on click, call browser API. If denied, show “Go to Settings” and do not re-ask this session. If granted, render children (e.g. voice UI). Backend still checks consent flag before allowing feature (e.g. do not start voice session if user revoked consent in our DB).
- **Pitfalls**: Asking before user understands; asking for all permissions at once (ask in context). Backend must enforce; frontend gate is UX only.
- **Implementation**: See browser-capabilities-pwa.md and UI doc.
