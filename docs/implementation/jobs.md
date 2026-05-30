# Background Jobs / Workers

**Source**: docs/features/deep-dives (completion flows, entitlements, notifications, personalization)

Jobs identified from feature specs. Each entry includes trigger, input, processing, output, failure handling, retry strategy.

---

## 1. Lesson / Activity Completion Downstream Retry

| Attribute | Value |
|-----------|--------|
| **Name** | completion-downstream-retry |
| **Trigger** | After lesson (or scenario) completion: if Gamification.award or Personalization activity-event fails after DB commit. Enqueue job with (user_id, activity_type, lesson_id, score, completed_at). |
| **Input** | user_id, activity_type ("lesson" \| "scenario" \| "voice" \| "listening"), source_id (lesson_id or scenario_session_id), score?, completed_at. |
| **Processing** | Call Gamification.award(user_id, { activity_type, source_id, score }). Call Personalization POST /activity-event. Do not increment usage again (already done). |
| **Output** | XP/streak updated; activity recorded in Personalization. |
| **Failure** | Log; dead-letter after retries. Alert if high failure rate. |
| **Retry** | 3 attempts with exponential backoff (e.g. 1min, 5min, 15min). |
| **Complexity** | S (optional for MVP; sync call in request is acceptable). |

---

## 2. Trial Expiry

| Attribute | Value |
|-----------|--------|
| **Name** | trial-expiry |
| **Trigger** | Cron: daily (e.g. 00:05 UTC) or hourly. |
| **Input** | None (query trials where ends_at < now()). |
| **Processing** | Select trials where ends_at < current timestamp. For each: mark expired (optional status column) or leave row; invalidate entitlement cache for user_id. Optional: enqueue "Trial ended" notification. |
| **Output** | Cache invalidated; next GET /entitlements returns tier=free for expired trial users. |
| **Failure** | Log per user; continue. Retry failed cache invalidations once. |
| **Retry** | Cron reruns next cycle. |
| **Complexity** | S |

---

## 3. Webhook Processing (Async Variant)

| Attribute | Value |
|-----------|--------|
| **Name** | payment-webhook-process |
| **Trigger** | Payment provider webhook received; endpoint returns 200 quickly and enqueues payload. |
| **Input** | Raw webhook body; signature; event type (subscription.updated, invoice.paid, etc.). |
| **Processing** | Verify signature (if not done in HTTP handler). Parse event. Update subscriptions table (user_id, status, current_period_end, etc.). Invalidate entitlement cache for user_id. Idempotent by event id or external_id. |
| **Output** | subscriptions table updated; cache invalidated. |
| **Failure** | Retry 3x; then dead-letter. Provider may retry webhook. |
| **Retry** | 3 attempts with backoff. |
| **Complexity** | M (optional; sync in request is acceptable if fast). |

---

## 4. Daily Reflection Lesson Generation (FD-07)

| Attribute | Value |
|-----------|--------|
| **Name** | daily-reflection-lesson-generate |
| **Trigger** | User completes reflection entries for the day; or scheduled (e.g. end of day) for users who added entries. |
| **Input** | user_id, reflection_entries (notes, optional photo refs, location). |
| **Processing** | Call LLM with entries + profile to generate "Your day" lesson content. Moderate output (IS-017). Store generated lesson or lesson_id. Notify or make available in session set. |
| **Output** | Generated lesson available; Daily card in Home. |
| **Failure** | Log; retry once; if LLM/moderation fails, skip for that day. |
| **Retry** | 2 attempts. |
| **Complexity** | M (P2 feature). |

---

## 5. Streak Recalculation (Optional)

| Attribute | Value |
|-----------|--------|
| **Name** | streak-recalculate |
| **Trigger** | Cron daily; or on-demand for support. |
| **Input** | Optional: user_id (else all users). |
| **Processing** | Recompute consecutive days from activity_completions (lesson, scenario, etc.). Update user_streak or gamification summary. Fix timezone edge cases. |
| **Output** | Correct streak count. |
| **Failure** | Log; continue other users. |
| **Retry** | Next cron run. |
| **Complexity** | S (optional; only if timezone/edge bugs require repair). |

---

## 6. Spaced Repetition Due Queue (Optional)

| Attribute | Value |
|-----------|--------|
| **Name** | spaced-repetition-due |
| **Trigger** | Not a job; Personalization/Recommendations service queries spaced_repetition where next_due_at <= now() for user. Used for "Review flashcards" recommendation. |
| **Input** | user_id. |
| **Processing** | Read-only query. Return due items for session set. |
| **Output** | List of due items for UI. |
| **Complexity** | S (query only). |

---

## 7. Notification Delivery (E-15)

| Attribute | Value |
|-----------|--------|
| **Name** | notification-send |
| **Trigger** | Event: streak_reminder (e.g. 20:00 local if no activity), trial_ending (1 day before), daily_lesson_ready (morning). Or in-app only (no push job). |
| **Input** | user_id, template_id, payload (e.g. streak_days, trial_ends_at). |
| **Processing** | Resolve user preferences (push enabled?). Resolve device token(s). Send via FCM/APNs or in-app only. Log delivery. |
| **Output** | Push sent or in-app notification created. |
| **Failure** | Retry 2x for push; invalid token → unregister. |
| **Retry** | 2 attempts. |
| **Complexity** | M (P2). |

---

## Summary Table

| Job | Epic / Feature | Priority | MVP Required |
|-----|----------------|----------|--------------|
| completion-downstream-retry | Core Lessons, Scenarios | P0 | Optional (sync OK) |
| trial-expiry | Entitlements | P0 | Yes |
| payment-webhook-process | Entitlements | P0 | Optional (sync OK) |
| daily-reflection-lesson-generate | Daily Reflection | P2 | No |
| streak-recalculate | Gamification | P0 | Optional |
| notification-send | Notifications | P2 | No (or in-app only) |
