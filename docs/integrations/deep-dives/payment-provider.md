# Payment / Billing Provider — Integration Deep-Dive

**Integration**: Stripe (concrete).  
**Version**: 1  
**Status**: Implementation-grade

---

## 1. Purpose

This document specifies the **payment and subscription integration** for the AI Dutch Coach: premium subscriptions, free trials, checkout flow, customer portal (manage subscription), and webhook-driven entitlement sync. It enables revenue (BFR-001, BFR-003), trial conversion (BFR-004), and correct gating of premium features (BFR-002, FD-12).

---

## 2. Core Concept

- **Provider**: Stripe. Backend creates Checkout Sessions (redirect) and Billing Portal sessions; never receives card data. Stripe sends webhooks for subscription and invoice events; backend verifies signature, updates `subscriptions` table, invalidates entitlement cache, and records conversion events (BFR-013).
- **Source of truth**: Stripe is the source of truth for payment and subscription state. Our `subscriptions` table is a cached projection updated from webhooks; entitlement checks read from our DB (or Redis cache) for low latency.

---

## 3. Why This Integration Exists

- **Premium revenue**: Monthly (and optionally annual) subscription; trial to reduce friction.
- **Entitlement sync**: Backend must gate premium features (voice tutor, unlimited lessons, scenarios, exam prep, daily reflection) based on subscription/trial state; state must stay in sync with Stripe via webhooks.
- **Conversion analytics**: Trial start, trial end, payment success, churn must be recorded (BFR-013) for funnel and product decisions.

---

## 4. Business Capabilities Enabled

- **Start trial**: User starts 7- or 14-day trial without payment; backend creates Checkout Session with `trial_period_days`; after trial, first charge.
- **Subscribe**: User upgrades via Checkout; Stripe charges; webhook updates subscription; GET /entitlements returns tier=premium.
- **Manage subscription**: User opens Customer Portal (link from backend) to update payment method, view invoices, cancel.
- **Entitlement gating**: All premium-only endpoints and UI check tier (free / trial / premium) from our store; trial and active subscription grant premium until period_end or trial_end.

---

## 5. Scope

### 6. In Scope

- Create Checkout Session (subscription, optional trial); redirect user to Stripe Hosted Checkout.
- Create Billing Portal session; return URL to client for “Manage subscription”.
- Webhook handler for subscription and invoice events; signature verification; idempotent processing; update `subscriptions` and entitlement cache.
- Store in DB: `user_id`, `stripe_customer_id`, `stripe_subscription_id`, `status`, `current_period_start`, `current_period_end`, `trial_end`, `cancel_at_period_end`.
- Record BFR-013 events: trial_started, trial_ended, payment_success, payment_failed, subscription_canceled.
- Failed payment handling: past_due status; grace period; optional email to update payment method; revoke when subscription canceled by Stripe.
- Local dev: Stripe test mode and CLI for webhook forwarding.

### 7. Out of Scope

- Collecting card on our backend (Stripe only). Enterprise invoicing / PO. Multi-currency beyond EUR (product decision). Refund flows (handle via Stripe Dashboard if needed).

---

## 8. Triggering Flows / Usage Points

| Trigger | Actor | Flow |
|---------|--------|------|
| User taps “Start trial” / “Upgrade” | Client | Client → POST /v1/checkout/session (price_id, trial_days?) → Backend creates or fetches Stripe Customer, creates Checkout Session → returns checkout_url → Client redirects to Stripe. |
| User returns from Checkout | Client | success_url or cancel_url to our app; client refetches GET /entitlements. |
| User taps “Manage subscription” | Client | Client → GET /v1/entitlements/portal-url or POST /v1/entitlements/portal-session → Backend creates Portal session → returns url → Client opens in same or new tab. |
| Stripe sends event | Stripe | POST /webhooks/stripe (Stripe-Signature, body) → Backend verifies, parses, updates DB, invalidates cache, records BFR-013. |
| Any premium request | Backend | Resolve tier from DB/cache (subscriptions + trials); allow or deny. |

