# Entitlements & Subscription — Per-Feature Integration Specification

**Feature**: FD-12 Entitlements & Subscription  
**Source**: docs/final/feature-domain-breakdown.md §14; docs/features/deep-dives/entitlements-and-subscription.md

---

## 1. Purpose

This document specifies **which integrations the Entitlements & Subscription feature uses** and **how**: payment provider (Stripe) for checkout and portal, webhook processing for subscription state sync, cache (Redis) for fast entitlement reads, optional email for receipts and trial reminder, analytics for conversion (BFR-013), and observability. It enables implementers to wire the full entitlement and payment flow and operate it in local, staging, and production.

---

## 2. Feature Reference

- **Domain**: FD-12 Entitlements & Subscription
- **User goal**: Understand free vs. premium; start trial; subscribe; manage subscription.
- **Business goal**: Revenue (BFR-001–BFR-004, BFR-013); enforce gating (BFR-002).
- **Integration dependencies** (from feature-domain-breakdown): Payment provider (Stripe or equivalent); webhooks (Integrations doc).

---

## 3. Integrations Used (Summary)

| Integration | Role in Entitlements & Subscription | Criticality |
|-------------|--------------------------------------|-------------|
| **Payment (Stripe)** | Checkout session (trial/subscribe); customer portal (manage); subscription state source of truth | Critical |
| **Webhook processing** | Receive Stripe events; verify signature; idempotent update of subscriptions table and entitlement cache; BFR-013 events | Critical |
| **Cache (Redis)** | Entitlement cache (tier, usage) for fast GET /entitlements and per-request gating; invalidate on webhook and trial/start | Critical |
| **Email** | Optional: verification (auth); receipts (invoice.paid); trial-ending reminder | High (optional) |
| **Analytics** | trial_started, trial_ended, payment_success, payment_failed, subscription_cancelled (BFR-013) | Critical |
| **Observability** | Errors, health; webhook handler and entitlement check latency and failures | High |

---

## 4. Per-Integration Detail

### 4.1 Payment Provider (Stripe)

- **Why this feature needs it**: Users start trial or subscribe via Stripe Checkout; users manage subscription (payment method, cancel) via Stripe Customer Portal. Subscription state in Stripe is source of truth; we project it into our DB via webhooks.
- **Data flow**: **Checkout**: Client calls our POST /v1/checkout/session (price_id, trial_days?); backend creates or fetches Stripe Customer, creates Checkout Session with trial_period_days, success_url, cancel_url; returns checkout_url; client redirects. **Portal**: Client calls our GET or POST /v1/entitlements/portal-session; backend creates Stripe Billing Portal session; returns url; client opens. No card data in our backend. See [payment-provider.md](../../payment-provider.md) and sub-features checkout-flow, entitlement-enforcement.
- **Triggering**: User taps “Start trial” or “Upgrade” → checkout. User taps “Manage subscription” → portal.
- **Auth**: Our API: authenticated user; Stripe API: backend secret key (env). Webhook: signature verification only (no session).
- **Failure**: Stripe 5xx → retry once; return 503 to client. See [payment-provider.md](../../payment-provider.md) § Failure Handling.
- **Local**: Stripe test keys; test card 4242…; success/cancel URLs to localhost. See [payment-provider.md](../../payment-provider.md) § Local Development Setup.
- **Observability**: Checkout session creation count; Stripe API errors; webhook delivery (Stripe Dashboard). See main deep-dive.
- **Reference**: [payment-provider.md](../../payment-provider.md), [sub-features/payment-provider/checkout-flow.md](../../sub-features/payment-provider/checkout-flow.md), [sub-features/payment-provider/entitlement-enforcement.md](../../sub-features/payment-provider/entitlement-enforcement.md)

### 4.2 Webhook Processing

