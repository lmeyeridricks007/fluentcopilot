# Payment Provider — Sub-Feature: Entitlement Enforcement

**Parent**: [payment-provider.md](../../payment-provider.md)  
**Scope**: Using subscription state to grant or deny premium access; cache and invalidation; API and UI gating.

---

## Purpose

Gate premium features (voice tutor, unlimited lessons, scenarios, exam prep, daily reflection) on subscription/trial state. Entitlement is derived from subscriptions table (and optional trials table); cached in Redis for low latency; invalidated on webhook and trial start.

## Triggering

- **Read path**: GET /v1/entitlements (user-facing); internal checks before POST /voice/start, POST /conversation/start, lesson cap check, etc.
- **Invalidation**: Payment webhook handler and POST /v1/entitlements/trial/start call entitlement cache invalidate (DEL entitlement:{user_id}).

## Inputs / Outputs

- **Input**: user_id (from auth context). Optional: request context (e.g. lesson_id for cap check).
- **Output**: { tier: 'free' | 'trial' | 'premium', subscription_ends_at?, trial_ends_at?, manage_url?, usage?: { lessons_today, lessons_limit, scenarios_today, scenarios_limit } }. For internal cap check: boolean allowed and optional reason (e.g. free_cap_reached).

## Data

- **Source**: subscriptions table (user_id, status, current_period_end, trial_end, cancel_at_period_end); usage_counts (lessons_today, scenarios_today, limits from tier).
- **Cache**: Redis key entitlement:{user_id}, value JSON-serialized entitlement object; TTL 300s. On cache miss: query DB, compute tier and usage, SET cache, return.

## Tier Rules

- **free**: No active subscription; usage within free cap (e.g. 5 lessons/day).
- **trial**: subscription.status = trialing and now < trial_end; same access as premium; usage counted.
- **premium**: subscription.status in (active, past_due) and now < current_period_end and not cancel_at_period_end; unlimited (or high cap).
- **Expired**: current_period_end in past or status canceled → tier = free.

## Invalidation

- **Webhook**: After updating subscriptions row, DEL entitlement:{user_id}.
- **Trial start**: After creating trial or subscription with trial, DEL entitlement:{user_id}.
- **Explicit**: Optional admin “refresh entitlement” for user (support).

## Failure Handling

- **Redis down**: Fallback to DB read every time (slower); do not block access.
- **DB down**: Return 503 for GET /entitlements; internal checks can fail closed (deny premium) or 503 depending on policy.

## Local Dev

- Redis for cache; same as prod. Seed subscription rows for test users (trialing, active) to test tier responses. Mock or real Stripe webhook to test invalidation.

## Testing

- **Unit**: Mock cache and DB; assert tier = premium when subscription active; tier = free when no subscription; cache hit returns without DB call; invalidate clears cache.
- **Integration**: Create subscription via webhook fixture; GET /entitlements returns premium; invalidate; next GET refetches from DB and returns same (cache repopulated). Cap: free user at limit → 403 free_cap_reached.