---

## 9. Inputs

- **Checkout session**: price_id (required), trial_days (optional), success_url, cancel_url, user_id (from auth), customer_email or stripe_customer_id.
- **Webhook**: Raw body (JSON), Stripe-Signature header, webhook secret. Event types: customer.subscription.created/updated/deleted, invoice.paid, invoice.payment_failed.
- **Portal session**: user_id (from auth), return_url.

---

## 10. Outputs

- **Checkout session**: { checkout_url } for redirect.
- **Portal session**: { url } for redirect.
- **Webhook**: 200 OK (quick); processing can be async. 400 if signature invalid.
- **Entitlement**: tier, subscription_ends_at, trial_ends_at, manage_url (from Portal).

---

## 11. Data Domains Involved

- **subscriptions** (our DB): user_id, stripe_customer_id, stripe_subscription_id, status, current_period_start, current_period_end, trial_end, cancel_at_period_end, updated_at.
- **trials** (our DB): user_id, started_at, ends_at (if we track trial separately from Stripe; else derived from subscription with status=trialing).
- **Entitlement cache** (Redis): key entitlement:{user_id}; invalidate on webhook and trial/start.
- **Analytics / BFR-013**: trial_started, trial_ended, payment_success, payment_failed, subscription_canceled.

---

## 12. Source of Truth Rules

- **Stripe** is source of truth for payment and subscription lifecycle. Our DB is a projection; never authoritatively set subscription state without a webhook (except initial trial start via our API if we create trial without Stripe trial—then we still sync subscription when user converts).
- **Idempotency**: Process each Stripe event `id` at most once; store processed event ids (e.g. in Redis or DB with TTL 24h) to avoid double application on retries.

---

## 13. Authentication Model

- **Stripe API**: Backend uses secret key (Bearer / API key in Stripe SDK). Stored in env (STRIPE_SECRET_KEY); never in frontend.
- **Webhook**: Verified with webhook signing secret (STRIPE_WEBHOOK_SECRET). Use Stripe SDK `stripe.webhooks.constructEvent(body, signature, secret)`; reject request if verification fails.
- **Our API**: Checkout and Portal endpoints require authenticated user (session or JWT); user_id from auth context.

---

## 14. Authorization / Consent Model

- Only authenticated users can create checkout or portal sessions. No additional consent; payment and subscription management are explicit user actions.

---

## 15. Configuration Model

| Key | Type | Description | Example |
|-----|------|-------------|---------|
| STRIPE_PRICE_ID_MONTHLY | string | Stripe Price id for monthly plan | price_xxx |
| STRIPE_PRICE_ID_ANNUAL | string | Optional annual price id | price_yyy |
| STRIPE_TRIAL_DAYS | number | Default trial length when creating session | 14 |
| CHECKOUT_SUCCESS_URL | string | Redirect after successful payment | https://app.example.com/settings?checkout=success |
| CHECKOUT_CANCEL_URL | string | Redirect if user cancels | https://app.example.com/premium?checkout=cancel |
| PORTAL_RETURN_URL | string | Return after portal | https://app.example.com/settings |

---

## 16. Environment Strategy (local / dev / staging / prod)

| Env | Stripe mode | Keys | Webhook |
|-----|-------------|------|---------|
| **Local** | Test | sk_test_, pk_test_, whsec_ (for CLI) | Stripe CLI: `stripe listen --forward-to localhost:PORT/webhooks/stripe` |
| **Dev / Staging** | Test | Same test keys; env-specific webhook secret per endpoint | Stripe Dashboard endpoint URL pointing to staging; or CLI in dev |
| **Production** | Live | sk_live_, pk_live_, whsec_ (live endpoint) | Stripe Dashboard: production webhook URL; signing secret in vault/env |

Never use live keys in non-production. Use different webhook endpoints (or same URL with different secrets) for test vs live.

