# Exam Preparation — Deep-Dive Specification

## 1. Purpose

Exam Preparation provides practice aligned to Dutch integration exams: A2, B1, KNM (and optionally ONA). Content is mapped to exam components (reading, listening, speaking, writing, KNM) and levels (IS-004, IS-005). Progress is tracked per component; optional simulated full exam. This spec covers FD-09: scope, content model, progress, entitlement, and integration with Lesson Engine and content pipeline.

## 2. Core Concept

- **Exam modules**: Content organized by exam type (A2, B1) and component (reading, listening, speaking, writing, KNM); format reflects official exam where documented (IS-005).
- **Practice**: Tasks and exercises per component; user completes them; score and progress stored; optional timed full exam simulation.
- **Premium**: Full exam prep suite is premium (FD09-FR-004); free tier may have limited set.

## 3. Why This Feature Exists

- **Conversion and retention**: Exam-focused users are high intent (BFR-012); strong conversion driver.
- **Alignment**: IS-004 (map to components/level), IS-005 (format), IS-006 (track official exam changes and adapt content).

## 4. User / Business Problems Solved

- Learners prepare for A2/B1/KNM with aligned practice and progress visibility.
- Business monetizes exam prep; content roadmap can adapt to exam changes (IS-006).

## 5. Scope

### 6. In Scope

- Exam-prep content mapped to reading, listening, speaking, writing, KNM (and ONA if in scope) and level A2/B1 (FD09-FR-001).
- Practice formats that reflect official exam where documented (IS-005) (FD09-FR-002).
- Track progress per exam component and level; support simulated exam flow (timed, full run) (FD09-FR-003).
- Gate full exam prep by entitlement; free tier limited (e.g. sample only) (FD09-FR-004).
- Handle “content not yet available” (e.g. component coming soon) and exam format changes (IS-006).

### 7. Out of Scope

- Content authoring and curriculum design (Content doc); this spec consumes exam content and task definitions.
- Core lessons (FD-02) and listening (FD-05) mechanics; exam prep reuses or composes them (e.g. listening tasks as exam-style).
- Official exam registration or results; only practice and simulated exam inside the app.

## 8. Main User Personas

- **Integration candidate**: Goal = integration exam; target A2 or B1; uses full suite.
- **Free user**: Tries sample exam tasks; sees upsell for full prep.
- **Working professional**: May use B1/work-focused components.

## 9. Main User Journeys

| Journey | Steps |
|--------|--------|
| **Practice by component** | Exam Prep → Choose exam (A2/B1) → Choose component (e.g. Reading) → List tasks → Complete task → Feedback + progress. |
| **Simulated exam** | Exam Prep → “Full practice exam” → Timed run through components → Submit → Results summary. |
| **Progress view** | Exam Prep → Dashboard: per-component progress, strengths, “Coming soon” for unavailable. |
| **Cap / entitlement** | Free user → Limited tasks or “Upgrade for full exam prep.” |

## 10. Triggering Events / Inputs

- **List modules/tasks**: GET /exam-prep/modules or /tasks (exam_type, component, level); filter by entitlement for premium content.
- **Start task**: GET /exam-prep/tasks/:id (content); POST progress on completion (reuse or extend FD-02/FD-05 pattern).
- **Start simulated exam**: POST /exam-prep/simulated/start { exam_type }; get sequence of tasks; submit answers at end or per section; POST /exam-prep/simulated/submit.
- **Progress**: GET /exam-prep/progress (per component, level); updated on task and simulated completion.

## 11. States / Lifecycle

- **Available**: Exam type and components with content; user can start tasks.
- **In progress**: User started task or simulated exam; answers in progress; submit when done.
- **Completed**: Task or simulated exam submitted; score and progress updated.
- **Coming soon**: Component or exam type with no content yet; show “Coming soon” or redirect to available (FD-09 edge case).

## 12. Business Rules

- **IS-004**: Map to exam components and level (A2, B1).
- **IS-005**: Practice format reflects official exam where documented.
- **IS-006**: Track exam structure changes (e.g. DUO/government); content roadmap adapts; product may show “Updated for 2025 exam” etc.
- **Premium**: Full exam prep gated; free may have limited tasks or sample only (FD09-FR-004).
- **Simulated exam**: Timed; optional per component; results summary (score per component, pass/fail indicator if threshold defined).

