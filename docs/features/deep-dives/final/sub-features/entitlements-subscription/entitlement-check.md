# Sub-Feature: Entitlement Check

**Feature**: Entitlements & Subscription (FD-12)  
**Sub-feature**: entitlement-check

---

## 1. Purpose

Resolve the current user’s access tier (free, trial, premium) and optional trial/subscription end dates so the client and other services can gate features and show correct UI (upsell, “Manage subscription,” usage).

---

## 2. Core Concept

- **Tier**: free | trial | premium. Derived from subscriptions (active, cancelled, past_due) and trials (started_at, ends_at, converted). Trial and premium get full access; free is subject to caps.
- **Exposure**: GET /entitlements (or GET /me with entitlement) returns tier, trial_ends_at (if trial), usage (lessons_today, lessons_cap, etc.), optional manage_url. Cached with short TTL (e.g. 5 min); invalidated on webhook or trial/start.
- **Internal check**: Other endpoints (e.g. GET /lessons/:id for start, POST /voice/start) call internal entitlement check before allowing access; return 403 not_entitled or free_cap_reached.

---

## 3. User Problems Solved

- Client shows correct UI: lock premium features for free; show “Trial ends in X days” for trial; show “Manage subscription” for premium.
- Backend gates premium and cap-sensitive actions consistently.

---

## 4. Trigger Conditions

- Client: app launch or before accessing premium feature; GET /entitlements.
- Backend: any premium or cap-sensitive endpoint (e.g. voice start, scenario start, lesson start when at cap) calls check(user_id, feature).

---

## 5. Inputs

- **GET /entitlements**: user_id from auth; no body.
- **Internal check**: user_id, feature (e.g. "lesson_start", "voice", "scenario"). Optional: lesson_id or context for cap.

---

## 6. Outputs

- **GET /entitlements 200**: { tier, trial_ends_at?, subscription_ends_at?, usage: { lessons_today, lessons_cap, scenarios_week, scenarios_cap }, manage_url? }.
- **Internal check**: { allowed: true } or { allowed: false, reason: "not_entitled" | "free_cap_reached", usage? }.

---

## 7. Workflow / Lifecycle

1. **Read tier**: From subscriptions (latest by user_id) and trials. If subscription status=active and current_period_end > now → premium. Else if trial.ends_at > now and not converted → trial. Else → free.
2. **Read usage**: From usage_counts for user and current period(s). Merge with cap config (lessons_cap, scenarios_cap).
3. **Cache**: Store (user_id → entitlement payload) in Redis with TTL 5 min. On webhook (subscription updated) or POST trial/start, invalidate cache for user_id.
4. **Return**: Tier, optional dates, usage, manage_url (from payment provider).

---

## 8. Business Rules

- BFR-001: Freemium (free and premium). BFR-002: Premium-only features gated. BFR-003: Subscription-based premium. BFR-004: Trial time-limited.
- Trial and premium treated same for feature access during trial/active period.
- Cache invalidation: on subscription change (webhook), trial start, trial end (job), so client sees updated tier within TTL or on next request.

---

## 9. Configuration Model

- **tier.from_subscription**: Map provider plan_id to tier (e.g. plan_xxx = premium).
- **tier.from_trial**: trial.ends_at > now → tier = trial.
- **cache.ttl_seconds**: 300 (5 min).
- **manage_url**: Link to payment provider customer portal; from config or provider API.

---

## 10. Data Model

**Read from**:

- **subscriptions**: user_id, status, plan_id, current_period_end, cancel_at_period_end. Latest row or single row per user.
- **trials**: user_id, started_at, ends_at, converted. Single row per user if one trial per user.
- **usage_counts**: user_id, period_key, lessons_completed_count, scenarios_completed_count (if applicable). For usage and cap.
- **Config**: lessons_cap, scenarios_cap per period.

**Cache**: Redis key entitlements:{user_id}, value JSON { tier, trial_ends_at, usage, ... }, TTL 300.

---

## 11. API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /v1/entitlements | Current entitlement and usage for authenticated user. |

**Example response** (200):

