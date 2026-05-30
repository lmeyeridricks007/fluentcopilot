# Payments & Subscriptions Integration (Stripe)

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

This document specifies the **Stripe** integration for premium subscriptions, trials, entitlement sync, webhooks, failed payment handling, cancellation, and VAT/invoicing. It enables engineers to implement subscription lifecycle and tie it to app entitlement (BFR-002, BFR-013).

---

## 2. Why This Integration Is Needed

- **Premium revenue** (BFR-001, BFR-003): Monthly (and optionally annual) subscription.
- **Trial** (BFR-004): Time-limited trial; convert or revert at end.
- **Entitlement** (BFR-002): Backend gates premium features by subscription state; state must stay in sync with Stripe.
- **Conversion analytics** (BFR-013): Trial start, trial end, payment success, churn must be recorded.

---

## 3. Product Capabilities Supported

- FD-12 (Entitlements & subscription). All premium features (voice, pronunciation, scenarios unlimited, exam prep, daily reflection) gated by subscription/trial state.

---

## 4. Decision Status

| Item | Status |
|------|--------|
| Payment provider | **Required now** — Stripe |
| Monthly subscription | **Required now** |
| Annual subscription | **Optional now** (recommended Phase 1 for LTV) |
| Trial | **Required now** (7 or 14 days) |
| Promo codes / discounts | **Optional now** |

---

## 5. Recommended Provider: Stripe

- **Rationale**: Well-documented; webhooks; EU; supports trials, subscriptions, and invoicing. Mobile web: Stripe Checkout (redirect) or Stripe Elements (embedded) both work; Checkout simpler for Phase 1.
- **Alternatives**: Paddle (merchant of record), RevenueCat (if we had native apps). Stripe chosen for control and web-first.

---

## 6. High-Level Architecture

```mermaid
sequenceDiagram
  participant U as User
  participant C as Client
  participant API as Backend
  participant S as Stripe
  participant WH as Webhook

  U->>C: Upgrade / Start trial
  C->>API: POST /v1/checkout/session (price_id, trial_days?)
  API->>API: Get or create Stripe customer by user_id
  API->>S: Create Checkout Session (customer, price, trial_end)
  S->>API: session_id, url
  API->>C: { checkout_url }
  C->>C: Redirect to Stripe Checkout
  U->>S: Complete payment (card)
  S->>WH: customer.subscription.created/updated, invoice.paid, etc.
  WH->>API: POST /webhooks/stripe (signature, body)
  API->>API: Verify signature; upsert subscription state; record BFR-013 events
  API->>S: 200 OK
  C->>API: Poll or redirect back to app
  API->>C: Entitlement: premium
```

---

## 7. Stripe Product/Price Setup

- **Products**: One product "AI Dutch Coach Premium" (or per plan if multiple later).
- **Prices**: 
  - **Monthly**: Recurring, EUR, e.g. €9.99/month. Price id: `price_xxx_monthly`.
  - **Annual** (optional): Recurring, EUR, e.g. €99/year. Price id: `price_xxx_annual`.
- **Trial**: Set `subscription_data.trial_period_days` when creating Checkout Session (e.g. 14). No charge until trial end; then first invoice.
- **Customer**: Create Stripe Customer per user (store `stripe_customer_id` in our DB). Reuse same customer for renewal and history.

---

## 8. Subscription State Machine (Conceptual)

| State | Meaning | Entitlement |
|-------|---------|-------------|
| **none** | No subscription | Free |
| **trialing** | In trial period | Premium (same as paid) |
| **active** | Paid and current | Premium |
| **past_due** | Payment failed; retrying | Premium (grace) or downgrade per policy |
| **canceled** | Canceled; access until period end | Premium until period_end then Free |
| **unpaid** | Final payment failed | Free |

**Implementation**: Store in our `subscriptions` table: `user_id`, `stripe_subscription_id`, `stripe_customer_id`, `status`, `current_period_start`, `current_period_end`, `trial_end`, `cancel_at_period_end`. Update from webhooks.