- **Why this feature needs it**: Stripe sends subscription and invoice events; we must update our subscriptions table and entitlement cache so GET /entitlements and all gating (Core Lessons, Scenarios, Voice, etc.) reflect current state. BFR-013 conversion events are emitted from webhook handler.
- **Data flow**: POST /webhooks/stripe (raw body, Stripe-Signature). Backend verifies signature; parses event; idempotency check (event id); dispatches by type (subscription.created/updated/deleted, invoice.paid, invoice.payment_failed). Handler updates subscriptions row (and optional trials); DEL entitlement:{user_id}; records BFR-013 (trial_started, trial_ended, payment_success, payment_failed, subscription_canceled); returns 200. See [webhook-processing.md](../../webhook-processing.md), [sub-features/payment-provider/webhook-handling.md](../../sub-features/payment-provider/webhook-handling.md).
- **Triggering**: Stripe sends events asynchronously after user completes checkout, trial ends, payment fails, user cancels, etc.
- **Auth**: Signature verification with STRIPE_WEBHOOK_SECRET; no session.
- **Failure**: Invalid signature → 400. Processing error → 500 so Stripe retries, or 200 after enqueue and job retries. Duplicate event → 200, skip (idempotent). See [webhook-processing.md](../../webhook-processing.md) § Failure Handling.
- **Local**: Stripe CLI `stripe listen --forward-to localhost:PORT/webhooks/stripe`; use CLI signing secret in .env. Trigger with `stripe trigger customer.subscription.updated` etc. See [webhook-processing.md](../../webhook-processing.md) § Local Development Setup.
- **Observability**: Webhook received/processed count by type; verification failures; processing errors; queue depth if async. See main deep-dive.
- **Reference**: [webhook-processing.md](../../webhook-processing.md), [sub-features/payment-provider/webhook-handling.md](../../sub-features/payment-provider/webhook-handling.md)

### 4.3 Cache (Redis)

- **Why this feature needs it**: GET /entitlements and every feature’s gate (lesson cap, scenario cap, voice access) need fast tier and usage. Redis caches entitlement by user_id with TTL; invalidated on webhook and on trial/start so next read is fresh.
- **Data flow**: GET /entitlements: read entitlement:{user_id} from Redis; on miss, load from DB (subscriptions, usage_counts), SET with TTL (e.g. 300s), return. On webhook or trial/start: DEL entitlement:{user_id}. See [cache-session-store.md](../../cache-session-store.md), [sub-features/payment-provider/entitlement-enforcement.md](../../sub-features/payment-provider/entitlement-enforcement.md).
- **Triggering**: Every GET /entitlements; every feature gate (internal read). Invalidation: every webhook handler and POST /v1/entitlements/trial/start.
- **Auth**: Request auth for GET /entitlements; Redis connection (REDIS_URL) for backend.
- **Failure**: Redis down → fallback to DB for read (slower); invalidation skipped (stale until TTL). See [cache-session-store.md](../../cache-session-store.md) § Failure Handling.
- **Local**: Redis in Docker or local. See [cache-session-store.md](../../cache-session-store.md) § Local Development Setup.
- **Observability**: Cache hit rate; entitlement check latency. See main deep-dive.
- **Reference**: [cache-session-store.md](../../cache-session-store.md), [sub-features/payment-provider/entitlement-enforcement.md](../../sub-features/payment-provider/entitlement-enforcement.md)

### 4.4 Email (Optional)

- **Why this feature needs it**: Verification and password reset (auth); optional subscription receipts (invoice.paid) and trial-ending reminder (scheduled job).
- **Data flow**: Receipts: from webhook handler on invoice.paid, enqueue send receipt email (template, user email, amount, date). Trial reminder: cron/job finds users with trial_ends_at = tomorrow; enqueue send trial_ending email. See [email-provider.md](../../email-provider.md).
- **Triggering**: Webhook (receipt) or scheduled job (trial reminder). Not required for core entitlement flow.
- **Auth**: Backend email API key. No user auth for send (triggered by system).
- **Failure**: Email send failure → job retry; do not block webhook or entitlement. See [email-provider.md](../../email-provider.md).
- **Local**: Mock email adapter (log or capture). See [email-provider.md](../../email-provider.md).
- **Reference**: [email-provider.md](../../email-provider.md)

