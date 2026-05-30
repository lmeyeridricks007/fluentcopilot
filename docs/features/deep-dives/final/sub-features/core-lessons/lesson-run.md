# Sub-Feature: Lesson Run

**Feature**: Core Lessons (FD-02)  
**Sub-feature**: lesson-run

---

## 1. Purpose

Load full lesson content (steps, exercises, quiz) for start or resume so the client can render the lesson flow. Enforce cap when starting a *new* lesson (no existing in_progress); allow resume without cap check.

---

## 2. Core Concept

- **Start**: GET /lessons/:id when user has no in_progress for this lesson → run cap check (lesson-cap-enforcement); if pass, return lesson + progress (null or in_progress). If at cap → 403 free_cap_reached.
- **Resume**: GET /lessons/:id when user has in_progress → no cap check; return lesson + progress (last_step_index). Client resumes from that step.
- **Content**: lesson content_payload (steps, vocabulary_refs, exercise_ids, quiz), resolved exercises (payloads), and optional progress.

---

## 3. User Problems Solved

- User can start or resume a lesson with full content and correct progress.
- Free user at cap is blocked with clear 403 and usage.

---

## 4. Trigger Conditions

- User taps lesson in catalog or “Continue [lesson]”; client GET /v1/lessons/:id.

---

## 5. Inputs

- lesson_id (path); user_id (auth). Optional query resume=1 (client hint; server decides by progress).

---

## 6. Outputs

- **200**: Lesson object with content_payload, exercises[], progress: { status, last_step_index, score }. For resume, progress.in_progress and last_step_index set.
- **403**: free_cap_reached with usage (when starting new and at cap).
- **404**: Lesson not found or not published.

---

## 7. Workflow / Lifecycle

1. Validate lesson_id; load lesson (status=published). If not found or draft → 404.
2. Load lesson_progress for (user_id, lesson_id). If status=in_progress → resume path: skip cap check; return lesson + progress.
3. If no progress or completed: start path. Call cap check (lesson-cap-enforcement). If at cap → 403. Else continue.
4. Resolve exercises (by content_payload.exercise_ids); load exercise payloads. Build response with lesson, exercises, progress (null or existing).
5. Return 200.

---

## 8. Business Rules

- Only published lessons; 404 for draft/archived.
- Resume does not consume cap; start does (check only; increment on complete).
- Progress last_step_index must not exceed steps length; clamp if content changed (see lesson-progress).

---

## 9. Configuration Model

- Same as lesson-cap-enforcement for cap; catalog for status=published.

---

## 10. Data Model

**Read**: lessons (id, content_payload, ...), lesson_progress (user_id, lesson_id, status, last_step_index), exercises (id, payload by exercise_ids). **No write** in this sub-feature (progress write in lesson-progress and lesson-completion).

---

## 11. API Endpoints

GET /v1/lessons/:id. Example response (200): see core-lessons.md API Design §18.2 (lesson content + exercises + progress). Example 403: see lesson-cap-enforcement.

---

## 12.–24. [Abbreviated for space — same structure as lesson-catalog]

- **Events**: None produced; consumes none.
- **Integrations**: lesson-cap-enforcement (check), Profile (user level optional), Content/DB (lessons, exercises).
- **UI**: LessonRunScreen, StepRenderer, progress bar. **Screens**: Lesson run (full-screen). **Permissions**: Auth; user only. **Errors**: 403, 404, 500. **Edge cases**: Progress corrupt (clamp step_index). **Performance**: Index lesson id; batch load exercises. **Observability**: Log request_id, lesson_id, resume vs start; latency. **Example**: Start under cap → 200; start at cap → 403. **Implementation**: Lesson Engine; cap check before return; join progress and exercises. **Testing**: Unit: resume vs start logic. Integration: GET with/without progress; 403 at cap; 404 draft. E2E: Start and resume lesson.
