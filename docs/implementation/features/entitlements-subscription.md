# Feature: Entitlements & Subscription (E-13)

**Epic**: E-13 Entitlements & Subscription  
**Source**: docs/features/deep-dives/final/entitlements-and-subscription.md, docs/features/deep-dives/sub-features/entitlements-subscription/

---

## Feature Purpose

Expose current user tier (free, trial, premium), trial/subscription end dates, and usage (e.g. lessons_today, lessons_cap) so the client and other services can gate features and show upsell. Track usage per period and enforce free-tier caps. Support trial start and subscription state via payment provider webhooks.

---

## Feature Scope

### In scope

- Entitlement check: Resolve tier from subscriptions and trials; expose GET /v1/entitlements (tier, trial_ends_at, usage, manage_url); cache with TTL; invalidate on webhook and trial/start.
- Usage tracking: usage_counts (user_id, period_key, lessons_completed_count, scenarios_completed_count); increment on lesson/scenario completion; read for cap and for GET /entitlements.
- Trial management: POST /v1/entitlements/trial/start; set trial ends_at; at end revert to free (job or on next check).
- Subscription webhooks: Receive provider webhooks (subscription created/updated/deleted, invoice paid/failed); update subscriptions table; idempotent; invalidate cache.
- Cap enforcement: Compare usage to configurable cap; return 403 free_cap_reached with usage when free user at cap (used by Core Lessons, Scenarios, etc.).

### Out of scope

- Payment UI (Checkout); backend exposes manage_url and trial/start; provider handles payment flow.
- Refunds and invoicing detail (provider).

---

## Dependencies

- **Payment provider**: Stripe (or equivalent); webhooks; customer portal link for manage_url.
- **All gated features**: Core Lessons, Scenarios, Voice, etc. call entitlement check and (where applicable) rely on usage increment from completion flows.

---

## Sub-Features Involved

| Sub-feature | Implementation scope |
|-------------|------------------------|
| entitlement-check | GET /entitlements; tier derivation; cache (Redis); invalidation |
| usage-tracking | usage_counts read/write; increment on complete; period_key logic |
| trial-management | POST trial/start; trial_ends_at; job or check to revert to free |
| subscription-webhooks | Webhook endpoint; verify signature; update subscriptions; invalidate cache |
| cap-enforcement | Compare usage to cap; return 403 (used by lesson-run, scenario-session, etc.) |

---

## Feature Completion Checklist

- [ ] UI: EntitlementProvider (context), PaywallModal, TrialBanner, UsageIndicator; Settings subscription section.
- [ ] API: GET /v1/entitlements, POST /v1/entitlements/trial/start, GET /v1/entitlements/usage (optional), webhook endpoint.
- [ ] Backend: Entitlements service (tier, usage, cache); webhook handler; trial end job or cron.
- [ ] Database: subscriptions, trials, usage_counts; indexes.
- [ ] Integrations: Payment provider webhooks wired; manage_url from provider.
- [ ] Seed/demo data: Config for cap (e.g. 5 lessons/day); optional test subscription/trial rows.
- [ ] Tests: Unit (tier derivation, cap logic); integration (GET entitlements, trial start, webhook idempotent); E2E (trial flow, cap reached).