---

## 17. Data Flow Design

1. **Checkout**: Client → Backend (auth) → Backend ensures Stripe Customer (create if missing) → Backend calls Stripe Create Checkout Session (customer, price_id, trial_period_days, success_url, cancel_url, metadata.user_id) → Backend returns session.url → Client redirects.
2. **Post-checkout**: User completes or cancels on Stripe; Stripe redirects to success_url or cancel_url. Client refetches entitlements; backend has not yet received webhook—entitlement may still show free until webhook is processed. Optionally: poll GET /entitlements for a few seconds or show “Updating…” until cache refreshed.
3. **Webhook**: Stripe POST to /webhooks/stripe → Verify signature → Parse event → If event id already processed, return 200 and exit → Update subscriptions table (upsert by stripe_subscription_id or user_id) → Invalidate entitlement cache for user_id → Record BFR-013 event → Return 200.
4. **Portal**: Client → Backend GET or POST portal session (auth) → Backend creates Stripe Billing Portal session (customer, return_url) → Backend returns url → Client opens url.

---

## 18. Sync / Polling / Webhook Design

- **Sync**: No polling of Stripe for subscription state. All updates are webhook-driven.
- **Webhook**: Stripe sends events asynchronously. Backend must return 200 quickly (< 25s); process in request or enqueue job. If processing is async, still return 200 after verification and enqueue.
- **Retries**: Stripe retries failed (non-2xx) webhooks with backoff. Idempotency by event id prevents duplicate processing on retry.

---

## 19. Failure Handling

| Failure | Handling |
|---------|----------|
| Stripe API down | Return 503 to client; do not create session; client can retry. Log and alert. |
| Webhook signature invalid | Return 400; do not process. Log (no PII). |
| Webhook processing error (DB write fails) | Return 500 so Stripe retries; fix and redeploy; or process in job and return 200 after enqueue so Stripe does not retry (then job must be retried internally). |
| Duplicate event id | Return 200; skip processing (idempotent). |
| Subscription canceled by Stripe (non-payment) | Webhook subscription.deleted or updated with status=canceled; update DB; revoke premium at period_end. |

---

## 20. Retry Strategy

- **Backend → Stripe**: Retry Create Session / Create Portal with exponential backoff (e.g. 1s, 2s, 4s) up to 3 times on 5xx or network error.
- **Webhook**: Stripe retries on non-2xx; we return 200 after verification and (if async) after enqueue; internal job retry per job framework (e.g. 3 attempts with backoff).

---

## 21. Rate Limiting / Quota Considerations

- Stripe rate limits per key (e.g. 100 req/s); our checkout and portal usage are low. No application-level rate limit on Stripe calls beyond normal request volume.
- Our API: Rate limit POST /checkout/session and GET portal-session per user (e.g. 5/min) to prevent abuse.

---

## 22. Security / Compliance Requirements

- **PCI**: We do not store or transmit card data; Stripe is PCI-compliant. Redirect to Stripe for payment.
- **Secrets**: STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in env or vault; never in client or logs.
- **Webhook**: Always verify signature; reject any request with invalid signature.
- **Data**: Store only Stripe ids and subscription metadata; no card or full payment details in our DB. BFR-008: User can request export; include subscription status, not card.

---

## 23. Auditability / Logging Requirements

- Log: Checkout session created (user_id, price_id, no PII); Portal session created (user_id); Webhook received (event type, event id, no body with card); Webhook processed (event id, user_id, new status); Webhook verification failed (no secret in log).
- Do not log: Raw webhook body if it might contain PII; secret key; full card number.

---

## 24. Observability / Monitoring

- **Metrics**: Count of checkout sessions created; count of webhooks by type (received, processed, failed); latency of webhook handler; Stripe API errors.
- **Alerts**: Webhook handler 5xx rate; Stripe API error rate; drop in successful subscription events.
- **Dashboard**: Stripe Dashboard for payment and subscription metrics; our dashboard for entitlement cache hit rate and BFR-013 event counts.