## 13. Configuration Model

- **Exam types**: A2, B1; optional KNM as separate or integrated; ONA if in scope.
- **Components**: reading, listening, speaking, writing, knm; each has task types and formats (from content pipeline).
- **Entitlement**: Which modules/tasks are free vs premium; config or DB flag.
- **Simulated exam**: Sequence of task IDs or template; duration; scoring weights per component.
- **Format changes**: IS-006 process: source of truth for official format; content pipeline and product roadmap align; optional “last updated” in UI.

## 14. Data Model

- **exam_modules** (or content taxonomy): id, exam_type (A2, B1), component (reading, listening, speaking, writing, knm), level, title, description, is_premium, sort_order, created_at, updated_at.
- **exam_tasks**: id, exam_module_id, task_type, content (JSONB or ref to lesson/exercise), duration_seconds, format_metadata (IS-005), version, created_at, updated_at. (Reference: exam-prep-content-model, database-schema.)
- **exam_progress**: user_id, exam_type, component, tasks_completed_count, last_task_id, score_aggregate or latest_score, updated_at.
- **exam_simulated_attempts**: id, user_id, exam_type, started_at, submitted_at, status (in_progress|submitted), answers (JSONB), score_per_component (JSONB), overall_score, created_at.
- **Progress**: Same as lesson/exercise completion where task is a lesson or listening exercise; link task to exam_module for aggregation.

## 15. Read Model / Projection Needs

- **Dashboard**: Per-component progress (tasks done, score trend); “Recommended next” (e.g. weak component); coming soon.
- **Simulated result**: Score per component; overall; pass/fail if threshold defined; history of attempts.
- **Catalog**: List tasks per module/component; filter by entitlement (show locked for premium).

## 16. APIs / Contracts

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| GET | `/v1/exam-prep/modules` | List exam types and components | Query: exam_type?, level? | 200 { modules[] }; premium marked; 403 for locked if requested |
| GET | `/v1/exam-prep/tasks` | List tasks for module/component | Query: module_id or exam_type, component, limit | 200 { tasks[] } |
| GET | `/v1/exam-prep/tasks/:id` | Get task content (start) | — | 200 { task }; 403 if premium and not entitled |
| POST | `/v1/exam-prep/progress` | Submit task completion (or reuse FD-02 progress) | { task_id, score, answers? } | 200 { updated progress } |
| GET | `/v1/exam-prep/progress` | User progress per component | — | 200 { by_exam_type, by_component } |
| POST | `/v1/exam-prep/simulated/start` | Start simulated exam | { exam_type } | 201 { attempt_id, task_ids[], duration_minutes }; 403 not entitled |
| POST | `/v1/exam-prep/simulated/submit` | Submit simulated exam | { attempt_id, answers[] } | 200 { score_per_component, overall, pass? }; 404 |
| GET | `/v1/exam-prep/simulated/attempts` | History of simulated attempts | Query: limit | 200 { attempts[] } |

## 17. Events / Async Flows

- **exam_prep_started**: task_id or attempt_id, exam_type, component (analytics).
- **exam_component_completed**: task or section; progress updated; optional Gamification (XP for exam tasks).
- **simulated_exam_completed**: attempt_id, scores (analytics).
- **Coming soon**: No event for unavailable component; UI only.

## 18. UI / UX Design

- **Exam prep hub**: Tabs or cards by exam type (A2, B1); by component (Reading, Listening, Speaking, Writing, KNM); progress bars; “Start” or “Continue”; locked icon for premium.
- **Task run**: Same as FD-02/FD-05 (reading passage + questions; listening + questions; etc.); timer optional per task.
- **Simulated exam**: Full-screen flow; timer; section by section; submit at end; results screen (score per component, overall, “You’re ready” or “Focus on X”).
- **Coming soon**: “Listening (B1) — Coming soon” or redirect to available components.

## 19. Main Screens / Components

- **ExamPrepDashboard**: Modules, progress, recommended next; simulated exam CTA.
- **ExamTaskScreen**: Renders task (reading/listening/speaking/writing/KNM); submit; reuse lesson/exercise components where possible.
- **SimulatedExamScreen**: Timer; sequence of tasks; submit; results.
- **ExamProgressView**: Per-component stats; history of simulated attempts.

