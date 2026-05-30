# Entitlements & Subscription — Deep-Dive Specification

## 1. Purpose

Entitlements & Subscription implement the freemium model: free vs premium access, trial, subscription management, and usage-based caps (lessons/day, scenarios/week). They gate premium features and drive conversion analytics (BFR-001–BFR-004, BFR-011, BFR-013). This spec covers FD-12: entitlement check, usage tracking, trial and payment webhooks, and integration with all gated features.

## 2. Core Concept

- **Entitlement**: Current access tier (free, trial, premium); determined by subscription status and trial status.
- **Usage**: Counts per user per period (e.g. lessons today, scenarios this week); compared to caps for free tier (BFR-011).
- **Gating**: Premium-only features (voice, pronunciation, full exam prep, unlimited lessons/scenarios) require entitlement check; free at cap gets 403 and upsell (FD12-FR-002, FD12-FR-003).
- **Trial**: Time-limited premium access (BFR-004); at end, revert to free unless converted (FD12-FR-004).
- **Conversion funnel**: Events trial_started, trial_ended, payment_success, churn for analytics (BFR-013).

## 3. Why This Feature Exists

- **Revenue (BFR-001–BFR-004, BFR-013)**: Subscription and trial are core revenue; conversion funnel enables optimization.
- **Fair access**: Free tier has defined limits; premium and trial get full access within fair use.

## 4. User / Business Problems Solved

- Users understand what is free vs paid; can start trial and subscribe.
- Business enforces gating and measures conversion and churn.

## 5. Scope

### 6. In Scope

- Expose current entitlement (free, trial, premium) and usage (e.g. lessons used today) to client (FD12-FR-001).
- Gate premium features by entitlement; trial treated as premium during trial period (FD12-FR-002).
- Enforce free-tier limits (lessons/day, scenarios/week) and return clear state for upsell (FD12-FR-003).
- Support trial start and end; sync with payment provider via webhooks (FD12-FR-004).
- Record conversion funnel events: trial_started, trial_ended, payment_success, churn (BFR-013) (FD12-FR-005).
- Payment provider integration: subscription create, cancel, webhooks for paid/renewed/cancelled/failed.
- Edge cases: webhook delay (eventual consistency); payment failed (retry, notify user); trial expired (revert at next check).

### 7. Out of Scope

- Payment UI (e.g. Stripe Checkout) — product decision; backend exposes “start trial” and “manage subscription” links or session URLs.
- Pricing and plan definitions (product/ops); this spec assumes plans exist and provider sends status.
- Refunds and invoicing details (handled by payment provider); backend only reacts to webhook state.

## 8. Main User Personas

- **Free user**: Uses app within caps; sees upsell when cap reached or when trying premium feature.
- **Trial user**: Full access for 7 or 14 days; then convert or revert to free.
- **Subscriber**: Premium; manages subscription (cancel, update payment).
- **Churned**: Cancelled; revert to free at period end or immediately per plan.

## 9. Main User Journeys

| Journey | Steps |
|--------|--------|
| **Check access** | App launch or feature tap → GET /entitlements → Client shows/hides premium or cap state. |
| **Start trial** | User taps “Start free trial” → Backend creates trial (and optionally payment intent for after trial) → Entitlement = trial until end date. |
| **Trial ends** | Webhook or cron: trial_ended → Entitlement = free; user sees “Trial ended” and upsell. |
| **Subscribe** | User completes payment (provider flow) → Webhook: payment_success → Entitlement = premium. |
| **Cap reached** | Free user starts lesson/scenario → Backend checks usage → 403 free_cap_reached → Client shows upsell or “Come back tomorrow.” |
| **Manage** | “Manage subscription” → Link to provider portal or in-app cancel; webhook on cancel → churn event; access until period end. |

## 10. Triggering Events / Inputs

