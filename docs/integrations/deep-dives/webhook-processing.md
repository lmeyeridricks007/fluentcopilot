# Webhook Processing — Integration Deep-Dive

**Integration**: Strategy (provider-agnostic pattern).  
**Version**: 1  
**Status**: Implementation-grade

---

## 1. Purpose

Specify **incoming webhook processing** for the AI Dutch Coach: verification, idempotency, async handling, and provider-specific dispatch (payment, optional future). Ensures reliable, secure, and auditable handling of provider callbacks (e.g. Stripe subscription and invoice events).

---

## 2. Core Concept

- **Webhook**: Provider (e.g. Stripe) sends HTTP POST to our endpoint with event payload and signature. We verify signature, parse event, process once (idempotent), and return 200 quickly so provider does not retry unnecessarily.
- **Source of truth**: Provider is source of truth for the event; our processing updates our DB/cache and must be idempotent so duplicate delivery does not double-apply.

---

## 3. Why This Integration Exists

- **Payment**: Stripe sends subscription and invoice events; we must update subscription state and entitlement cache (see payment-provider.md).
- **Future**: Other providers (e.g. email delivery, identity) may send webhooks; same pattern applies.

---

## 4. Business Capabilities Enabled

- **Event-driven sync**: Subscription state, payment success/failure, and other provider events update our system without polling. Enables correct entitlement and BFR-013 analytics.

---

## 5. Scope

### 6. In Scope

- Single webhook router: POST /webhooks/:provider (e.g. /webhooks/stripe).
- Verification: Provider-specific signature verification (e.g. Stripe-Signature + secret); reject invalid with 400.
- Idempotency: Process each event id (or equivalent) at most once; store processed ids (Redis or DB) with TTL.
- Dispatch: Route by provider and event type; call appropriate handler (e.g. subscription handler, invoice handler).
- Response: Return 200 within provider timeout (e.g. 25s for Stripe); process in request or enqueue and return 200 after enqueue.
- Local dev: Stripe CLI forward; test payloads and signature.

### 7. Out of Scope

- Outgoing webhooks (we do not send webhooks to third parties in this spec). Webhook subscription management (provider dashboard).

---

## 8. Triggering Flows / Usage Points

| Trigger | Flow |
|---------|------|
| Stripe sends event | POST /webhooks/stripe with Stripe-Signature and body → Verify → Parse → Idempotency check → Dispatch → Update DB/cache → Return 200. |
| Duplicate event | Same → Verify → Idempotency check (already processed) → Return 200, skip processing. |
| Invalid signature | Return 400; log; do not process. |

---

## 9. Inputs

- **Request**: Raw body (preserve for signature verification); headers (e.g. Stripe-Signature); provider path param.
- **Config**: Webhook secret per provider (env); endpoint URL registered in provider dashboard.

---

## 10. Outputs

- **Success**: 200 OK (body optional; Stripe expects 200).
- **Invalid signature**: 400 Bad Request.
- **Processing error**: 500 so provider retries (if we have not yet returned 200); or 200 after enqueue and let job retry internally.

---

## 11. Data Domains Involved

- **Processed events**: event_id (or provider+id), processed_at; Redis or table with TTL/retention.
- **Downstream**: subscriptions, entitlement cache, BFR-013 events (from payment webhook).

---

## 12. Source of Truth Rules

- **Provider**: Event payload is authoritative. We must not alter provider data; we project it into our DB. Idempotency ensures we do not double-apply.

---

## 13. Authentication Model

- **No Bearer**: Webhook endpoint does not use session/JWT. Authentication is **signature verification** using provider-supplied secret (e.g. STRIPE_WEBHOOK_SECRET). Only verified requests are processed.

---

## 14. Authorization / Consent Model

- N/A; webhook is machine-to-machine. Authorization is “request came from provider” (signature).

---

## 15. Configuration Model

| Key | Type | Description |
|-----|------|-------------|
| STRIPE_WEBHOOK_SECRET | string | Stripe signing secret for this endpoint |
| WEBHOOK_ASYNC_QUEUE | string | Optional queue name for async processing (e.g. Redis Bull) |
| WEBHOOK_PROCESSED_TTL_HOURS | number | TTL for processed event id (idempotency) | 24 |

---

## 16. Environment Strategy

| Env | Setup |
|-----|--------|
| **Local** | Stripe CLI: `stripe listen --forward-to localhost:PORT/webhooks/stripe`; CLI gives temporary secret for .env.local. |
| **Staging** | Stripe Dashboard: endpoint URL https://staging-api.../webhooks/stripe; use staging secret in env. |
| **Production** | Stripe Dashboard: endpoint URL https://api.../webhooks/stripe; live secret in vault/env. |

---

## 17. Data Flow Design

1. **Receive**: Read raw body (do not parse JSON yet if signature needs raw); read signature header.
2. **Verify**: Call provider SDK or custom verification (e.g. Stripe `constructEvent(body, signature, secret)`). On failure: return 400, log (no secret), exit.
3. **Parse**: Parse JSON; get event id and type.
4. **Idempotency**: Check Redis/DB for key `webhook:stripe:processed:{event_id}`. If exists: return 200, exit.
5. **Dispatch**: Route by event type (e.g. customer.subscription.updated → subscription handler). Handler updates DB, invalidates cache, records BFR-013.
6. **Mark processed**: Set `webhook:stripe:processed:{event_id}` with TTL (e.g. 24h). Return 200.
7. **Async variant**: After step 4, enqueue job with event payload; return 200; job performs 5–6; on job failure, job framework retries; we do not return 500 to provider so Stripe does not retry (optional: return 500 only if enqueue fails so Stripe retries).

---

## 18. Sync / Polling / Webhook Design

