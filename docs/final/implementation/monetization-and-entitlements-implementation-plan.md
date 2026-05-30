# Monetization and Entitlements Implementation Plan

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

This document defines **billing rollout** and **entitlement enforcement**: subscription and trial flow, caps for free tier, entitlement checks, upsell and paywall, and integration with Stripe and product analytics.

---

## 2. Scope

- **In scope**: Stripe product/price setup; checkout and return flow; webhook handling; entitlement service; usage caps; gating (backend and frontend); upsell and paywall UI; funnel events.
- **Out of scope**: Pricing strategy (product decision); invoicing and VAT details (Stripe and legal); referral and discount codes (Phase E).

---

## 3. Assumptions

- Freemium: free tier with caps (e.g. lessons per day, scenarios per week); premium = no caps and full access (voice, pronunciation, unlimited scenarios).
- Stripe handles payment and subscription lifecycle; backend stores subscription state and enforces caps.
- Trial: 7 or 14 days (open decision); trial counts as "entitled" for the period.
- No one-off purchases in Phase D; subscription only.

---

## 3a. Demo / Try Premium (Pre-Backend)

**Requirement**: Before Stripe and the entitlement backend exist, users must be able to **sign up for premium** and **try premium features** in the app (e.g. for demos, user testing, or development).

| Item | Implementation |
|------|----------------|
| **Sign-up** | Premium upsell page offers "Try premium free (demo)" and plan "Select" buttons that set entitlement to premium locally (e.g. `premiumStore.setPremium(true)`). |
| **Persistence** | Premium state is persisted (e.g. `localStorage`) so that demo subscription survives page refresh. |
| **Try features** | Once premium, user can access Voice tutor, unlocked lessons, exam prep sections, and any other premium-gated content. |
| **Settings** | Settings shows current plan (Free / Premium). Free users see "Upgrade to Premium"; premium users see "You're on Premium" and "End premium demo" to clear local state. |
| **Transition** | When backend checkout and entitlement API exist, replace demo flow: "Try premium free (demo)" and "Select" trigger real checkout; entitlement is read from API; remove or hide "End premium demo" and use "Manage subscription" → Stripe portal. |

Frontend must not block trying premium; the demo path is the default until backend is live.

---

## 4. Subscription and Trial Flow

| Step | Implementation |
|------|----------------|
| 1 | User taps "Start trial" or "Subscribe" (e.g. from upsell or settings) |
| 2 | Frontend calls backend: POST /v1/checkout/session (or similar) with price_id, success_url, cancel_url |
| 3 | Backend creates Stripe Checkout Session (mode: subscription; trial_period_days if trial); returns session.url |
| 4 | Frontend redirects to session.url; user completes payment or trial signup on Stripe |
| 5 | Stripe redirects to success_url (e.g. /settings?subscription=success); frontend shows confirmation and refreshes entitlement |
| 6 | Stripe sends webhook: checkout.session.completed, customer.subscription.created/updated/deleted |
| 7 | Backend handles webhook: upsert subscriptions table; set trial_ends_at, current_period_end, status |
| 8 | Entitlement service reads from subscriptions: if status active or trialing and (trial_ends_at > now or current_period_end > now), user is entitled |

Trial end: Stripe sends subscription.updated when trial ends; if no payment method or payment fails, status becomes past_due or canceled; backend reflects that and user loses premium.

---

## 5. Entitlement Service

| Responsibility | Implementation |
|----------------|----------------|
| **Source of truth** | subscriptions table (user_id, stripe_subscription_id, status, trial_ends_at, current_period_end, ...) |
| **Check** | getEntitlement(user_id): return { plan: 'free' | 'premium', status, trial_ends_at, caps } |
| **Usage** | usage table or counters: user_id, period_start (day or week), lesson_count, scenario_count; increment on use; reset by cron or on period boundary |
| **Cap check** | For free user: if lesson_count >= daily_cap or scenario_count >= weekly_cap, return not entitled or cap_reached |
| **Caching** | Cache entitlement per user (e.g. Redis, TTL 5 min) to avoid DB hit every request; invalidate on webhook |
| **Middleware** | For premium-only endpoints: if not entitled, return 403 { reason: 'subscription_required' } or { reason: 'free_cap_reached' } |

Reference: backend-implementation-plan (Entitlement Service); docs/final/integrations/payments-subscriptions.md.

---

## 6. Usage Caps (Free Tier)

| Resource | Cap (example) | Enforcement |
|----------|----------------|--------------|
| Lessons per day | 3 or 5 | Increment on lesson complete; check before allowing next lesson |
| Scenarios per week | 3 or 5 | Increment on scenario start or end; check before allowing new scenario |
| Voice sessions | 0 (premium only) or 1/week | Same as scenarios |
| Pronunciation | Premium only | Check entitlement for pronunciation endpoint |

