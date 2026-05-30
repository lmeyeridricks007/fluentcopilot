# User Stories: Entitlements & Subscription (E-13)

**Feature**: Entitlements & Subscription  
**Source**: docs/features/deep-dives/final/entitlements-and-subscription.md, sub-features/entitlements-subscription/

---

## EN-01: See current entitlement and usage

**Title**: View tier, trial end date, and usage (e.g. lessons today)

**As a** learner  
**I want** to see my current plan (free, trial, premium), trial end date if applicable, and usage (e.g. “3/5 lessons today”)  
**So that** I know what I can access and when to upgrade or renew.

**Acceptance criteria**

- [ ] GET /v1/entitlements returns 200 with { tier, trial_ends_at?, subscription_ends_at?, usage: { lessons_today, lessons_cap, scenarios_week?, scenarios_cap? }, manage_url? }.
- [ ] tier is one of free, trial, premium. trial_ends_at and subscription_ends_at are ISO 8601 or null.
- [ ] usage reflects current period (e.g. lessons_today from usage_counts for today’s period_key). lessons_cap from config (e.g. 5).
- [ ] manage_url present for premium (link to payment provider portal). Cache allowed (e.g. 5 min TTL); invalidated on webhook and trial/start.

**Preconditions**: User authenticated.

**Postconditions**: None (read-only).

---

## EN-02: Start free trial

**Title**: Start time-limited premium trial

**As a** free user  
**I want** to start a free trial so that I can access premium features for a limited time.

**Acceptance criteria**

- [ ] POST /v1/entitlements/trial/start returns 200 with { trial_ends_at } (e.g. now + 7 days).
- [ ] Backend creates or updates trials row (user_id, started_at, ends_at); invalidates entitlement cache for user.
- [ ] Next GET /entitlements returns tier=trial and trial_ends_at.
- [ ] One trial per user (or per product rule). 400 if already used.
- [ ] No payment required for trial start (payment may be required at trial end via provider).

**Preconditions**: User authenticated. User has not already started a trial (or product allows restart).

**Postconditions**: tier=trial until trial_ends_at. All premium features accessible during trial.

---

## EN-03: Cap enforced at lesson/scenario start

**Title**: Free user at cap cannot start new lesson/scenario

**As a** free user at my daily lesson limit  
**I want** the app to prevent me from starting a new lesson and show usage (e.g. 5/5) and upsell  
**So that** I understand the limit and can upgrade.

**Acceptance criteria**

- [ ] When a gated flow (e.g. GET /v1/lessons/:id for new start) runs, backend calls entitlement check: if tier=free and usage >= cap, return 403 free_cap_reached with usage.
- [ ] Usage is read from usage_counts for (user_id, period_key). Cap from config.
- [ ] Trial and premium never get 403 for cap (unless fair-use cap applies; product decision).
- [ ] Client receives 403 and shows CapReachedModal or equivalent.

**Preconditions**: Free user. usage_counts.lessons_completed_count >= lessons_cap for current period (or same for scenarios).

**Postconditions**: No new lesson/scenario started; user sees upsell.

---

## EN-04: Subscription state updated via webhook

**Title**: Payment provider webhooks update subscription and tier

**As a** system  
**I want** payment provider webhooks (subscription created/updated/deleted, invoice paid) to update our subscription state and invalidate cache  
**So that** users see correct tier (e.g. premium after payment) without delay.

**Acceptance criteria**

- [ ] Webhook endpoint (e.g. POST /v1/webhooks/payments/:provider) verifies provider signature and parses event.
- [ ] On subscription.updated or invoice.paid: update subscriptions table (user_id, status, plan_id, current_period_end, etc.); invalidate entitlement cache for user_id.
- [ ] On subscription.deleted or cancelled: update status; cache invalidated; tier becomes free at period end or immediately per plan.
- [ ] Idempotent: same event id or payload hash not applied twice. Return 200 quickly; process async if needed.

**Preconditions**: Payment provider sends webhook. Webhook secret configured.

**Postconditions**: subscriptions table and cache reflect provider state. GET /entitlements returns updated tier.

---

## EN-05: Usage increments on lesson/scenario complete

**Title**: Usage count increases only on completion

**As a** system  
**I want** lesson and scenario completion flows to increment usage_counts for the current period  
**So that** cap reflects actual usage and cannot be gamed by starting without completing.

**Acceptance criteria**

- [ ] When lesson is completed (POST /progress/lesson with completed=true), backend increments usage_counts.lessons_completed_count for (user_id, period_key). period_key = current day (or week) per config (e.g. "2025-03-14").
- [ ] When scenario is completed (POST /conversation/end), backend increments scenarios_completed_count for (user_id, period_key_week) if applicable.
- [ ] Increment is atomic (upsert: INSERT or UPDATE count = count + 1). No double increment (idempotent complete in lesson flow).
- [ ] GET /entitlements reflects new usage after increment (cache invalidated on increment or short TTL).

**Preconditions**: Completion API called with valid completed session/lesson.

**Postconditions**: usage_counts updated; next cap check uses new count.
