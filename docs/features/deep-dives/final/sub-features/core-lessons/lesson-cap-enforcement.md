# Sub-Feature: Lesson Cap Enforcement

**Feature**: Core Lessons (FD-02)  
**Sub-feature**: lesson-cap-enforcement

---

## 1. Purpose

Enforce free-tier daily (or configurable period) lesson limit by checking usage before allowing a new lesson start and incrementing usage only on lesson completion. Return 403 with `free_cap_reached` and usage details so the client can show upsell or “Come back tomorrow.”

---

## 2. Core Concept

- **Cap**: Max lessons per period (e.g. 5 per day) for free users; premium/trial unlimited (or fair-use). Configurable per product.
- **Check point**: When user attempts to *start* a lesson (GET /lessons/:id for a lesson with no existing in_progress). Do not check on list or on resume.
- **Increment point**: Only when lesson is *completed* (lesson-completion sub-feature). Standalone review does not count toward cap.

---

## 3. User Problems Solved

- Free users get clear limit and upsell when reached; premium differentiator.
- Prevents gaming: usage only on completion, not on start.

---

## 4. Trigger Conditions

- **Check**: GET /lessons/:id when client intends to “start” (no current in_progress for this lesson_id for this user). If free user and usage >= cap → 403.
- **Increment**: POST /progress/lesson with completed=true (see lesson-completion); increment usage for (user_id, period_key).

---

## 5. Inputs

- **Check**: user_id (auth), lesson_id, entitlement tier (free | trial | premium). Optional: existing in_progress for this lesson (if any, treat as resume → no cap check).
- **Increment**: user_id, period_key (e.g. "2025-03-14"). From lesson-completion flow.

---

## 6. Outputs

- **Check pass**: Allow GET /lessons/:id to return 200 with lesson content.
- **Check fail**: 403 with body { error: { code: "free_cap_reached", message: "..." }, usage: { lessons_today: 5, lessons_cap: 5 } }.
- **Increment**: Update usage_counts.lessons_completed_count += 1 for (user_id, period_key).

---

## 7. Workflow / Lifecycle

**Check (at lesson start)**  
1. Resolve tier (free/trial/premium) from Entitlements. If trial or premium, allow (no cap).  
2. If free: get period_key for now (e.g. today in user timezone or UTC). Read usage_counts (user_id, period_key). Get cap from config (e.g. 5).  
3. If lessons_completed_count >= cap and no in_progress for this lesson_id → 403 free_cap_reached with usage.  
4. Else allow; return lesson (handled by lesson-run).

**Increment (at completion)**  
1. From lesson-completion: get user_id, period_key.  
2. Upsert usage_counts: increment lessons_completed_count by 1.  
3. No response to user from this sub-feature; part of completion response.

---

## 8. Business Rules

- BR-8: Free-tier limits enforced per user per period (BFR-011).
- Cap applies only to *new* lesson starts; resume of in_progress does not require cap check.
- Standalone review (flashcard/quiz only) does not count toward cap; only full lesson completion increments.
- Trial and premium: no cap (or separate fair-use if needed).

---

## 9. Configuration Model

- **free_tier.lessons_cap_per_period**: number (e.g. 5).
- **free_tier.period_type**: "day" | "week".
- **free_tier.period_timezone**: "user" | "UTC" for day boundary.
- **period_key_format**: "YYYY-MM-DD" (day) or "YYYY-Www" (week).

---

## 10. Data Model

- **usage_counts**: user_id (UUID), period_key (VARCHAR, e.g. "2025-03-14"), lessons_completed_count (INT), updated_at. Unique (user_id, period_key). Used for both read (check) and write (increment).
- **lesson_progress**: Read to see if user has in_progress for this lesson_id (if yes, treat as resume; no cap check).

---

## 11. API Endpoints

- **Check**: Implemented inside GET /v1/lessons/:id (lesson-run). Not a separate endpoint.
- **Increment**: Implemented inside POST /v1/progress/lesson when completed=true (lesson-completion).