Exact numbers are product decision; implement as config (env or DB) so they can change without code deploy.

---

## 7. Entitlement Gating (Backend)

| Endpoint / action | Check |
|-------------------|--------|
| POST /v1/conversation/start | Free: scenario count this week < cap; Premium: allow |
| POST /v1/voice/start | Free: 403 subscription_required (or cap if voice has free cap); Premium: allow |
| POST /v1/pronunciation/analyze | Premium only: 403 if not entitled |
| GET /v1/lessons (or lesson complete) | Free: lesson count today < cap; Premium: allow |
| GET /v1/entitlements, GET /v1/entitlements/usage | All; return plan, status, usage, caps |

Return 403 with body { error: { code: 'subscription_required' | 'free_cap_reached', message: '...' } } so frontend can show upsell.

---

## 8. Entitlement Gating (Frontend)

| Pattern | Implementation |
|---------|----------------|
| **Gate component** | useEntitlement(); if free and cap_reached or premium feature, show upsell modal instead of starting flow |
| **Upsell modal** | Copy: "You've reached your daily limit" or "Unlock voice tutor"; CTA: "Start free trial" → redirect to checkout |
| **Settings** | Show plan name and status; "Manage subscription" → Stripe customer portal link (backend generates link) |
| **Post-payment** | On return from Stripe success_url, refetch entitlement and show "You're now premium" or "Trial started" |

Do not rely on frontend only; backend must enforce so that API cannot be bypassed.

---

## 9. Upsell and Paywall UI

| Location | When to show |
|----------|----------------|
| **After cap** | User completes last free lesson or scenario; next action shows modal: "Upgrade to continue" |
| **Feature tap** | User taps "Voice tutor" or "Pronunciation" as free user; show modal before starting |
| **In-app** | Optional: banner or inline CTA on home or practice hub for free users |
| **Settings** | "Upgrade" or "Start trial" button; "Manage subscription" when subscribed |

Copy and design: product/UX; implementation: frontend (modal, CTA, redirect to backend checkout session).

---

## 10. Funnel Events

| Event | When | Owner |
|-------|------|--------|
| upsell_viewed | Paywall or gate modal shown | Frontend |
| upsell_clicked | User clicked CTA | Frontend |
| trial_started | Stripe subscription created with trial | Backend (webhook) |
| payment_success | First successful paid invoice | Backend (webhook) |
| subscription_cancelled | Cancellation or churn | Backend (webhook) |

Use for funnel dashboard and conversion analysis (see analytics-and-observability-implementation-plan).

---

## 11. Stripe Product/Price Setup

| Item | Action |
|------|--------|
| **Product** | e.g. "AI Dutch Coach Premium" |
| **Prices** | Monthly and/or yearly; create in Stripe dashboard; copy price_id to env or config |
| **Trial** | Set trial_period_days when creating Checkout Session (7 or 14 per decision) |
| **Webhook** | Endpoint URL (e.g. https://api.example.com/webhooks/stripe); events: checkout.session.completed, customer.subscription.*, invoice.paid |
| **Customer portal** | Enable in Stripe; backend generates link with Stripe API for "Manage subscription" |

---

## 12. Failed Payment and Dunning

| Scenario | Implementation |
|----------|----------------|
| Trial ends, payment fails | Stripe sends subscription.updated (status past_due or unpaid); backend updates; user sees "Update payment" in settings; restrict premium until paid |
| Retry | Stripe retries; webhook on success; backend updates status to active |
| Cancel after retries | Stripe sends subscription.deleted or status canceled; backend updates; user reverts to free |
| Grace period | Optional: allow N days of access after trial end before hard gate; configurable |

---

## 13. Dependencies

- **Integrations**: Stripe (integrations-implementation-plan, payments-subscriptions spec).
- **Backend**: Entitlement service and webhook (backend-implementation-plan).
- **Frontend**: Gating and upsell UI (frontend-implementation-plan).
- **Data**: subscriptions and usage tables (data-and-content-implementation-plan).
- **Analytics**: Funnel events (analytics-and-observability-implementation-plan).

---

## 14. Risks

- **Webhook missed**: Stripe retries; monitor delivery; idempotent handler; alert on 5xx.
- **Wrong entitlement**: Test thoroughly; verify subscription state after each webhook event; manual check before launch.
- **Cap bypass**: Always enforce on backend; never trust frontend-only hide.

---

## 15. Readiness and Done Criteria

- **Phase D**: Stripe Checkout and webhook working; entitlement service and usage caps implemented; backend gates return 403 with reason; frontend shows upsell and post-payment state; funnel events sent; trial and paid flow tested in test mode.
- **Launch**: Live Stripe keys; webhook URL production; one successful test purchase and cancellation in prod (or documented waiver).
