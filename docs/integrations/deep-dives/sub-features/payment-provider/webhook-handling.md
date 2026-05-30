# Payment Provider — Sub-Feature: Webhook Handling

**Parent**: [payment-provider.md](../../payment-provider.md)  
**Scope**: Receiving Stripe subscription and invoice events; verifying signature; idempotent processing; updating subscriptions table and entitlement cache; recording BFR-013 events.

---

## Purpose

Keep our subscription state in sync with Stripe. Stripe sends customer.subscription.* and invoice.* events to our POST /webhooks/stripe. We verify signature, process each event id once, update DB and cache, and return 200 quickly.

## Triggering

- **Stripe** sends POST to our endpoint (e.g. https://api.example.com/webhooks/stripe) with Stripe-Signature and raw body.
- **Events**: customer.subscription.created, customer.subscription.updated, customer.subscription.deleted, invoice.paid, invoice.payment_failed.

## Inputs / Outputs

- **Input**: Raw request body (JSON); Stripe-Signature header; STRIPE_WEBHOOK_SECRET in env.
- **Output**: 200 OK (always on success and after enqueue if async); 400 if signature invalid.

## Data

- **Processed events**: Store event id (e.g. evt_xxx) in Redis key webhook:stripe:processed:{id} with TTL 24h to enforce idempotency.
- **Downstream**: subscriptions table (upsert by stripe_subscription_id or user_id); entitlement cache (DEL entitlement:{user_id}); BFR-013 events (trial_started, trial_ended, payment_success, payment_failed, subscription_canceled).

## Auth & Verification

- **No Bearer auth**. Verify using Stripe SDK: stripe.webhooks.constructEvent(body, signature, secret). Throws if invalid → return 400 and do not process.
- **Secret**: STRIPE_WEBHOOK_SECRET (different per environment; Stripe Dashboard → Webhooks → endpoint → signing secret).

## Processing Logic (per event type)

- **subscription.created**: Upsert subscription (user from metadata.user_id or lookup by stripe_customer_id); status, trial_end, current_period_*. If status=trialing → BFR-013 trial_started.
- **subscription.updated**: Same upsert; if cancel_at_period_end set, store it; if status canceled → BFR-013 subscription_canceled.
- **subscription.deleted**: Mark subscription canceled or remove; revoke entitlement; BFR-013 subscription_canceled.
- **invoice.paid**: Update subscription current_period_* if needed; BFR-013 payment_success; if first invoice after trial → trial_ended.
- **invoice.payment_failed**: Optionally set past_due or dunning flag; BFR-013 payment_failed.

## Failure Handling

- **Invalid signature**: 400; log (no secret); do not process.
- **Duplicate event id**: Return 200; skip processing (idempotent).
- **Handler throws (e.g. DB down)**: If sync processing, return 500 so Stripe retries. If async (enqueue first), return 200 after enqueue; job retries internally; do not return 500.

## Local Dev

- Stripe CLI: `stripe listen --forward-to http://localhost:3000/webhooks/stripe`. Use the temporary signing secret printed by CLI in .env.local. Trigger: `stripe trigger customer.subscription.updated`, etc.

## Testing

- **Unit**: Verification rejects tampered body; accepts valid signature (with test secret and fixture). Idempotency: second request with same event id does not call handler.
- **Integration**: Send fixture webhook with valid signature; assert subscriptions row updated and cache invalidated; send same event again; assert no double update.
