# User Stories: Core Lessons (E-03)

**Feature**: Core Lessons  
**Source**: docs/features/deep-dives/final/core-lessons.md

---

## CL-01: List lessons (catalog)

**Title**: Browse lessons by level, topic, and exam tag

**As a** learner  
**I want** to see a filterable list of lessons (level, topic, exam) with progress badges (in progress, completed)  
**So that** I can choose what to learn next and see my progress at a glance.

**Acceptance criteria**

- [ ] GET /v1/lessons returns only published lessons.
- [ ] Query params: level, topic, exam_tag, limit (default 20, max 100), offset, sort (recommended | level | topic | recent).
- [ ] Response includes lessons[] (id, title, cefr_level, topic, duration_estimate_min, in_progress, completed) and total.
- [ ] in_progress and completed are derived from lesson_progress for authenticated user.
- [ ] Catalog does not check or consume usage cap.
- [ ] Empty result returns 200 with lessons=[], total=0.

**Preconditions**: User authenticated (optional for public catalog; then no progress badges). Profile may have user level for default filter.

**Postconditions**: No state change. Client can render list and apply filters.

---

## CL-02: Start a new lesson (under cap)

**Title**: Start a lesson and load content

**As a** learner  
**I want** to tap a lesson and load its content (steps, exercises, quiz) so that I can begin the lesson.

**Acceptance criteria**

- [ ] GET /v1/lessons/:id returns 200 with lesson content (content_payload, exercises[]) and progress (null or existing).
- [ ] If free user and no in_progress for this lesson: backend checks usage vs cap. If usage < cap, return 200. If usage >= cap, return 403 free_cap_reached with usage and cap in body.
- [ ] Trial and premium users always get 200 (no cap check).
- [ ] If lesson not found or not published, return 404.
- [ ] Response includes progress.last_step_index when status=in_progress (resume path).

**Preconditions**: User authenticated. Lesson exists and is published. For free user: under daily lesson cap (or 403).

**Postconditions**: Client has content to render; optional progress for resume. No usage incremented yet.

---

## CL-03: Resume a lesson

**Title**: Continue from last checkpoint

**As a** learner  
**I want** to open an in-progress lesson and continue from where I left off  
**So that** I don’t lose progress after closing the app or losing network.

**Acceptance criteria**

- [ ] When user has lesson_progress with status=in_progress for lesson_id, GET /v1/lessons/:id does not run cap check and returns 200 with progress (last_step_index).
- [ ] Client resumes from last_step_index (or next step). If last_step_index exceeds current steps length (e.g. content changed), server clamps or treats as 0.
- [ ] No 403 for resume regardless of usage.

**Preconditions**: lesson_progress exists with status=in_progress for (user_id, lesson_id).

**Postconditions**: Same as start; client renders from correct step.

---

## CL-04: Checkpoint progress during lesson

**Title**: Save progress at each step

**As a** learner  
**I want** my progress to be saved automatically as I move through steps  
**So that** I can resume later if I leave or lose connection.

**Acceptance criteria**

- [ ] POST /v1/progress/lesson with lesson_id, step_index, completed: false returns 200 and upserts lesson_progress (status=in_progress, last_step_index=step_index).
- [ ] Validation: lesson_id required; step_index within lesson steps (or clamp). 400 if invalid.
- [ ] Idempotent for same (user_id, lesson_id, step_index); last write wins.
- [ ] No usage increment; no Gamification call.

**Preconditions**: User authenticated. Lesson exists. Optional: progress already in_progress.

**Postconditions**: lesson_progress updated. Client can continue to next step or leave.

---

## CL-05: Complete lesson (submit quiz)

**Title**: Submit quiz and see summary (score, XP, streak)

**As a** learner  
**I want** to submit my quiz answers and see my score, XP gained, and streak  
**So that** I know how I did and am motivated to continue.

**Acceptance criteria**

- [ ] POST /v1/progress/lesson with lesson_id, completed: true, score (required), optional answers returns 200 and { saved, completed, score, xp_awarded?, streak_updated? }.
- [ ] Backend: (1) If already completed for (user_id, lesson_id), return 200 idempotent with existing score; no double usage or XP. (2) Else upsert lesson_progress status=completed, score, completed_at. (3) Increment usage for (user_id, period_key). (4) Call Gamification.award. (5) Call Personalization activity-event (and optional SR). (6) Return 200.
- [ ] Score validated (e.g. 0–100). 400 if missing or out of range.
- [ ] If Gamification or Personalization fails after persistence, still return 200; log and optionally retry downstream.

**Preconditions**: User authenticated. Lesson exists. Progress in_progress or first complete. Quiz step completed on client.

**Postconditions**: lesson_progress completed; usage incremented; XP and streak updated; activity-event sent; client shows summary.

---

## CL-06: See cap reached and upsell

**Title**: Free user at daily limit sees upsell

**As a** free learner who has completed the daily lesson limit  
**I want** to see a clear message and “Upgrade” or “Come back tomorrow” when I try to start a new lesson  
**So that** I understand the limit and can upgrade or return later.

**Acceptance criteria**

- [ ] When free user at cap tries GET /v1/lessons/:id for a new lesson (no in_progress), API returns 403 with body { error: { code: "free_cap_reached", message: "..." }, usage: { lessons_today, lessons_cap } }.
- [ ] Client shows modal or inline message with usage (e.g. “5/5 lessons today”) and primary CTA Upgrade, secondary “Come back tomorrow.”
- [ ] No lesson content returned. Usage not incremented.

**Preconditions**: Free user. usage_counts.lessons_completed_count >= cap for current period.

**Postconditions**: User sees upsell; no state change.

---

## CL-07: Quiz retry and correct answers

**Title**: Retry quiz once and see correct answers

**As a** learner  
**I want** to retry a failed quiz once and then see correct answers if I still fail  
**So that** I can learn from mistakes without being blocked.

**Acceptance criteria**

- [ ] When score < pass_threshold (e.g. 0.7) and retry not yet used, client shows “Try again” and allows second submit with new answers.
- [ ] After second submit (or first if passed), client shows correct answers if failed and then “Continue” to summary.
- [ ] Only one completion (POST with completed=true) is sent; retry is client-side only. Server records final score.
- [ ] quiz_passed event when score >= pass_threshold; quiz_failed otherwise (analytics).

**Preconditions**: Lesson has quiz step with pass_threshold. Client tracks retry_count (0 or 1).

**Postconditions**: User sees result and optional correct answers; then summary.

---

## CL-08: View progress and Continue on Home

**Title**: See “Continue” lesson and progress list

**As a** returning learner  
**I want** to see my in-progress lesson(s) and completed history on Home or Learn  
**So that** I can continue where I left off or see my progress.

**Acceptance criteria**

- [ ] GET /v1/progress/lessons returns list of lesson_progress for user (optional filter: status=in_progress | completed).
- [ ] Response includes lesson_id, lesson_title, status, last_step_index, score, completed_at, updated_at.
- [ ] “Continue” uses in_progress items (e.g. latest by updated_at). Tapping opens GET /v1/lessons/:id (resume path).
- [ ] Client shows “Continue [Lesson title]” and optional progress list/history.

**Preconditions**: User authenticated. Optional: at least one lesson_progress row.

**Postconditions**: None. Read-only.