- **App launch / feature access**: Client GET /entitlements (or GET /me with entitlement); cache with TTL (e.g. 5 min); use for gating and UI.
- **Usage increment**: Lesson complete (FD-02), scenario complete (FD-03) → Backend increments usage count for period (day/week); compare to cap before next start.
- **Trial start**: User action → POST /entitlements/trial/start (or provider flow that calls backend); set trial_ends_at; emit trial_started.
- **Webhooks**: Payment provider sends subscription.created, subscription.updated, subscription.deleted, invoice.paid, invoice.payment_failed; backend updates subscription state and entitlement; emit payment_success, churn, etc.
- **Trial end**: Scheduled job or webhook: if trial_ends_at < now and no conversion → set entitlement to free; emit trial_ended.
- **Cap check**: Before allowing new lesson (FD-02) or scenario (FD-03), backend checks usage vs cap; return 403 with reason and usage if at cap.

## 11. States / Lifecycle

- **Free**: No trial, no active subscription; subject to caps.
- **Trial**: trial_ends_at in future; same access as premium; at end → Free (or Premium if converted).
- **Premium**: Active subscription; full access within fair use.
- **Past due / Payment failed**: Optional state; restrict or warn; retry payment; eventually churn if not recovered.
- **Cancelled**: subscription_ends_at in future (access until end); then Free; churn event at end or at cancel.

## 12. Business Rules

- **BFR-001**: Freemium: free tier and premium tier.
- **BFR-002**: Premium-only features inaccessible to free unless in trial.
- **BFR-003**: Subscription-based premium (monthly; annual TBD).
- **BFR-004**: Time-limited trial (7 or 14 days TBD).
- **BFR-011**: Free-tier limits (e.g. 3–5 lessons/day, 1–2 scenarios/week); exact numbers product config.
- **BFR-013**: Conversion funnel events for analytics.
- **Trial**: One per user (or per product decision); idempotent start.
- **Webhook idempotency**: Same event (e.g. invoice.paid) may be sent twice; use idempotency key or event id to avoid double apply.
- **Cache**: Entitlement and usage can be cached (e.g. Redis) with short TTL; invalidate on webhook or usage increment.

## 13. Configuration Model

- **Caps**: lessons_per_day (e.g. 5), scenarios_per_week (e.g. 2); config or DB.
- **Trial duration**: 7 or 14 days; config.
- **Plans**: Plan ids and names from payment provider; map to entitlement (e.g. plan_X = premium).
- **Fair use**: Optional cap for premium (e.g. voice sessions per day) to control cost; config.
- **Webhook secrets**: Per provider; validate signature on webhook.

## 14. Data Model

- **subscriptions**: id, user_id, provider, provider_subscription_id, status (active|cancelled|past_due|trialing), plan_id, current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at. Or single row per user with latest state.
- **trials**: user_id, started_at, ends_at, converted (boolean); unique per user if one trial per user.
- **usage_counts**: user_id, period_key (e.g. 2025-03-14 for day, 2025-W11 for week), lessons_completed, scenarios_completed, voice_sessions (optional for fair use), updated_at. Composite unique (user_id, period_key).
- **entitlement_cache**: user_id, tier (free|trial|premium), trial_ends_at?, subscription_ends_at?, cached_at; optional Redis for fast read.
- **Conversion events**: event_id, user_id, event_type (trial_started, trial_ended, payment_started, payment_success, payment_failed, subscription_cancelled), payload (JSONB), created_at. For analytics (BFR-013).

## 15. Read Model / Projection Needs

- **Client**: GET /entitlements returns tier, trial_ends_at (if trial), usage (lessons_today, lessons_cap, scenarios_this_week, scenarios_cap), subscription_manage_url?.
- **Gating**: Each premium or cap-sensitive endpoint checks entitlement and usage; can use cached entitlement (short TTL) and fresh usage for cap.
- **Analytics**: Funnel events queried by event_type and date for conversion reports.

