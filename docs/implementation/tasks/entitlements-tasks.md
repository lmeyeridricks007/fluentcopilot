# Implementation Tasks: Entitlements & Subscription (E-13)

**Feature**: Entitlements & Subscription  
**Stories**: EN-01 through EN-05

---

## Frontend Tasks

| Task ID | Task Title | Description | Inputs | Outputs | Dependencies | Complexity |
|---------|------------|-------------|--------|---------|--------------|------------|
| EN-F01 | EntitlementProvider / context | React context (or store) that fetches GET /v1/entitlements on auth load; exposes tier, trial_ends_at, usage, manage_url; refresh on focus or after trial/start. | Auth state | tier, usage, manage_url, trial_ends_at | Auth; API | S |
| EN-F02 | UsageIndicator component | Display "X / Y lessons today" (or week) from entitlement usage; show near lesson list or header. Grey out or hide when premium. | usage.lessons_today, lessons_cap | Badge or text | EN-F01 | S |
| EN-F03 | PaywallModal / CapReachedModal | Reusable modal for cap reached (used by Core Lessons, Scenarios): message, usage, primary "Upgrade", secondary "Come back later". | error payload or usage | Modal | EN-F01 | S |
| EN-F04 | TrialBanner | Show "Your trial ends on {date}" with CTA "Manage subscription" (manage_url). Dismissible. | trial_ends_at, manage_url | Banner | EN-F01 | S |
| EN-F05 | Trial start flow | Button "Start free trial" calls POST /v1/entitlements/trial/start; on 200 refresh entitlement context and show success; on 400 show "Already used". | — | Updated tier; toast | EN-F01; API | S |
| EN-F06 | Settings subscription section | Display current plan (free/trial/premium), end date, "Manage subscription" link (manage_url). For free: "Upgrade" CTA. | Entitlement context | Settings UI | EN-F01 | S |

---

## Backend Tasks

| Task ID | Task Title | Description | Inputs | Outputs | Dependencies | Complexity |
|---------|------------|-------------|--------|---------|--------------|------------|
| EN-B01 | GET /v1/entitlements handler | Resolve tier from subscriptions (active premium?) and trials (current date <= trial_ends_at). Load usage from usage_counts for (user_id, period_key). Return tier, trial_ends_at, subscription_ends_at, usage, manage_url. Cache in Redis keyed by user_id (TTL 5 min); invalidate on webhook and trial/start. | user_id | 200 + entitlement JSON | subscriptions; trials; usage_counts; Redis; payment provider (manage_url) | M |
| EN-B02 | POST /v1/entitlements/trial/start handler | Check user has not already used trial (trials table or flag). Insert trials (user_id, started_at, ends_at = now + 7 days). Invalidate entitlement cache for user. Return 200 { trial_ends_at }. 400 if already used. | user_id | 200 or 400 | trials table; cache | S |
| EN-B03 | Webhook endpoint POST /v1/webhooks/payments/:provider | Verify signature (e.g. Stripe-Signature); parse event (subscription.created/updated/deleted, invoice.paid/failed). Update subscriptions table (user_id, external_id, status, plan_id, current_period_end); idempotent by event id or external_id. Invalidate cache for user_id. Return 200 quickly; process in request or async. | Raw body; headers | 200 | Payment provider SDK; subscriptions | L |
| EN-B04 | Cap check helper | Internal function: getUsage(user_id, period_key) -> lessons_completed_count; getCap("lessons") from config; return { at_cap: count >= cap, usage: { lessons_today: count, lessons_cap: cap } }. Used by Lesson Engine and Scenario service. | user_id; resource type | at_cap, usage | usage_counts; config | S |
| EN-B05 | Usage increment | Internal or internal API: incrementUsage(user_id, period_key, "lessons" | "scenarios"). Upsert usage_counts: lessons_completed_count += 1 (or scenarios). Atomic. Called by Lesson Engine and Scenario on complete. | user_id; period_key; resource | — | usage_counts | S |
| EN-B06 | Trial end handling | Cron or scheduled job: find trials where ends_at < now(); update or mark expired; user tier becomes free on next GET /entitlements. Optional: send "Trial ended" notification. | — | Updated tier for expired trials | trials; cache invalidation | S |