## 20. Permissions / Security Rules

- **Authenticated**: All endpoints require auth; user sees only own progress and attempts.
- **Entitlement**: Premium required for full task list and simulated exam; 403 or locked for free user on premium content.
- **Content**: Tasks and modules filtered by level and exam type; no access to other users’ answers.

## 21. Notifications / Alerts / Side Effects

- **Gamification**: XP for task and simulated completion (optional; product decision).
- **Personalization**: Exam progress and weak components feed recommendations (e.g. “Practice B1 Reading”).
- **Optional push**: “Your exam prep progress” or “Simulated exam ready.”

## 22. Integrations / Dependencies

- **Content**: Exam modules and tasks from content pipeline (Content doc, exam-prep-content-model); versioning and IS-006 alignment.
- **Lesson Engine / FD-02, FD-05**: Task content may be lessons or listening exercises; reuse progress and completion APIs or extend with exam_task_id and exam_progress aggregation.
- **Entitlements**: Premium gate for full exam prep.
- **Personalization**: Progress and weak components for recommendations (FD-14).
- **FD-11 (Feedback)**: Optional feedback after task or simulated exam (strengths, next steps).

## 23. Edge Cases / Failure Cases

- **Content not available for component**: Show “Coming soon” or redirect to available (FD-09).
- **Exam format change**: IS-006; content roadmap updates; optional “Updated for [year] exam” in UI.
- **Simulated exam timeout**: If user doesn’t submit in time, auto-submit or mark incomplete; product rule.
- **Premium lost**: User had access; subscription lapsed; lock premium tasks and simulated; show upsell.
- **Duplicate submit**: Idempotent; first or last submit wins; no double progress.

## 24. Non-Functional Requirements

- **Latency**: Task load same as lessons (< 3s); simulated start and submit < 5s.
- **Availability**: Same as API; content from DB/CDN.
- **IS-006**: Process to track and adapt to official exam changes; content and product roadmap.

## 25. Analytics / Auditability Requirements

- **Events**: exam_prep_started, exam_component_completed, simulated_exam_completed. Include exam_type, component, task_id/attempt_id, score; no PII in payload.
- **Progress**: Stored for user history and support; optional export for learner.

## 26. Testing Requirements

- Unit: Entitlement check; progress aggregation; simulated scoring.
- Integration: GET modules/tasks; POST progress; simulated start and submit; 403 for premium when free.
- E2E: Complete task; run simulated exam; view progress; coming soon component.

## 27. Recommended Architecture

- **Exam prep service or Lesson Engine extension**: Serves exam modules and tasks; tasks may reference lesson/exercise IDs; progress aggregated per component; simulated exam as sequence of tasks with timer and single submit. Entitlements check for premium content.
- **Content**: exam_tasks and exam_modules in DB; content pipeline produces and versions (Content doc).

## 28. Recommended Technical Design

- **Task = lesson or exercise**: Reuse GET /lessons/:id or GET /listening/exercises/:id where task points to same content; add exam_task_id and exam_module_id for progress aggregation. Or dedicated exam task content type.
- **Simulated exam**: attempt_id; ordered list of task_ids; client or server enforces order and timer; submit all answers in one POST; server scores and returns breakdown.
- **IS-006**: Document source (e.g. DUO); review cycle (e.g. annual); update content and task format when structure changes.

## 29. Suggested Implementation Phasing

- **Phase 1**: Modules and task list; A2 reading and listening only; task completion and progress; entitlement for premium tasks.
- **Phase 2**: All components (reading, listening, speaking, writing, KNM); B1; simulated exam (one exam type).
- **Phase 3**: Simulated exam for all types; progress dashboard; “Coming soon”; IS-006 process and content updates.

## 30. Summary

Exam Preparation delivers A2/B1 (and KNM, ONA) aligned practice by component and optional simulated full exam. Content is mapped to official format (IS-004, IS-005); progress is tracked per component; full suite is premium. Implementation should reuse lesson/listening mechanics where possible, enforce entitlement, and handle “coming soon” and exam format changes (IS-006) in product and content process.