## 16. APIs / Contracts

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| GET | `/v1/entitlements` | Current entitlement and usage | — | 200 { tier, trial_ends_at?, usage: { lessons_today, lessons_cap, scenarios_week, scenarios_cap }, manage_url? } |
| GET | `/v1/entitlements/usage` | Detailed usage (optional) | — | 200 { lessons_today, scenarios_week, ... } |
| POST | `/v1/entitlements/trial/start` | Start trial | — | 200 { trial_ends_at }; 400 already used / invalid |
| GET | `/v1/entitlements/check` | Internal or client: can user do X? | Query: feature (lesson|scenario|voice|...) | 200 { allowed, reason? }; 403 { reason: "free_cap_reached" \| "not_entitled" } |
| (Webhook) | `/v1/webhooks/payments/:provider` | Payment provider webhooks | Provider payload + signature | 200 (processed); 401 invalid signature |

**Gating**: Premium endpoints (e.g. POST /voice/start, POST /conversation/start) call entitlement check; if free and at cap or not entitled, return 403 with body e.g. `{ "error": { "code": "free_cap_reached", "message": "..." } }` or `code: "not_entitled"`. Client uses for upsell UI.

## 17. Events / Async Flows

- **trial_started**: user_id, trial_ends_at (BFR-013).
- **trial_ended**: user_id (BFR-013).
- **payment_started**: user_id (e.g. user clicked subscribe) (BFR-013).
- **payment_success**: user_id, plan_id (BFR-013); backend updates subscription and entitlement.
- **payment_failed**: user_id (BFR-013); optional notify user.
- **subscription_cancelled**: user_id, ends_at (BFR-013); access until ends_at then churn.
- **Webhook**: Async from provider; backend processes and updates DB; may emit internal events for analytics pipeline.
- **Usage**: Incremented synchronously on lesson/scenario complete (or async queue); read for cap check.

## 18. UI / UX Design

- **Home / feature**: Show “Premium” badge or lock on premium features; show “3/5 lessons today” for free user; “Upgrade” or “Start trial” CTA.
- **Cap reached**: Modal or inline “You’ve reached your daily limit. Upgrade for unlimited or come back tomorrow.”
- **Trial**: “Your trial ends on [date]”; “Subscribe now” before end.
- **Manage**: “Manage subscription” opens provider portal or in-app cancel; “Your subscription ends on [date]” if cancelled.
- **Payment failed**: “Update payment method” link; optional email.

## 19. Main Screens / Components

- **EntitlementProvider**: Client context with tier and usage; children can show/hide premium or cap state.
- **PaywallModal / CapReachedModal**: Message and “Upgrade” / “Start trial” CTA.
- **TrialBanner**: “X days left in trial” and “Subscribe.”
- **Settings**: “Manage subscription” link; “Subscription: Premium until …” or “Free account.”

## 20. Permissions / Security Rules

- **Server**: All gating enforced server-side; client cannot bypass. Every premium and cap-sensitive action must check entitlement and usage.
- **Webhook**: Verify provider signature; idempotent processing; return 200 quickly and process in background if needed.
- **User scope**: User only sees own entitlement and usage; no other user’s subscription data.

## 21. Notifications / Alerts / Side Effects

- **Trial ending**: Optional push or email “Your trial ends in 2 days.”
- **Payment failed**: Optional email “Update your payment method.”
- **Churn**: Optional “We’re sorry to see you go” or win-back email; internal analytics.
- **Upsell**: In-app when cap reached or when user taps locked feature.

## 22. Integrations / Dependencies

- **Payment provider**: Stripe or equivalent; create checkout session for trial and subscription; webhooks for subscription and invoice events (Integrations doc).
- **FD-02, FD-03**: Increment usage on lesson/scenario complete; check cap before allowing start.
- **FD-04, FD-06, FD-07, FD-09 (premium)**: Check entitlement before allowing access; 403 if not entitled.
- **All gated features**: Call entitlement check (or middleware) on premium and cap-sensitive endpoints.

## 23. Edge Cases / Failure Cases

