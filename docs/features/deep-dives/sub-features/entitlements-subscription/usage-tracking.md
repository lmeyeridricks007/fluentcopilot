# Sub-Feature: Usage Tracking

**Feature**: Entitlements & Subscription (FD-12)  
**Sub-feature**: usage-tracking

---

## 1. Purpose

Track per-user, per-period usage (lessons completed, scenarios completed, optional voice sessions) for cap enforcement and display (e.g. “3/5 lessons today”). Increment usage on completion events; read for entitlement check and GET /entitlements.

---

## 2. Core Concept

- **Usage**: Count of completions per (user_id, period_key). period_key = calendar day or week (e.g. "2025-03-14", "2025-W11"). Stored in usage_counts table (or equivalent).
- **Increment**: When a lesson is completed (lesson-completion), scenario completed (scenario-completion), or other gated activity completed; increment the corresponding counter for current period.
- **Read**: For cap check (is usage >= cap?) and for client display (GET /entitlements or /entitlements/usage).

---

## 3. User Problems Solved

- Accurate cap enforcement (free tier limit).
- User sees progress toward cap (e.g. “3/5 lessons today”).
- Business can analyze usage and tune caps.

---

## 4. Trigger Conditions

- **Increment**: Lesson completion (POST /progress/lesson completed=true); scenario completion (POST /conversation/end); optional voice session end. Each completion flow calls usage.increment(user_id, period_key, type: "lessons" | "scenarios" | "voice").
- **Read**: Entitlement check (before lesson/scenario/voice start); GET /entitlements.

---

## 5. Inputs

- **Increment**: user_id, period_key (e.g. "2025-03-14"), type ("lessons" | "scenarios" | "voice"), amount (default 1).
- **Read**: user_id, period_key(s). Optional: type to get specific counter.

---

## 6. Outputs

- **Increment**: Success (no response to user; part of completion flow). DB: lessons_completed_count += 1 (or scenarios_completed_count, etc.) for (user_id, period_key).
- **Read**: { lessons_today: 3, lessons_cap: 5, scenarios_week: 1, scenarios_cap: 2 } (or raw counts). Used in entitlement response and cap check.

---

## 7. Workflow / Lifecycle

**Increment**  
1. Compute period_key from now (user timezone or UTC per config).  
2. Upsert usage_counts: INSERT (user_id, period_key, lessons_completed_count=1) ON CONFLICT (user_id, period_key) DO UPDATE SET lessons_completed_count = usage_counts.lessons_completed_count + 1, updated_at = now().  
3. Optional: invalidate entitlement cache for user_id so next GET /entitlements reflects new usage.

**Read**  
1. Get period_key for “today” and “this week” (if both used).  
2. SELECT lessons_completed_count, scenarios_completed_count FROM usage_counts WHERE user_id = ? AND period_key IN (?, ?).  
3. Merge with cap config; return to caller (entitlement check or API response).

---

## 8. Business Rules

- Only completed activities increment; no increment on start or abandon.
- Period boundary: same as cap (day or week); period_key from server time; timezone config (user vs UTC).
- One row per (user_id, period_key); multiple columns per activity type (lessons_completed_count, scenarios_completed_count) or separate table per type. Design: single table with columns per type is simple.

---

## 9. Configuration Model

- **period_type**: "day" | "week".
- **period_timezone**: "user" | "UTC".
- **period_key_format**: "YYYY-MM-DD" | "YYYY-Www".
- **counters**: ["lessons", "scenarios", "voice"] (which activities to track). Caps in entitlement config (lessons_cap: 5, scenarios_cap: 2, etc.).

---

## 10. Data Model

**usage_counts** (single table design):

| Column | Type | Constraints |
|--------|------|-------------|
| user_id | UUID | PK (with period_key) |
| period_key | VARCHAR(20) | PK (e.g. "2025-03-14") |
| lessons_completed_count | INT | DEFAULT 0 |
| scenarios_completed_count | INT | DEFAULT 0 |
| voice_sessions_count | INT | DEFAULT 0 (optional) |
| updated_at | TIMESTAMPTZ | |

Unique (user_id, period_key). Index for read: (user_id, period_key).

