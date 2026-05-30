# Sub-Feature: Lesson Completion

**Feature**: Core Lessons (FD-02)  
**Sub-feature**: lesson-completion

---

## 1. Purpose

Persist lesson completion (quiz submitted, score stored), increment usage for cap, trigger Gamification (XP, streak), update spaced repetition, and notify Personalization so the learning loop is closed and the user sees summary and next steps.

---

## 2. Core Concept

- **Complete**: Single API call (POST /progress/lesson with completed=true and score) that atomically or sequentially: (1) upsert lesson_progress to status=completed, score, completed_at, (2) increment usage for the period, (3) call Gamification.award, (4) call Personalization activity-event and/or Spaced Repetition. Idempotent: second complete for same (user_id, lesson_id) does not double usage or XP.
- **Downstream**: Gamification, Entitlements (usage), Personalization, Spaced Repetition are consumers; completion must succeed even if one downstream is temporarily down (persist first, then best-effort or queue).

---

## 3. User Problems Solved

- User sees completion summary (score, XP, streak) and can go to “Next lesson” or Home.
- Business gets accurate usage count for cap and engagement metrics; Gamification and recommendations stay in sync.

---

## 4. Trigger Conditions

- User submits quiz on last step of lesson (client has collected score and answers).
- Client sends POST /progress/lesson with lesson_id, completed=true, score, and optional answers.

---

## 5. Inputs

- **Request body**: lesson_id (required), step_index (optional), completed=true (required for this flow), score (required, 0–100 or 0–1), answers (optional array: exercise_id, selected_option_id or answer text).
- **Auth**: user_id from session.
- **Context**: Existing lesson_progress may be in_progress; or first time complete (e.g. no prior checkpoint).

---

## 6. Outputs

- **200**: { saved: true, completed: true, score, xp_awarded?, streak_updated? }. Client shows summary.
- **400**: Invalid lesson_id, missing score, or score out of range.
- **404**: Lesson not found.
- **409/200**: If already completed (idempotent), return 200 with existing score; do not award again.

---

## 7. Workflow / Lifecycle

1. Client POST /v1/progress/lesson { lesson_id: 42, completed: true, score: 85.5, answers: [...] }.
2. API validates lesson_id and score; loads user_id from auth.
3. Check if lesson_progress already has status=completed for (user_id, lesson_id). If yes, return 200 idempotent with existing data; exit.
4. In transaction or sequence: (a) Upsert lesson_progress: status=completed, score, completed_at=now(), last_step_index from request or max. (b) Increment usage: usage_counts.lessons_completed_count for (user_id, period_key). (c) Call Gamification.award(user_id, { activity_type: "lesson", lesson_id, score }). (d) Call Personalization POST /activity-event { event_type: "lesson_completed", ... }. (e) Call SpacedRepetition.recordCompletion(user_id, lesson_id) if applicable.
5. Return 200 with score and optional xp_awarded, streak_updated from Gamification response.
6. If step 4b–4e fails after 4a: log; still return 200 (completion persisted); optionally queue retry for downstream.

---

## 8. Business Rules

- FD02-FR-005: Record progress and expose to Gamification (XP).
- Completion is idempotent per (user_id, lesson_id): only first complete awards XP and increments usage.
- Score required when completed=true; validate range (e.g. 0–100).
- Usage increment uses same period_key as cap (e.g. calendar day in user timezone or UTC).

---

## 9. Configuration Model

- **completion.downstream_required**: false (persist completion even if Gamification/Personalization fail).
- **completion.retry_downstream**: true (queue or retry for award and activity-event).
- **usage.period_key_format**: "YYYY-MM-DD" (day) or "YYYY-Www" (week); from config.

---

## 10. Data Model

**Write**:

- **lesson_progress**: UPDATE or INSERT set status='completed', score=?, completed_at=now(), last_step_index=?, updated_at=now() WHERE user_id=? AND lesson_id=? (upsert).
- **usage_counts**: INSERT or UPDATE increment lessons_completed_count, updated_at for (user_id, period_key). Period_key from current date (e.g. 2025-03-14).

**Read**: lesson_progress (to check already completed); usage_counts (to increment).

---

## 11. API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /v1/progress/lesson | Checkpoint or complete. This sub-feature handles completed=true. |

**Example request** (complete):

```json
{
  "lesson_id": 42,
  "step_index": 4,
  "completed": true,
  "score": 85.5,
  "answers": [
    { "exercise_id": 301, "selected_option_id": "B" },
    { "exercise_id": 302, "answer": "brood" }
  ]
}
```

