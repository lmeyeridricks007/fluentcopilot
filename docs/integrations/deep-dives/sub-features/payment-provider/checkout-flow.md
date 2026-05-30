# Payment Provider — Sub-Feature: Checkout Flow

**Parent**: [payment-provider.md](../../payment-provider.md)  
**Scope**: Creating Stripe Checkout Session and redirecting user to Stripe Hosted Checkout for subscription (with optional trial).

---

## Purpose

Enable user to start a subscription or trial by redirecting to Stripe Checkout. Backend creates a Checkout Session (customer, price, trial_period_days, success/cancel URLs); client redirects to session.url. No card data touches our backend.

## Triggering

- **Entry**: User taps “Start trial” or “Upgrade” in app.
- **Client**: POST /v1/checkout/session { price_id, trial_days? } (auth required).
- **Backend**: Resolve or create Stripe Customer (by user_id); create Checkout Session with subscription_data.trial_period_days, success_url, cancel_url, metadata.user_id; return { checkout_url }.
- **Client**: Redirect to checkout_url (Stripe Hosted Checkout).
- **Return**: Stripe redirects to success_url or cancel_url; client refetches entitlement.

## Inputs / Outputs

- **Input**: price_id (required), trial_days (optional, default from config). Auth: user_id from session.
- **Output**: { checkout_url: string }. Errors: 400 (invalid price_id), 503 (Stripe API failure).

## Data

- **Our DB**: stripe_customer_id on user or subscriptions; used to reuse customer for future sessions.
- **Stripe**: Customer (if new), Checkout Session (ephemeral); no card stored by us.

## Auth & Config

- **Backend**: STRIPE_SECRET_KEY; STRIPE_PRICE_ID_MONTHLY (and optional STRIPE_PRICE_ID_ANNUAL); STRIPE_TRIAL_DAYS; CHECKOUT_SUCCESS_URL, CHECKOUT_CANCEL_URL.
- **Idempotency**: Not required for session creation (each click = new session); optional idempotency key if we want to reuse same session for same user/price within a window.

## Failure Handling

- **Stripe 5xx**: Retry once (2s); return 503 “Payment service temporarily unavailable.”
- **Invalid price_id**: 400.
- **Customer create failure**: Retry once; then 503.

## Local Dev

- Use Stripe test keys; test card 4242 4242 4242 4242. success_url/cancel_url point to localhost (e.g. http://localhost:3000/settings?checkout=success).

## Testing

- **Unit**: Mock Stripe client; assert createCheckoutSession called with correct params (customer or customer_email, price_id, trial_period_days).
- **Integration**: With test key, create session, assert checkout_url present; redirect and complete with test card; webhook will update subscription (separate test).