---

## 25. UI / UX Implications

- **Upgrade / Trial**: Button triggers redirect to Stripe; show “Redirecting to secure payment…” and return to success_url with “You’re premium!” and refetched entitlement.
- **Manage subscription**: Link opens Portal in same or new tab; user returns to our app via return_url.
- **At cap**: When free user hits lesson cap, show modal with “Upgrade” (to checkout) and “Come back tomorrow”; checkout URL from backend.
- **Failed payment**: Optional in-app banner “Update payment method” with link to Portal; email reminder.

---

## 26. Admin / Operations Implications

- **Stripe Dashboard**: View customers, subscriptions, invoices, webhook delivery. Use for support (refund, cancel, update card).
- **Our admin**: Optional read-only view of subscription counts and trial conversion; no need to manage payments in our admin (Stripe is source of truth).
- **Runbook**: If webhooks fail repeatedly, check Stripe status; verify endpoint URL and secret; check our handler logs; replay failed events from Stripe if needed (idempotency allows safe replay).

---

## 27. API / Adapter Design

- **Adapter**: `PaymentProvider` or `StripeAdapter` with methods: `createCheckoutSession(params)`, `createPortalSession(customerId, returnUrl)`, `getCustomerId(userId)` (create if missing). Webhook handler: `verifyAndParseWebhook(body, signature)` → event; then `handleSubscriptionEvent(event)`, `handleInvoiceEvent(event)`.
- **Our API**:
  - POST /v1/checkout/session { price_id, trial_days? } → { checkout_url }
  - GET or POST /v1/entitlements/portal-session → { url }
  - POST /webhooks/stripe (no auth; verified by signature)

---

## 28. Event / Async Flow Design

- **Webhook processing**: Option A — Process in request (update DB, invalidate cache, record event) then return 200. Option B — Verify signature, enqueue job with event payload, return 200; job does DB update, cache invalidation, BFR-013. Prefer B for heavy work or if DB might be slow to avoid Stripe timeout.
- **BFR-013 events**: Emit to analytics pipeline (trial_started, trial_ended, payment_success, payment_failed, subscription_canceled) from webhook handler or job.

---

## 29. Data Persistence Requirements

- **subscriptions**: Upsert by stripe_subscription_id or (user_id) when subscription exists; columns: user_id, stripe_customer_id, stripe_subscription_id, status, current_period_start, current_period_end, trial_end, cancel_at_period_end, created_at, updated_at.
- **Processed webhook events**: Store event id (e.g. in Redis with TTL 24h or in table processed_webhook_events) to enforce idempotency.
- **Trials**: If we track trial separately (e.g. trial without Stripe), trials table with user_id, started_at, ends_at; else derive from subscription.status=trialing and trial_end.

---

## 30. Local Development Setup

- **Run Stripe in test mode**: Use sk_test_ and pk_test_ keys from Stripe Dashboard (Developers → API keys).
- **Webhooks locally**: Install Stripe CLI; run `stripe listen --forward-to http://localhost:3000/webhooks/stripe`. CLI prints a temporary webhook signing secret (whsec_...); set STRIPE_WEBHOOK_SECRET to that value in .env.local. Trigger events: `stripe trigger customer.subscription.created`, `stripe trigger invoice.paid`, etc.
- **Test cards**: 4242 4242 4242 4242 (success); 4000 0000 0000 0002 (decline). Use any future expiry and CVC.
- **Mock option**: For UI-only or CI, provide a mock adapter that returns fake checkout_url and does not call Stripe; webhook tests can use fixture payloads and a test secret.

---

## 31. Testing Requirements