---

## Database Tasks

| Task ID | Task Title | Description | Inputs | Outputs | Dependencies | Complexity |
|---------|------------|-------------|--------|---------|--------------|------------|
| EN-D01 | subscriptions table | user_id, external_id (provider sub id), provider (stripe), status (active/canceled/past_due), plan_id, current_period_start, current_period_end, created_at, updated_at. Index (user_id), (external_id). | Schema spec | Migrations | — | M |
| EN-D02 | trials table | user_id (PK or unique), started_at, ends_at, created_at. One row per user (one trial per user). Index (user_id), (ends_at) for cron. | Schema spec | Migrations | — | S |
| EN-D03 | usage_counts table | user_id, period_key (composite PK), lessons_completed_count DEFAULT 0, scenarios_completed_count DEFAULT 0, updated_at. Unique (user_id, period_key). | Schema spec | Migrations | — | S |
| EN-D04 | Seed config for caps | Config row or env: lessons_cap_per_period=5, period_type=day, scenarios_cap_per_period=3, period_type=week. Optional seed test subscription/trial for staging. | Config spec | Seed or env | — | S |

---

## Integration Tasks

| Task ID | Task Title | Description | Inputs | Outputs | Dependencies | Complexity |
|---------|------------|-------------|--------|---------|--------------|------------|
| EN-I01 | Payment provider: customer portal URL | For premium users, obtain manage_url (e.g. Stripe Customer Portal session URL). Store in subscription or compute on GET /entitlements from provider API. | user_id; customer_id from subscription | manage_url | Payment provider API | S |
| EN-I02 | Payment provider: webhook signature verification | Use provider SDK to verify webhook payload (e.g. stripe.webhooks.constructEvent). Reject 401 if invalid. | Raw body; Stripe-Signature header; webhook secret | Verified event or reject | Provider SDK; WEBHOOK_SECRET | S |
| EN-I03 | Lesson Engine / Scenario: call cap check | Lesson Engine GET /lessons/:id (new start) and Scenario start-session call Entitlements cap check; act on 403. | user_id; resource (lessons/scenarios) | at_cap; usage | EN-B04 | S |
| EN-I04 | Lesson Engine / Scenario: call usage increment | On lesson complete and scenario complete, call Entitlements incrementUsage. | user_id; period_key; resource | — | EN-B05 | S |

---

## Background Jobs / Workers

| Task ID | Task Title | Description | Trigger | Processing | Output | Failure / Retry | Complexity |
|---------|------------|-------------|---------|-------------|--------|-----------------|------------|
| EN-J01 | Trial expiry job | Daily (or hourly): select trials where ends_at < now(); mark expired or delete; invalidate entitlement cache for those user_ids. Optional: enqueue "Trial ended" notification. | Cron schedule | Update trials; cache invalidation | Tier becomes free on next load | Log failures | S |
| EN-J02 | Webhook processing async | Optional: enqueue webhook payload; worker updates subscriptions and invalidates cache. Ensures 200 quick response to provider. | Webhook received | Same as EN-B03 | 200 to provider | Retry 3x; dead-letter | S |

---

## Infrastructure Tasks

| Task ID | Task Title | Description | Inputs | Outputs | Dependencies | Complexity |
|---------|------------|-------------|--------|---------|--------------|------------|
| EN-N01 | Redis cache for entitlements | Key: entitlement:{user_id}. Value: JSON { tier, trial_ends_at, usage, ... }. TTL 300s. Invalidate on webhook and trial/start. | user_id | Cached entitlement or miss | Redis | S |
| EN-N02 | Webhook secret and endpoint URL | Store WEBHOOK_SECRET in secrets; configure provider to send events to https://api.../v1/webhooks/payments/stripe. | Provider dashboard | Verified webhooks | — | S |
