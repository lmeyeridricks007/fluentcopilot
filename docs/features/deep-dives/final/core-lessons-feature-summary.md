# Core Lessons (FD-02) — Feature Summary

**Feature**: Core Lessons (Vocabulary, Grammar, Flashcards, Quizzes)  
**Spec**: core-lessons.md (implementation-grade, v2)  
**Location**: docs/features/deep-dives/final/core-lessons.md

---

## What Was Added

This iteration expanded the original Core Lessons deep-dive into a **full implementation-grade module specification** with:

- **37 structured sections** (per Feature Spec Per Feature prompt): Purpose, Core Concept, Why This Feature Exists, User/Business Problems, Scope (in/out), Personas, User Journeys, Triggering Events, **Commands/Actions**, States/Lifecycle, **State Transition Rules**, Business Rules, **Configuration/Admin Model**, Data Model, **Read Models/Projections**, **API Design** (with example payloads), **Information/Data Flows**, Events/Async Flows, **Integration Design**, UI Design, **Information Architecture**, Main Screens, **Reusable UI Components**, **UX Rules and Interaction Patterns**, **Accessibility and Usability**, **Recommended Frontend Technical Design**, **Recommended Backend Technical Patterns**, Permissions/Security, NFRs, Analytics/Auditability, **Example Journeys**, **Extensibility**, Testing Requirements, Phasing, Summary.

- **Concrete examples**: Example JSON for `content_payload`, `lesson_progress` (in_progress and completed), GET /lessons and GET /lessons/:id responses, POST /progress/lesson request/response, 403 `free_cap_reached` body with `usage`.

- **Explicit state machine**: not_started → in_progress → completed; in_progress → abandoned (implicit); idempotent complete; progress corruption handling (clamp or restart from 0).

- **Admin/configuration**: Config keys for free_tier cap, period_type, level_filter, checkpoint boundaries, quiz retry, catalog status; no code change needed for cap or period.

- **API contract**: Four endpoints with request/response and 403 shape; cap check at GET /lessons/:id for “start”; usage increment only on complete.

- **UI and UX**: Main screens (LessonList, LessonRun, LessonSummary, CapReachedModal, optional ProgressHistory); reusable components (LessonCard, StepRenderer, QuizQuestion, SummaryCard, CapReachedModal, CheckpointIndicator); UX rules (checkpoint, retry, back, cap); accessibility (WCAG 2.1 AA, screen reader, touch, i18n).

- **Integration design**: Table of systems (Entitlements, Gamification, Personalization, Spaced Repetition, Profile, Content) with direction and contract; error handling when downstream is down (persist completion, log/retry).

- **Example journeys**: Three end-to-end flows (first lesson under cap, free user at cap, resume) with API calls and outcomes.

- **Review feedback**: Clarifications added for review vs. cap (standalone review does not count toward cap), quiz pass/fail (score >= pass_threshold), concurrent complete (idempotent), and progress corruption (clamp or resume from 0).

---

## Major Design Decisions

1. **Cap enforced at lesson start, not at list**: GET /lessons/:id performs the cap check when the user attempts to “start” a lesson (no existing in_progress for that lesson). Usage is incremented only on completion. This avoids charging the user if they never complete.

2. **Idempotent complete**: POST /progress/lesson with completed=true is idempotent for (user_id, lesson_id). No double usage increment or double XP; first write wins. Handles duplicate submit (e.g. two tabs).

3. **Checkpoint at step boundaries**: Progress is saved at each step (or configurable step indices). Resume uses last_step_index; no “progress corrupt” failure—clamp or treat as start from 0 if content changed.

4. **Standalone review does not count toward cap**: Only full lesson completions increment the daily lesson count; flashcard/quiz-only review does not consume cap (product decision documented).

5. **Quiz pass/fail**: quiz_passed when score >= lesson pass_threshold (e.g. 0.7); quiz_failed otherwise; one retry then show correct answers and allow continue.

6. **Catalog level filter**: Configurable strict (lesson.level <= user.level) or stretch_1 (allow user.level+1). Only published lessons in catalog.

7. **Downstream on complete**: Completion triggers usage increment, Gamification (XP, streak), Personalization (activity-event), and spaced repetition. If Gamification or Personalization is down, completion is still persisted; events can be queued or retried so completion is not lost.

---

## Remaining Open Questions

1. **Period boundary**: Use user timezone vs. UTC for “day” (config: period_timezone). Product to confirm default (e.g. user timezone for fairness).

2. **Exact cap value**: Spec uses 5 as example; product/config will set (e.g. 3–5) per business.

3. **Spaced repetition payload**: Whether to send lesson_id only or item_ids (e.g. vocabulary_term_ids) to SR service; align with Personalization/SR service contract during implementation.

4. **Optional “abandoned” status**: Currently in_progress is kept; optional explicit status=abandoned after N days and hide from “Continue” if product wants.

5. **Rate limit**: Optional rate limit on POST /progress/lesson (e.g. 60/min per user); product/ops to decide.

---

## Implementation Readiness Status

| Audience | Status | Notes |
|----------|--------|--------|
| **Product** | Ready | Scope, rules, cap, and journeys are defined; can validate acceptance criteria and A/B (cap, retry). |
| **Backend** | Ready | APIs, data model, state transitions, integrations, and error handling are specified; can implement Lesson Engine and persist progress/usage. |
| **Frontend** | Ready | Screens, components, state, checkpoint/complete flow, and cap modal are specified; can implement Learn and lesson run. |
| **QA** | Ready | Example journeys, edge cases, and test requirements (unit, integration, E2E) are specified; can write and run tests. |

**Overall**: **Implementation-ready.** Review and audit passed. Minor open questions above do not block build; they can be closed during implementation or in a short follow-up spec update.