- **Unit**: Adapter: createCheckoutSession returns URL; getCustomerId creates customer when missing; verifyAndParseWebhook throws on invalid signature.
- **Integration**: Create checkout session (test key); redirect to Stripe (test); complete payment with test card; webhook received (CLI or fixture); DB updated; entitlement returns premium. Idempotency: send same webhook twice; state applied once.
- **E2E**: User clicks Upgrade → redirects to Stripe → pays with test card → returns to app → entitlement shows premium (may require short poll until webhook processed).

---

## 32. Rollout / Feature Flag Strategy

- **Feature flag**: Optional “payments_enabled” to disable checkout in certain regions or during beta. When disabled, show “Coming soon” or hide upgrade CTA.
- **Rollout**: Launch with monthly + trial; add annual and promo codes later. Use test keys in staging; switch to live keys only for production; monitor webhook delivery and handler errors.

---

## 33. Example Scenarios

**Scenario 1 — User starts trial**  
Client POST /v1/checkout/session { price_id: "price_monthly", trial_days: 14 } → Backend creates Stripe Customer (if new), creates Checkout Session with trial_period_days=14 → returns checkout_url → User completes (no charge); Stripe sends customer.subscription.created (status=trialing) → Webhook updates DB status=trialing, trial_end=now+14d → Cache invalidated → GET /entitlements returns tier=trial, trial_ends_at=...

**Scenario 2 — First payment after trial**  
Stripe charges at trial end; sends invoice.paid → Webhook updates subscription status=active, current_period_end set → Record BFR-013 trial_ended and payment_success → Cache invalidated → User remains premium.

**Scenario 3 — User cancels**  
User opens Portal, cancels → Stripe sets cancel_at_period_end; sends subscription.updated → Webhook sets cancel_at_period_end=true in DB → Entitlement still premium until current_period_end → At period end Stripe sends subscription.deleted or updated (status=canceled) → Webhook revokes; tier=free.

---

## 34. Edge Cases

- **Webhook arrives before redirect**: User lands on success_url before webhook; GET /entitlements may still show free. Client can poll a few times or show “Activating…” and refetch after 2–3 s.
- **Duplicate webhook**: Stripe may send same event twice; idempotency by event id prevents double update and double BFR-013.
- **Subscription updated and deleted in quick succession**: Process in order; last state wins. Store updated_at; optional idempotency by event timestamp if needed.
- **Customer deleted in Stripe**: Rare; if we receive customer.deleted, optionally mark our subscription row as orphaned or remove; user would need to re-subscribe (new customer).
- **Past due**: Keep status past_due; allow access (grace) until Stripe cancels or current_period_end; notify user to update payment method.

---

## 35. Recommended Technical Design

- **Backend module**: `PaymentService` (or `StripeService`) with Stripe SDK; `WebhookController` for POST /webhooks/stripe (raw body, verify, dispatch by event type). Repository for subscriptions table; cache layer (Redis) for entitlement by user_id with invalidation on webhook.
- **Idempotency**: Redis key `webhook:stripe:processed:{event_id}` with TTL 24h; skip processing if key exists.
- **Async**: Use a job queue (e.g. Bull, SQS) for webhook payload after verification; return 200; job updates DB, invalidates cache, emits BFR-013.

---

## 36. Suggested Implementation Phasing

- **Phase 1**: Create Checkout Session (monthly + trial); webhook handler for subscription and invoice events; subscriptions table and entitlement cache; GET /entitlements and portal session. No Portal required if we only “cancel” via our API calling Stripe.
- **Phase 2**: Customer Portal for manage subscription and invoices; annual price; optional promo codes.
- **Phase 3**: Dunning emails (optional); Stripe Tax if needed; analytics dashboard for conversion.

---

## 37. Summary

The payment integration uses **Stripe** for subscriptions and trials. Backend creates Checkout and Portal sessions; all subscription state updates come from **webhooks** (signature-verified, idempotent). Our DB and cache project that state for fast entitlement checks. Local dev uses **Stripe test mode** and **Stripe CLI** for webhook forwarding. Failures are handled with retries and grace periods; observability and security (no card handling, secret management) are required for production.
