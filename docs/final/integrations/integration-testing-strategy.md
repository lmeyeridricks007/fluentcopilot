# Integration Testing Strategy

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

Defines **testing strategy** for integrations: local mock vs real sandbox, contract testing, webhook replay, speech quality, AI output validation, payment webhook testing, notification and geolocation testing, chaos/failure injection, and staging certification checklist.

---

## 2. Local Mock vs Real Sandbox

| Integration | Local (unit/integration) | Sandbox (staging/e2e) |
|-------------|---------------------------|------------------------|
| **Identity** | Mock DB; mock OAuth (return fake token) | Real Google/Apple test users |
| **LLM** | Mock adapter (return fixed response) | Real OpenAI/Anthropic test project (small calls) |
| **Speech** | Mock adapter (return fake transcript/audio URL) | Real Azure test resource |
| **Stripe** | Mock webhook payloads; mock Stripe API (e.g. stripe-mock) | Stripe test mode (test cards) |
| **Email** | Mock (capture sent emails in memory or file) | Resend/SendGrid test mode |
| **Storage** | MinIO or localstack (S3-compatible) | Real bucket in dev account |
| **Analytics** | Mock or disable (no events to prod) | PostHog test project |
| **Push** | Mock subscription; no real send | Real browser + backend (test send) |

**Rule**: Unit and integration tests use mocks so they are fast and not flaky. Staging and pre-prod use real sandbox to validate contracts and credentials. Never use production credentials in CI or local.

---

## 3. Contract Testing

- **Goal**: Ensure our adapter request/response shape matches what we expect from provider (and our API contract toward client).
- **How**: (1) Record real request/response from sandbox (e.g. one LLM call); save as fixture. Test: adapter.parseResponse(fixture) equals expected DTO. (2) Optional: Pact or similar for our API (client contract). Provider contract: optional provider SDK or OpenAPI; we do not control provider.
- **When**: On adapter change; run in CI. Fixtures should not contain PII; sanitize if needed.

---

## 4. Webhook Replay Testing

- **Stripe**: Use Stripe CLI `stripe listen --forward-to localhost:3000/webhooks/stripe` and `stripe trigger customer.subscription.created` (etc.). Verify handler returns 200; verify DB state (subscription created/updated). Test duplicate (send same event twice); verify idempotent (state correct once).
- **Replay from file**: Save webhook body (sanitized) as JSON; POST to handler with correct signature (recompute signature with test secret). Verify idempotency and state.

---

## 5. Speech Quality Validation

- **Manual**: Send known Dutch phrases to STT in sandbox; verify transcript accuracy. Send known text to TTS; listen for quality and speed. Document baseline phrases.
- **Automated**: If we have reference audio and expected transcript, compare WER (word error rate) in test. Pronunciation: send sample audio; verify score in expected range. Run in staging periodically.

---

## 6. AI Output Validation

- **Safety**: Send prompts that should be blocked (e.g. harmful request); verify moderation blocks or we do not return to user. Send safe prompts; verify response is returned.
- **Format**: For structured output (e.g. JSON lesson), verify parse and required keys. For conversation, verify Dutch and length within bounds.
- **Regression**: Store “golden” prompts and expected shape (not exact text); run in CI with mock or sandbox; assert structure and that moderation did not flag.

---

## 7. Payment Webhook Testing

- **Events**: Trigger subscription.created, subscription.updated, subscription.deleted, invoice.paid, invoice.payment_failed. Verify entitlement in DB and optional BFR-013 events. Use Stripe test clock for trial expiration if needed.
- **Signature**: Test invalid signature returns 400. Test valid signature processes once; duplicate returns 200 and no double update.

---

## 8. Notification and Geolocation Testing

- **Push**: Grant permission in test browser; register subscription; backend sends test notification; verify delivery and click. Test deny permission path.
- **Geolocation**: Use browser location override (Chrome DevTools) or mock; verify “near venue” triggers phrase (or no location sent if Option B). Test deny and timeout.

---

## 9. Chaos / Failure Injection

- **Simulate**: Provider timeout (mock adapter sleeps then timeout); provider 5xx (mock returns 500); provider 429 (mock returns 429). Verify retry and circuit breaker; verify user-visible fallback.
- **Tools**: Optional: chaos middleware in test that randomly fails or delays adapter. Or use provider’s fault injection if available (e.g. Azure Fault Injection).

---

## 10. Staging Certification Checklist

Before production:

- [ ] All integration credentials in staging are sandbox/test keys (no live keys).
- [ ] Stripe webhook endpoint in Stripe Dashboard points to staging URL; signing secret in env.
- [ ] LLM: test project with usage limit; no production data sent.
- [ ] Speech: test Azure resource; EU region.
- [ ] Email: test mode; no real user emails.
- [ ] Analytics: test project; no production data.
- [ ] Push: test send to own device/browser.
- [ ] Idempotency: webhook duplicate test passed.
- [ ] Circuit breaker: verified with mocked failures.
- [ ] Timeouts and retries: verified in tests or staging.