**Example response** (200):

```json
{
  "saved": true,
  "completed": true,
  "score": 85.5,
  "xp_awarded": 10,
  "streak_updated": 3
}
```

---

## 12. Events Produced

- **lesson_completed**: Internal or analytics; payload { user_id, lesson_id, score, completed_at, duration_sec? }. Consumers: Analytics, optional data pipeline.
- **Triggers**: Gamification (award), Personalization (activity-event), Spaced Repetition (recordCompletion)—invoked synchronously or via internal event.

---

## 13. Events Consumed

- None as trigger. Completion is triggered by client POST. Optionally consume “quiz_submitted” if split; in this design completion is the single trigger.

---

## 14. Integrations

- **Entitlements / Usage**: Increment usage for (user_id, period_key). Call Entitlements.incrementUsage or direct write to usage table.
- **Gamification**: award(user_id, { activity_type: "lesson", lesson_id, score }). Returns xp_awarded, streak_updated for response.
- **Personalization**: POST /activity-event { event_type: "lesson_completed", user_id, lesson_id, score, ... }.
- **Spaced Repetition**: recordCompletion(user_id, lesson_id) or item_ids from lesson vocabulary.

---

## 15. UI Components

- **SummaryCard**: Displays score, XP gained, streak after completion; uses response xp_awarded, streak_updated.
- **NextLessonButton**: Navigate to next recommended lesson or Home.
- **LessonRunScreen**: Submits completion request; shows loading then SummaryCard on 200.

---

## 16. UI Screens

- **LessonSummaryScreen**: Shown after successful complete; shows SummaryCard and Next/Home buttons.

---

## 17. Permissions & Security

- Authenticated only; user_id from session. User can only complete own progress.
- Validate lesson_id exists and is published; reject completion for other user’s lesson.
- No client-supplied XP or usage; server computes from completion.

---

## 18. Error Handling

- 400: Missing score, invalid score range, invalid lesson_id format.
- 404: Lesson not found.
- 500: DB or downstream failure; if completion already persisted return 200 and log downstream failure; else return 500 and retry.
- Idempotent: 200 with existing data if already completed.

---

## 19. Edge Cases

- **Double submit**: Two tabs submit; first wins; second gets 200 idempotent; no double XP or usage.
- **Gamification down**: Persist completion and usage; return 200; log; queue or retry award later so XP eventually consistent.
- **Negative or >100 score**: 400 validation.
- **Complete without prior progress**: Allowed; upsert creates completed row.

---

## 20. Performance Considerations

- Single transaction for lesson_progress upsert + usage increment if same DB; then async or sync Gamification and Personalization.
- Avoid long blocking on downstream; timeout Gamification call (e.g. 2s) and queue retry.
- Index lesson_progress (user_id, lesson_id) for upsert; usage_counts (user_id, period_key).

---

## 21. Observability

- Log: completion request (lesson_id, user_id, score), idempotent hit, downstream success/failure. No PII in logs.
- Metric: lesson_completions_total, lesson_completion_latency_seconds, downstream_failures_total (by downstream).
- Alert: spike in downstream_failures or completion latency.

---

## 22. Example Scenarios

**Scenario A**: User completes first time. POST with completed=true, score=85.5. Server upserts completed, increments usage 2→3 for today, calls Gamification (10 XP, streak 3), Personalization, SR. Returns 200 with xp_awarded=10, streak_updated=3.

**Scenario B**: User refreshes and resubmits (or second tab). POST same. Server sees already completed; returns 200 with existing score; no increment, no award.

---

## 23. Implementation Notes

- **Backend**: Lesson Engine handles POST; use DB transaction for progress + usage; then call Gamification (sync or fire-and-forget with queue). Personalization and SR can be async. Idempotency key: (user_id, lesson_id) with status=completed.
- **Database**: Upsert lesson_progress; increment usage_counts in same or separate transaction. Ensure period_key matches cap logic (same timezone).
- **Jobs/workers**: Optional: queue “award_xp” and “activity_event” if sync fails; worker retries.
- **Frontend**: Disable submit after first 200; show summary; optional “Submitting…” and retry on 5xx.

---

## 24. Testing Requirements

- **Unit**: Idempotent logic (second complete no increment, no double XP); score validation; period_key generation.
- **Integration**: POST complete → progress and usage updated; Gamification and Personalization called (mocked); second POST idempotent; 400 for invalid score.
- **E2E**: Complete lesson → see summary with XP and streak; refresh and complete again (or second tab) → same summary, no double XP.