- **Webhook delay**: Entitlement may be eventually consistent; show “Updating…” or retry GET /entitlements after subscribe flow (FD-12).
- **Payment failed**: Retry (provider); notify user; optional grace period before revoking access.
- **Trial expired**: Next entitlement check returns free; client shows “Trial ended” and upsell.
- **Double webhook**: Idempotency key or event id; apply once.
- **Cache stale**: Short TTL (e.g. 5 min); invalidate on webhook and usage increment; 403 is safe (user may have just subscribed — ask to refresh).
- **Usage race**: Two requests at cap boundary; one allowed, one 403; or atomic increment-and-check to avoid over-allowing.

## 24. Non-Functional Requirements

- **Latency**: Entitlement check < 500ms (cache); NFR FD-12.
- **Webhook**: Idempotent and retry-safe; process within timeout (e.g. 30s); return 200 before heavy work if needed.
- **Availability**: Entitlement read critical for every request; cache and DB; payment provider outage does not block read (use last known state).

## 25. Analytics / Auditability Requirements

- **Events**: trial_started, trial_ended, payment_started, payment_success, payment_failed, subscription_cancelled (BFR-013). Include user_id, plan_id if applicable; for funnel and LTV.
- **Audit**: Subscription and trial state changes logged; webhook payloads stored or logged (no card data).

## 26. Testing Requirements

- Unit: Cap logic (at cap → not allowed); trial end date; tier derivation from subscription state.
- Integration: GET entitlements (free, trial, premium); POST trial/start; webhook handler (mock payload); usage increment and cap check; 403 when at cap and when not entitled.
- E2E: Start trial → see full access; expire trial (mock time or fixture) → see free and upsell; subscribe (test mode) → see premium.

## 27. Recommended Architecture

- **Entitlements service**: Owns subscriptions, trials, usage_counts; exposes GET /entitlements and GET /entitlements/usage; provides internal check(user_id, feature) for gating. Receives webhooks; updates state; emits funnel events. Other services (Lesson Engine, AI Conversation, Speech) call check() before allowing premium or cap-sensitive action, and increment usage after completion.
- **Cache**: Redis for entitlement (tier, trial_ends_at) with 5 min TTL; invalidate on webhook and trial/start.
- **Usage**: Increment in same transaction as completion (e.g. Lesson Engine updates progress and calls Entitlements.incrementUsage) or event-driven; read for cap in real time.

## 28. Recommended Technical Design

- **Check flow**: For “start lesson” (free user): get usage (lessons_today); if usage >= cap return 403 free_cap_reached; else allow and increment usage on completion. For “start voice”: get tier; if not trial/premium return 403 not_entitled.
- **Webhook**: Verify signature; parse event; update subscriptions/trials; invalidate cache; emit funnel event; return 200. Idempotency: store processed event id; skip if already processed.
- **Trial**: On start, set trials.ends_at = now + 7 days; set entitlement tier = trial until ends_at. On trial_ended (job or webhook), set tier = free; emit trial_ended.

## 29. Suggested Implementation Phasing

- **Phase 1**: GET /entitlements (tier from DB or hardcoded free); usage table and cap for lessons; gating on lesson start (FD-02) and scenario start (FD-03); 403 and upsell.
- **Phase 2**: Trial start (POST trial/start); trial_ends_at; tier = trial; trial end job; payment provider webhook (subscription created/updated); subscription state in DB.
- **Phase 3**: Full webhook set (cancel, payment_failed); funnel events (BFR-013); manage subscription link; cache and invalidation.

## 30. Summary

Entitlements & Subscription implement freemium: free with caps (lessons/day, scenarios/week), trial (time-limited premium), and premium (subscription). All premium and cap-sensitive flows check entitlement and usage server-side; 403 with clear reason (free_cap_reached, not_entitled) for client upsell. Payment provider webhooks update subscription state; trial and conversion events support analytics (BFR-013). Implementation must enforce gating server-side, handle webhooks idempotently, and keep entitlement read fast (cache) and consistent (invalidate on change).