**Example 403 response** (from GET /lessons/:id when at cap):

```json
{
  "error": {
    "code": "free_cap_reached",
    "message": "You've reached your daily lesson limit. Upgrade for unlimited or come back tomorrow."
  },
  "usage": { "lessons_today": 5, "lessons_cap": 5 }
}
```

---

## 12. Events Produced

- **free_cap_reached**: When 403 returned; payload { user_id, lesson_id, usage, cap } for analytics and upsell funnel.

---

## 13. Events Consumed

- None. Uses Entitlements for tier; reads/writes usage_counts.

---

## 14. Integrations

- **Entitlements**: Get tier (free/trial/premium). Optionally get cap and usage from Entitlements service; or Lesson Engine owns usage_counts and cap config.
- **lesson-run**: Calls cap check before returning lesson.
- **lesson-completion**: Calls increment after persisting completion.

---

## 15. UI Components

- **CapReachedModal**: Shown when client receives 403 free_cap_reached; displays message and usage (e.g. "5/5 lessons today"); primary CTA Upgrade; secondary "Come back tomorrow."
- **UsageIndicator**: Optional "X/5 lessons today" on Home or Learn from GET /entitlements or /entitlements/usage.

---

## 16. UI Screens

- Modal overlay; no dedicated screen. Learn and Home may show usage indicator.

---

## 17. Permissions & Security

- Cap enforced server-side only; client cannot override or fake tier/usage.
- User sees only own usage; filter by user_id.

---

## 18. Error Handling

- If usage read fails: fail open or fail closed? Recommend fail closed (deny start) and log.
- If tier unknown: treat as free and apply cap.
- Period_key edge (e.g. timezone change): use consistent rule; document for support.

---

## 19. Edge Cases

- **Same period, two devices**: Usage is per user and period; increment once per completion; both devices see same usage after sync.
- **Clock skew**: Use server time for period_key; avoid client-supplied date.
- **Resume**: User has in_progress for lesson 42; GET /lessons/42 → do not check cap (resume allowed).
- **Cap increased mid-period**: New cap applies on next check; existing usage unchanged.

---

## 20. Performance Considerations

- Single row read for usage (user_id, period_key); index unique (user_id, period_key). Increment is single row upsert.
- Cache tier and usage with short TTL (e.g. 1 min) to avoid repeated Entitlements/DB calls; invalidate on completion.

---

## 21. Observability

- Log: cap_check (allowed/denied), user_id, usage, cap. Metric: cap_checks_total (by result), free_cap_reached_total.
- Alert: sudden drop in lesson starts if cap logic misconfigured.

---

## 22. Example Scenarios

**Scenario A**: Free user, 4 completions today. Starts lesson 50. Check: usage=4, cap=5 → allow. After complete, usage=5. Next start (lesson 51): usage=5, cap=5 → 403.

**Scenario B**: Same user, had started lesson 50 yesterday, in_progress. Today opens lesson 50 (resume). No cap check; allow. Complete → usage for today increments.

---

## 23. Implementation Notes

- **Backend**: Lesson Engine (or Entitlements) owns usage_counts. Cap check in GET /lessons/:id handler; increment in POST /progress/lesson completion handler. Use same period_key logic for check and increment.
- **Database**: usage_counts table; upsert on increment. Index (user_id, period_key).
- **Jobs/workers**: None for cap; synchronous read/write.
- **Frontend**: Handle 403; show CapReachedModal; optional GET /entitlements/usage to show X/cap before tap.

---

## 24. Testing Requirements

- **Unit**: period_key generation (day, week, timezone); check logic (at cap → deny; under cap or resume → allow); increment logic.
- **Integration**: Free user at cap → GET /lessons/:id returns 403 with usage; complete lesson → usage increments; next start → 403. Trial user → no 403.
- **E2E**: Complete lessons until cap; try start new lesson → see modal; next day (or mock time) → start allowed.
