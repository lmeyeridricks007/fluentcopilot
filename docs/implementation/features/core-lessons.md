# Feature: Core Lessons (E-03)

**Epic**: E-03 Core Lessons  
**Source**: docs/features/deep-dives/final/core-lessons.md, docs/features/deep-dives/sub-features/core-lessons/

---

## Feature Purpose

Deliver CEFR-aligned vocabulary and grammar micro-lessons (intro, cards, exercises, quiz) with checkpointed progress, completion-driven usage and Gamification (XP, streak), and free-tier daily cap enforced at lesson start. Users can list lessons, start or resume a lesson, checkpoint progress, complete with quiz (and optional retry), and see summary and next steps. Free users see cap and upsell when limit reached. **Curriculum path** (extension): catalog and “next lesson” should default to the user’s **ordered path** for `active_study_level` when enabled; see `docs/feature-extensions/cefr-curriculum-path-overview.md` and `docs/implementation/features/cefr-curriculum-path.md`.

---

## Feature Scope

### In scope

- Lesson catalog: GET /v1/lessons with filter (level, topic, exam_tag), pagination, sort; only published; optional in_progress/completed badges per user.
- Lesson run: GET /v1/lessons/:id with cap check for new start; return content (steps, exercises, quiz) and progress for resume.
- Lesson progress: POST /v1/progress/lesson (checkpoint: step_index, completed=false; complete: completed=true, score, answers); GET /v1/progress/lessons.
- Lesson cap enforcement: Check usage vs cap at GET /lessons/:id for new start; 403 free_cap_reached with usage; increment usage only on completion.
- Quiz: Quiz step(s), submit score and answers; one retry on fail; pass/fail vs pass_threshold; correct answers after retry.
- Flashcards: In-lesson flashcard step or standalone review (spaced repetition); no cap for standalone review.
- Integrations: Entitlements (usage, cap), Gamification (award on complete), Personalization (activity-event), Spaced Repetition (recordCompletion).

### Out of scope

- Content authoring/CMS; consuming published lessons only.
- Scenario, voice, listening, exam prep flows (separate epics).
- Full offline delivery (degraded/cached only).

---

## Dependencies

- **Profile**: User level for catalog filter and recommendations.
- **Entitlements**: Tier (free/trial/premium), usage count and cap, increment on complete.
- **Content**: lessons, exercises, lesson_templates (published); media from CDN.
- **Gamification**: award(user_id, activity_type: "lesson", lesson_id, score) on complete.
- **Personalization**: POST /activity-event { event_type: "lesson_completed", ... } on complete.
- **Spaced Repetition**: recordCompletion(user_id, lesson_id) on complete (optional).

---

## Sub-Features Involved

| Sub-feature | Implementation scope |
|-------------|------------------------|
| lesson-catalog | GET /lessons; filter, pagination; join progress for badges |
| lesson-run | GET /lessons/:id; cap check; return content + progress |
| lesson-progress | POST /progress/lesson (checkpoint + complete); GET /progress/lessons |
| lesson-cap-enforcement | Cap check in lesson-run; usage increment in lesson-completion |
| lesson-completion | Persist completed, score; increment usage; call Gamification, Personalization, SR |
| quiz | Quiz step render; score calculation; retry; pass_threshold |
| flashcards | Flashcard step render; optional standalone review + recordRecall |

---

## Feature Completion Checklist

- [ ] UI: LessonListScreen (catalog + filters), LessonRunScreen (steps + quiz), LessonSummaryScreen, CapReachedModal, ProgressBar, StepRenderer, QuizQuestion, SummaryCard.
- [ ] Buttons/actions: List lessons, Start lesson, Next step, Checkpoint, Submit quiz, Retry quiz, Next lesson, Back to Home, Upgrade (cap modal).
- [ ] API: GET /v1/lessons, GET /v1/lessons/:id, POST /v1/progress/lesson, GET /v1/progress/lessons implemented.
- [ ] Backend: Lesson Engine (or equivalent) with catalog, run, progress, completion, cap check; integration with Entitlements, Gamification, Personalization.
- [ ] Database: lessons, lesson_progress, usage_counts (or in Entitlements), exercises tables and indexes.
- [ ] Background jobs: Optional queue for Gamification/Personalization if sync fails; not required for MVP.
- [ ] Integrations: Entitlements (get tier, get/increment usage), Gamification (award), Personalization (activity-event), SR (recordCompletion) wired.
- [ ] Seed/demo data: At least 5–10 published lessons (A0–A2), 2+ lesson templates, exercises and content_payload.
- [ ] Tests: Unit (cap logic, idempotent complete, score validation); integration (all endpoints, 403 at cap, downstream calls); E2E (full lesson run, resume, cap reached).
