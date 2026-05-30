# Integration Error Handling and Retries

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

Defines **transient vs permanent errors**, **retry eligibility**, **backoff rules**, **timeout defaults**, **user-visible fallbacks**, **degraded mode**, **duplicate webhook protection**, **dead-letter**, **compensating actions**, and **observability/escalation** for all integrations.

---

## 2. Transient vs Permanent Errors

| Type | Examples | Retry? |
|------|----------|--------|
| **Transient** | 5xx, timeout, connection reset, 429 (rate limit) | Yes, with backoff |
| **Permanent** | 400, 401, 403, 404, 422 (validation) | No |
| **Unknown** | 4xx not in list, network error | Treat as transient once; if repeated, treat as permanent |

**Provider-specific**: Stripe 402 (card declined) = permanent for that card. OpenAI 429 = transient (retry after Retry-After). Document per integration in respective doc.

---

## 3. Retry Eligibility Matrix

| Integration | Retry on 5xx | Retry on timeout | Retry on 429 | Max retries |
|-------------|--------------|------------------|--------------|-------------|
| LLM | Yes | Yes | Yes (after Retry-After) | 2 (then fallback) |
| Speech (STT/TTS) | Yes | Yes | Yes | 2 |
| Stripe API | Yes | Yes | Yes | 2 |
| Stripe webhook | No (return 500 to trigger Stripe retry) | N/A | N/A | Stripe retries |
| Email | Yes | Yes | Yes | 3 |
| Storage | Yes | Yes | No | 2 |
| Analytics | Yes (fire-and-forget) | Yes | Yes | 2 (then drop or queue) |

---

## 4. Backoff Rules

- **Exponential**: delay = min(initial * 2^attempt, max_delay). Initial 1 s; max 30 s. Jitter: add random 0–20% to avoid thundering herd.
- **Retry-After**: If provider sends Retry-After header, use that (cap at 60 s) for next retry.
- **429**: Use Retry-After if present; else 60 s. Count 429 in circuit breaker.

---

## 5. Timeout Defaults

| Integration | Timeout | Notes |
|-------------|---------|--------|
| LLM completion | 30 s | Long for big model; can stream to reduce perceived latency |
| LLM moderation | 5 s | Short |
| Speech STT | 15 s | Depends on audio length |
| Speech TTS | 20 s | Stream if possible |
| Stripe API | 10 s | |
| Email | 10 s | |
| Storage | 15 s | |
| Webhook handler (our side) | 25 s | Return 200 before this so provider does not retry |

---

## 6. User-Visible Fallback Behavior

| Scenario | User sees |
|----------|-----------|
| LLM timeout/failure after retry | “Something went wrong. Try again.” or “Use text instead.” (if voice) |
| Speech STT failure | “We couldn’t hear that. Try again or type your response.” |
| Speech TTS failure | Show transcript only: “Voice unavailable; here’s the text.” |
| Pronunciation failure | “Pronunciation feedback unavailable this time.” (do not block session) |
| Payment webhook delayed | “Subscription updating… Refresh in a moment.” (optional refresh button) |
| Email send failure | “Verification email couldn’t be sent. Try again later.” (resend button) |
| Storage upload failure | “Upload failed. Try again.” |

Never expose provider name or raw error to user in production.

---

## 7. Degraded Mode Design

- **Voice**: Degraded = text-only scenario (no TTS/STT). Offer “Type instead” when voice fails.
- **Location**: Degraded = no location tips; rest of app works.
- **Push**: Degraded = in-app only; no push.
- **Analytics**: Degraded = events dropped after retries; do not block user action.
- **Feature flags**: Degraded = default value (e.g. false) when provider unavailable; log and alert.

---

## 8. Duplicate Webhook Protection

- **Mechanism**: Idempotency key = provider event id (e.g. Stripe `evt_xxx`). Before processing, SELECT or INSERT with unique constraint on (integration, event_id). If insert fails (duplicate), return 200 and do nothing.
- **TTL**: Keep event ids for at least provider retry window (Stripe: 24 h). Optional: purge old ids by cron.
- **Response**: Always 200 for duplicate (so provider stops retrying).

---

## 9. Dead-Letter and Compensating Actions

- **Dead-letter**: If job (e.g. async pronunciation) fails after max retries, move to DLQ or mark as failed in DB; alert. Do not retry indefinitely. Optional: manual retry or discard.
- **Compensating**: If we charged user (Stripe) but our DB update failed after webhook, next webhook or reconciliation job should fix. If we granted premium in DB but Stripe later says payment failed, webhook `invoice.payment_failed` and eventual `subscription.deleted` revoke premium; we may have allowed access for a short window (acceptable with grace period).

---

## 10. Observability and Escalation

- **Log**: Every retry (provider, operation, attempt, error code). Every failure after retries (level ERROR). No PII in logs.
- **Metrics**: integration_retries_total, integration_failures_total (by provider and operation). integration_circuit_open_total (circuit breaker).
- **Alert**: Failure rate > 5% for 5 min; circuit opened; webhook handler returning 5xx. Escalate per Operations doc.