- **Incoming only**: We do not poll; we receive POST. Return 200 quickly; processing can be in-request or async. Provider retries on non-2xx with backoff.

---

## 19. Failure Handling

| Failure | Handling |
|---------|----------|
| Invalid signature | 400; do not process; log. |
| Unknown event type | Log; return 200 (so provider does not retry) or 200 and process no-op. |
| Handler throws (DB down) | If sync: return 500 so provider retries. If async: return 200 after enqueue; job retries; alert on job failure. |
| Duplicate event id | Return 200; skip processing. |

---

## 20. Retry Strategy

- **Provider retries**: Stripe retries on 5xx; we return 200 after verification and (if async) enqueue, so we avoid 500. Internal job retries per queue config (e.g. 3 attempts, exponential backoff).
- **Our rule**: Do not return 200 until we have either processed the event or enqueued it; otherwise return 500 so provider retries.

---

## 21. Rate Limiting / Quota Considerations

- **Provider**: Stripe has webhook delivery limits; we do not rate limit the webhook endpoint by IP (provider IP may vary). Optional: rate limit by provider key in header if supported.
- **Our processing**: Handlers should be fast or offloaded to job; avoid blocking provider with long work.

---

## 22. Security / Compliance Requirements

- **Verification**: Always verify signature; never process unverified payloads. Reject tampered or replayed payloads (replay is mitigated by idempotency).
- **Secrets**: Webhook secret in env/vault; never in logs or client. Rotate if leaked; update provider dashboard and env.

---

## 23. Auditability / Logging Requirements

- Log: Provider, event type, event id, processing result (success/skip/error); latency. Do not log full body (may contain PII). Log signature verification failure (without secret).

---

## 24. Observability / Monitoring

- **Metrics**: Webhook received count by provider and type; verification failure count; processing success/failure; latency.
- **Alerts**: Verification failure spike; processing error rate; queue depth (if async).

---

## 25. UI / UX Implications

- None direct; webhooks are server-to-server. User-visible effects (e.g. entitlement updated) are reflected on next API call or refetch.

---

## 26. Admin / Operations Implications

- **Runbook**: If events are missed, check provider dashboard for delivery failures; fix endpoint/secret; optionally replay from provider if supported. Idempotency allows safe replay.
- **Replay**: Stripe Dashboard can resend events; our idempotency prevents double application.

---

## 27. API / Adapter Design

- **Endpoint**: POST /webhooks/stripe (no auth). Raw body; Stripe-Signature header. Router by path for future /webhooks/other.
- **Handler registry**: Map event type → handler (e.g. customer.subscription.updated → subscriptionHandler). Each handler is async (user_id, payload) → update DB, cache, analytics.

---

## 28. Event / Async Flow Design

- **Option A (sync)**: Verify → process in request → return 200. Risk: long processing may hit provider timeout.
- **Option B (async)**: Verify → enqueue job with payload → return 200. Job: idempotency check → dispatch → mark processed. Preferred for heavy work.

---

## 29. Data Persistence Requirements

- **Processed events**: Redis set or table `webhook_processed_events(provider, event_id, processed_at)` with TTL or retention (e.g. 7 days). Used only for idempotency.

---

## 30. Local Development Setup

- **Stripe**: Install Stripe CLI; run `stripe listen --forward-to http://localhost:3000/webhooks/stripe`; set STRIPE_WEBHOOK_SECRET to CLI output. Trigger: `stripe trigger customer.subscription.updated`.
- **Test payloads**: Store fixture JSON and valid signature for unit tests (generate once with test secret).

---

## 31. Testing Requirements

- **Unit**: Verification rejects invalid signature; accepts valid; idempotency skips duplicate event id; handler called with correct payload.
- **Integration**: Send fixture webhook with valid signature; assert DB/cache updated; send same again; assert no double update. Send invalid signature; assert 400.

---

## 32. Rollout / Feature Flag Strategy

- Webhook endpoint is always on for payment. Optional feature flag to disable specific event types (e.g. for migration).

---

## 33. Example Scenarios

**Stripe subscription.updated**  
POST /webhooks/stripe with valid signature, body with event id evt_123, type customer.subscription.updated → Verify → Idempotency (evt_123 not seen) → subscriptionHandler updates subscriptions table, invalidates cache → Mark evt_123 processed → 200.

**Duplicate**  
Same POST again → Verify → Idempotency (evt_123 seen) → 200, no handler run.

---

## 34. Edge Cases

- **Replay attack**: Attacker replays old event; idempotency prevents re-application. Signature is bound to body; cannot forge without secret.
- **Out-of-order events**: Process in order of receipt; last state wins. Optional: use event timestamp or sequence if provider supplies it for ordering.
- **Unknown event type**: Log; return 200; do not fail (avoid retries for noise).

---

## 35. Recommended Technical Design

- **Webhook controller**: Single route; read raw body; branch by provider; verify with provider secret; parse; idempotency check; dispatch or enqueue; return 200/400/500.
- **Idempotency**: Redis key `webhook:{provider}:{event_id}` TTL 24h. Set after successful process (or after enqueue if job is responsible for idempotency).

---

## 36. Suggested Implementation Phasing

- **Phase 1**: Stripe only; sync processing; signature verification and idempotency.
- **Phase 2**: Async queue for Stripe; add other providers if needed.
- **Phase 3**: Replay and admin tooling for missed events.

---

## 37. Summary

**Webhook processing** is a **provider-agnostic pattern**: verify signature, enforce idempotency by event id, dispatch to handler, return 200 quickly. **Local dev** uses Stripe CLI for forwarding and trigger. **Security**: never process unverified payloads; keep secrets out of logs. **Reliability**: idempotency and optional async job for heavy work ensure correct and duplicate-safe updates to subscription and entitlement state.