### 4.5 Analytics

- **Why this feature needs it**: BFR-013 conversion funnel: trial_started, trial_ended, payment_success, payment_failed, subscription_canceled. Must be emitted from backend (webhook or trial/start) so funnel is accurate.
- **Data flow**: Webhook handler (or job) calls AnalyticsAdapter.track(event, { user_id, plan, amount?, ... }). Fire-and-forget. See [analytics-provider.md](../../analytics-provider.md).
- **Triggering**: On subscription.created (trial_started if trialing), invoice.paid (payment_success; trial_ended if first after trial), invoice.payment_failed (payment_failed), subscription.deleted or cancel_at_period_end (subscription_canceled). Also on POST /v1/entitlements/trial/start (trial_started).
- **Auth**: Backend analytics key; user_id from our context.
- **Failure**: Must not block webhook or API; log and optional retry. See [analytics-provider.md](../../analytics-provider.md).
- **Local**: Mock or disable. See [analytics-provider.md](../../analytics-provider.md).
- **Reference**: [analytics-provider.md](../../analytics-provider.md)

### 4.6 Observability

- **Why this feature needs it**: Webhook handler and entitlement checks must be monitored; errors and latency affect revenue and user experience.
- **Data flow**: Sentry for handler and API errors; structured logs with request_id; health check (Redis, DB). See [observability-monitoring.md](../../observability-monitoring.md).
- **Triggering**: Every 5xx and 4xx; every request (log); GET /health/ready.
- **Reference**: [observability-monitoring.md](../../observability-monitoring.md)

---

## 5. Implementation Implications

- **Backend services**: Entitlements service (tier, usage, cap logic); Payment service (Stripe adapter: checkout, portal, customer); Webhook controller (verify, dispatch, handlers). All use Cache and DB.
- **Jobs/workers**: Optional: webhook processing async (enqueue after verify); email send (receipt, trial reminder). Trial-expiry job (mark trial ended, sync state) if not fully driven by Stripe.
- **DB tables**: subscriptions (user_id, stripe_customer_id, stripe_subscription_id, status, current_period_end, trial_end, cancel_at_period_end); usage_counts (lessons_today, scenarios_used_this_week, limits); optional trials table; processed_webhook_events or Redis for idempotency.
- **UI**: Entitlement display (tier, usage, manage_url); “Upgrade” / “Start trial” (→ checkout); “Manage subscription” (→ portal); cap-reached modals (delegated to other features); “Updating…” if webhook delay.
- **Admin/config**: Stripe price ids, trial days, success/cancel/portal URLs; feature flags for trial duration or paywall copy.
- **Monitoring**: Webhook received/processed/failed; entitlement check latency and cache hit rate; checkout and portal creation; BFR-013 event count.
- **Seed/demo data**: Test users: free, trialing, premium, past_due, canceled; Stripe test mode; webhook fixtures for integration tests.
- **Testing**: Unit: cap logic; cache invalidation. Integration: checkout → complete with test card → webhook → entitlement updated; idempotency (duplicate event); GET /entitlements returns correct tier. E2E: upgrade flow; manage subscription. Mock: Stripe (checkout URL), webhook (fixture), analytics.

---

## 6. Summary

Entitlements & Subscription depends on **Payment (Stripe)** for checkout and portal, **Webhook** for state sync and BFR-013, **Cache** for fast entitlement reads and invalidation, optional **Email** for receipts and trial reminder, **Analytics** for conversion events, and **Observability** for errors and health. Full adapter and provider detail is in the main integration deep-dives and payment sub-features referenced above.