```json
{
  "tier": "free",
  "trial_ends_at": null,
  "subscription_ends_at": null,
  "usage": {
    "lessons_today": 3,
    "lessons_cap": 5,
    "scenarios_week": 1,
    "scenarios_cap": 2
  },
  "manage_url": null
}
```

**Example** (trial): tier="trial", trial_ends_at="2025-03-21T00:00:00Z". **Example** (premium): tier="premium", manage_url="https://billing.example.com/portal".

---

## 12. Events Produced

- None directly. Downstream of subscription/trial state. Optional: entitlement_check analytics event (user_id, tier) for funnel.

---

## 13. Events Consumed

- **Webhook**: subscription.updated, subscription.deleted → invalidate cache for user_id.
- **Trial start**: POST /entitlements/trial/start → invalidate cache.
- **Trial end job**: When trial.ends_at < now → update tier to free; invalidate cache.

---

## 14. Integrations

- **Payment provider**: Read subscription state (from webhook-updated DB); optional manage_url from provider API.
- **Usage**: Read usage_counts (or from Entitlements service). Cap config from config/DB.
- **All gated features**: Call check(user_id, feature) or read from cache before allowing access.

---

## 15. UI Components

- **EntitlementProvider**: Client-side context that holds tier and usage; children can show/hide premium or cap state.
- **PaywallModal**: Shown when 403 not_entitled; “Upgrade to unlock.”
- **TrialBanner**: “X days left in trial” when tier=trial; “Subscribe” CTA.
- **UsageIndicator**: “3/5 lessons today” from usage.

---

## 16. UI Screens

- No dedicated screen; data consumed by Home, Learn, Settings (subscription section), and modals.

---

## 17. Permissions & Security

- Authenticated only; user sees only own entitlement. No other user’s tier or subscription data.
- Internal check used only by backend; never expose internal API to client.

---

## 18. Error Handling

- Cache miss: read from DB; populate cache; return.
- DB error: 500; do not return stale cache for tier (or return stale with warning header; product decision).
- Missing subscription/trial row: tier = free.

---

## 19. Edge Cases

- **Webhook delay**: Tier may be eventually consistent; client refetches after subscribe flow; show “Updating…” if needed.
- **Trial just ended**: Job or next check sets tier=free; cache invalidated; client GET /entitlements sees free on next request.
- **Multiple subscriptions**: Use latest or active; product rule.

---

## 20. Performance Considerations

- Cache first; TTL 5 min. Avoid DB read on every request. Invalidate on write (webhook, trial start).
- Single key per user: entitlements:{user_id}. Small payload (< 1KB).

---

## 21. Observability

- Log: cache hit/miss, tier resolved. Metric: entitlement_checks_total, entitlement_cache_hit_rate.
- No PII in logs (user_id hash or request_id only).

---

## 22. Example Scenarios

**Scenario A**: Free user. GET /entitlements → tier=free, usage=3/5 lessons, no trial_ends_at. **Scenario B**: User just started trial. POST trial/start → cache invalidated. GET /entitlements → tier=trial, trial_ends_at in 7 days. **Scenario C**: Premium. GET /entitlements → tier=premium, manage_url set.

---

## 23. Implementation Notes

- **Backend**: Entitlements service or module; GET /entitlements reads cache or DB; writes to cache. Internal check(user_id, feature) same logic; for "lesson_start" also compare usage to cap.
- **Database**: subscriptions, trials, usage_counts. Index by user_id.
- **Redis**: Cache layer; invalidation on webhook and trial/start.
- **Frontend**: Fetch on app load; store in context; refetch after subscribe or “Refresh” in Settings.

---

## 24. Testing Requirements

- **Unit**: Tier derivation (subscription active → premium; trial ends_at > now → trial; else free). Cache set/get and invalidation.
- **Integration**: GET /entitlements returns correct tier and usage; cache hit returns same; after webhook mock, cache invalidated and next GET returns new tier.
- **E2E**: Log in as free → see usage; start trial (mock) → see trial banner; subscribe (test mode) → see premium and manage link.