---

## 9. Frontend Responsibilities

- **Start trial / Subscribe**: Call our backend `POST /v1/checkout/session` with `price_id` and optional `trial_days`. Backend returns `checkout_url`. Redirect user to `checkout_url` (Stripe Hosted Checkout). **Never** send card to our backend; Stripe collects card.
- **Return URL**: Configure `success_url` and `cancel_url` to our app (e.g. `https://app.example.com/settings?checkout=success` and `?checkout=cancel`). On success, frontend can show "You're premium!" and refetch entitlement.
- **Manage subscription**: Link to Stripe Customer Portal (backend generates portal session URL) or our own settings page that calls backend to cancel (backend calls Stripe API to set cancel_at_period_end). Prefer Stripe Portal for Phase 1 (invoices, payment method update, cancel).
- **Publishable key**: Frontend may need Stripe publishable key only if using Stripe Elements (embedded form). For Checkout redirect, optional. If used: `VITE_STRIPE_PUBLISHABLE_KEY` (pk_test_ or pk_live_). **Never** use secret key in frontend.

---

## 10. Backend Responsibilities

- **Create Checkout Session**: POST to Stripe `v1/checkout/sessions` with `customer` (or `customer_email` if new), `line_items` (price_id), `mode: 'subscription'`, `subscription_data.trial_period_days`, `success_url`, `cancel_url`, `metadata.user_id` (our user id). Return `session.url` to client.
- **Create Customer**: If user has no `stripe_customer_id`, create Stripe Customer with `email` and `metadata.user_id`; save `stripe_customer_id` in our DB.
- **Webhook handler**: 
  - **Endpoint**: e.g. `POST /webhooks/stripe`. 
  - **Verify**: Use `Stripe-Signature` header and `INTEGRATION_STRIPE_WEBHOOK_SECRET`; reject if invalid. 
  - **Idempotency**: Use event `id`; process each event id once (store processed ids in DB or Redis with TTL 24 h). 
  - **Events**: Handle `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`. Update our `subscriptions` table; set status and period dates. Record BFR-013: `trial_started` (subscription with trial), `trial_ended` (first invoice.paid after trial), `payment_success` (invoice.paid), `payment_failed` (invoice.payment_failed), `subscription_canceled` (subscription.deleted or cancel_at_period_end).
- **Customer Portal**: Create billing portal session (Stripe API); return URL to frontend so user can manage payment method and cancel.
- **Entitlement check**: On each request that needs premium, read subscription status from DB (or cache with short TTL). If status in [trialing, active, past_due] and now < current_period_end (and not canceled at period end), grant premium.

---

## 11. Webhook Verification (Stripe)

- **Secret**: `INTEGRATION_STRIPE_WEBHOOK_SECRET` = signing secret from Stripe Dashboard (Webhooks → Add endpoint → reveal signing secret). Different per endpoint (e.g. test vs live).
- **Verification**: Use official Stripe library (e.g. `stripe.webhooks.constructEvent(body, signature, secret)`). Throws if invalid; return 400. On success, return 200 quickly (process async if needed to avoid timeout).
- **Replay**: Stripe may retry; idempotent handling by event id prevents double application.

---

## 12. Required Credentials

| Credential | Purpose | Where | Frontend-safe? |
|------------|---------|--------|----------------|
| `INTEGRATION_STRIPE_SECRET_KEY` | Stripe API (create session, customer, portal) | Backend | No |
| `INTEGRATION_STRIPE_WEBHOOK_SECRET` | Verify webhook signature | Backend | No |
| `INTEGRATION_STRIPE_PUBLISHABLE_KEY` | Stripe Checkout/Elements (if needed in client) | Frontend build | Yes (by design) |

**Environments**: Use **test keys** (sk_test_, pk_test_, whsec_...) for dev/staging; **live keys** for production. Never mix.

---

## 13. Environment Variables