**Example record**:

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "period_key": "2025-03-14",
  "lessons_completed_count": 3,
  "scenarios_completed_count": 1,
  "voice_sessions_count": 0,
  "updated_at": "2025-03-14T10:22:00Z"
}
```

---

## 11. API Endpoints

- No direct public endpoint for “increment”; called internally by lesson-completion, scenario-completion, etc.
- **Read**: Via GET /v1/entitlements (includes usage) or GET /v1/entitlements/usage (optional dedicated endpoint). Not a separate “usage” API unless product wants it.

**Example** (from GET /entitlements): usage: { lessons_today: 3, lessons_cap: 5, scenarios_week: 1, scenarios_cap: 2 }.

---

## 12. Events Produced

- None. Optional: usage_incremented (user_id, period_key, type) for analytics; not required for cap.

---

## 13. Events Consumed

- Completion events from Lesson Engine (lesson_completed), AI Conversation (scenario_completed), Speech (voice_session_ended). Either direct call from those handlers or internal event (e.g. activity_completed) that usage-tracking subscribes to.

---

## 14. Integrations

- **lesson-completion**: Calls usage.increment(user_id, period_key, "lessons") after persisting completion.
- **scenario-completion**: Calls usage.increment(user_id, period_key, "scenarios").
- **voice-completion**: Optional increment for voice_sessions_count.
- **entitlement-check**: Reads usage for (user_id, period_key); compares to cap.
- **GET /entitlements**: Includes usage in response.

---

## 15. UI Components

- **UsageIndicator**: Displays "X/Y lessons today" or "X/Y scenarios this week" from entitlement response.
- No direct “usage” screen; usage is part of entitlement and cap modal.

---

## 16. UI Screens

- Shown in Home or Learn (indicator); in CapReachedModal (usage and cap).

---

## 17. Permissions & Security

- User sees only own usage. Backend filters by user_id. No client-supplied increment; only server-side on completion.

---

## 18. Error Handling

- Increment failure: Log; retry once. If persistent, completion may still be persisted (lesson-completion); usage eventually consistent or alert.
- Read failure: Return 0 or last known; do not block entitlement response (degrade gracefully).
- Duplicate increment (e.g. double complete): Idempotent complete in lesson-completion prevents; if somehow double increment, accept (rare; next period resets).

---

## 19. Edge Cases

- **Period rollover**: At midnight (or week boundary), new period_key; new row or zero counts for new period. Read returns 0 for “today” after rollover.
- **Timezone**: User in Tokyo vs UTC; period_key must be consistent. Use server date in chosen timezone or user’s stored timezone.
- **Concurrent increment**: Upsert with increment is atomic (e.g. UPDATE ... SET count = count + 1). No race.

---

## 20. Performance Considerations

- Single row read per (user_id, period_key). Single row upsert on increment. Index (user_id, period_key). No hot key if users spread across periods.
- Optional: cache usage in entitlement cache (already cached with tier); invalidate on increment so next GET /entitlements gets new usage.

---

## 21. Observability

- Log: increment (user_id, period_key, type); failures. Metric: usage_increments_total (by type), usage_read_latency_seconds.
- Alert: spike in increment failures.

---

## 22. Example Scenarios

**Scenario A**: User completes lesson. lesson-completion calls increment(user_id, "2025-03-14", "lessons"). Row exists: lessons_completed_count 2 → 3. **Scenario B**: Next day. period_key "2025-03-15"; new row or 0; lessons_completed_count 0 for today. **Scenario C**: GET /entitlements reads usage for 2025-03-14 (today); returns lessons_today=3, lessons_cap=5.

---

## 23. Implementation Notes

- **Backend**: Entitlements service or Lesson Engine owns usage_counts. Increment in same transaction as lesson_progress update if same DB; else eventual consistency. Read in entitlement check and GET /entitlements.
- **Database**: usage_counts table; upsert on increment. Index (user_id, period_key).
- **Jobs/workers**: None for standard flow. Optional: nightly job to backfill or reconcile (audit).
- **Frontend**: No direct usage API; uses GET /entitlements.usage.

---

## 24. Testing Requirements

- **Unit**: period_key generation; increment upsert logic; read returns correct counts.
- **Integration**: Complete lesson → increment; read usage → reflects increment. Two completions → count 2. New period → new row, count 0.
- **E2E**: Complete lessons; see usage indicator update (from refetch entitlement).
