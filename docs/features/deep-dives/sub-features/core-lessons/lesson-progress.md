# Sub-Feature: Lesson Progress

**Feature**: Core Lessons (FD-02)  
**Sub-feature**: lesson-progress

---

## 1. Purpose

Persist and read per-user, per-lesson progress (status: not_started | in_progress | completed; last_step_index; score; completed_at) so users can resume and so completion flow can update to completed.

---

## 2. Core Concept

- **Checkpoint**: POST /progress/lesson with completed=false and step_index updates lesson_progress to status=in_progress, last_step_index=step_index. Idempotent for same step.
- **Complete**: Handled in lesson-completion (completed=true). **Read**: GET /progress/lessons or embedded in GET /lessons/:id for resume and in catalog for in_progress/completed badges.

---

## 3. User Problems Solved

- Resume from last step after network loss or app close.
- “Continue” section and badges (in progress, completed).

---

## 4. Trigger Conditions

- **Checkpoint**: Client after each step (or every N steps); POST /progress/lesson { lesson_id, step_index, completed: false }.
- **Read**: GET /progress/lessons or as part of GET /lessons/:id.

---

## 5. Inputs

- Checkpoint: lesson_id, step_index (0-based), completed=false. Auth: user_id.
- Read: user_id (auth); optional status filter (in_progress | completed).

---

## 6. Outputs

- Checkpoint 200: { saved: true }. Progress row upserted: status=in_progress, last_step_index=step_index.
- Read 200: { progress: [ { lesson_id, lesson_title, status, last_step_index, score, completed_at, updated_at } ] }.

---

## 7. Workflow / Lifecycle

- **Checkpoint**: Upsert lesson_progress SET status='in_progress', last_step_index=?, updated_at=now() WHERE user_id=? AND lesson_id=?.
- **Read**: SELECT * FROM lesson_progress WHERE user_id=? [AND status=?] ORDER BY updated_at DESC.

---

## 8. Business Rules

- One row per (user_id, lesson_id). FD02-FR-005 (record progress). Checkpoint at step boundaries; completion overwrites to completed (in lesson-completion).
- If last_step_index > steps.length (content changed), clamp or treat as 0 for resume.

---

## 9. Configuration Model

- checkpoint.step_boundaries: every step or specific indices. Optional debounce (e.g. 2s) on client.

---

## 10. Data Model

**lesson_progress**: user_id, lesson_id (PK together), status, last_step_index, score, completed_at, created_at, updated_at. Index (user_id, status) for “Continue” list.

---

## 11. API Endpoints

POST /v1/progress/lesson (checkpoint). GET /v1/progress/lessons (list). Example request (checkpoint): { lesson_id: 42, step_index: 2, completed: false }. Example response: { saved: true }.

---

## 12.–24. Summary

- **Events**: None. **Integrations**: lesson-run (read for resume), lesson-completion (write completed), catalog (read for badges). **UI**: Progress bar, “Continue” list, checkpoint indicator. **Permissions**: Auth; own progress only. **Errors**: 400 invalid step_index; 404 lesson not found. **Edge cases**: Corrupt last_step_index (clamp). **Performance**: Upsert by (user_id, lesson_id); index (user_id, status). **Observability**: Log checkpoint; latency. **Implementation**: Lesson Engine; upsert on checkpoint; read in GET /progress/lessons and GET /lessons/:id. **Testing**: Unit: upsert logic. Integration: POST checkpoint → read returns updated; GET list. E2E: Advance steps → leave → resume from last step.