| Variable | Example | Required |
|----------|---------|----------|
| `INTEGRATION_STRIPE_SECRET_KEY` | sk_test_... or sk_live_... | Yes |
| `INTEGRATION_STRIPE_WEBHOOK_SECRET` | whsec_... | Yes |
| `INTEGRATION_STRIPE_PUBLISHABLE_KEY` | pk_test_... or pk_live_... | If client needs it |
| `STRIPE_PRICE_ID_MONTHLY` | price_xxx | Yes |
| `STRIPE_PRICE_ID_ANNUAL` | price_yyy | If annual |
| `STRIPE_TRIAL_DAYS` | 14 | Yes (config) |

---

## 14. Failed Payment Behavior

- **invoice.payment_failed**: Stripe retries per Smart Retries. We receive webhook; update status to `past_due` or keep `active` with dunning flag. Optionally notify user (email) to update payment method. Do not revoke access immediately (grace period e.g. 3–7 days). After final failure, Stripe may cancel subscription; we receive `customer.subscription.deleted`; revoke premium.
- **dunning**: Use Stripe Customer Portal for user to update card. Or send email with link to portal.

---

## 15. Cancellation and Grace Period

- **User cancels**: Set `cancel_at_period_end` via Stripe API or Portal. Entitlement remains until `current_period_end`; then webhook `subscription.deleted` or update; set status to canceled; revoke premium.
- **Grace**: If past_due, allow access until `current_period_end` or until Stripe cancels; document in product policy.

---

## 16. VAT / Invoice Considerations

- **Stripe Tax**: Can enable for EU VAT; Stripe calculates and adds tax. Invoices generated by Stripe; user can download from Portal.
- **Invoice**: Stripe sends `invoice.finalized` and `invoice.paid`; we do not need to store invoice PDF (Stripe hosts). For B2B or specific countries, configure Stripe Tax and receipt emails.

---

## 17. Example Webhook Payloads (Stripe)

**customer.subscription.updated** (excerpt):
```json
{
  "id": "evt_xxx",
  "type": "customer.subscription.updated",
  "data": {
    "object": {
      "id": "sub_xxx",
      "customer": "cus_xxx",
      "status": "active",
      "current_period_start": 1234567890,
      "current_period_end": 1234567890,
      "trial_end": null,
      "cancel_at_period_end": false,
      "metadata": { "user_id": "usr_our_id" }
    }
  }
}
```

**invoice.paid** (excerpt):
```json
{
  "type": "invoice.paid",
  "data": {
    "object": {
      "id": "in_xxx",
      "subscription": "sub_xxx",
      "billing_reason": "subscription_cycle" 
    }
  }
}
```

Backend: find our user by `metadata.user_id` or by Stripe customer id; upsert subscription; record `payment_success` or `trial_ended` for BFR-013.

---

## 18. Testing

- **Stripe test mode**: Use test keys; test cards (4242 4242 4242 4242). Create test checkout and complete; trigger webhooks via Stripe CLI (`stripe trigger customer.subscription.created`) or Dashboard.
- **Webhook replay**: Use Stripe CLI to forward webhooks to local backend (`stripe listen --forward-to localhost:3000/webhooks/stripe`). Verify idempotency (send same event twice; state correct once).
- **Contract**: Ensure our handler supports all event types we need; reject unknown types with 200 (to avoid Stripe retry) or process only known.

---

## 19. Rollout

- Launch with monthly + trial; add annual and discount later. Use Stripe test in staging; switch to live keys for production. Monitor webhook delivery in Stripe Dashboard; set alert on handler 5xx.

---

## 20. Risks and Open Questions

| Risk | Mitigation |
|------|------------|
| Webhook delay | Entitlement from DB; eventual consistency; show "Updating…" if needed |
| Webhook secret leak | Rotate in Stripe; update env; redeploy |
| Double charge | Stripe idempotency; we do not charge directly, only subscription lifecycle |
| VAT complexity | Use Stripe Tax; consult for multi-country |

**Open questions**: (1) Annual price and discount %. (2) Promo codes (Stripe Coupons). (3) Dunning email copy and grace period length.
