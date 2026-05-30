# Review: Core Lessons (FD-02) — Implementation-Grade Module Specification

**Document**: core-lessons.md (expanded v2)  
**Review date**: Per Feature Spec (Per Feature) workflow

---

## 1. Overall Assessment

The Core Lessons spec is **implementation-grade** and meets the per-feature prompt requirements. It expands the original deep-dive into 37 structured sections with concrete examples (payloads, records, APIs, state transitions, admin config, UI components). Backend, frontend, QA, and product can implement and verify the feature without ambiguity. The document is suitable for handoff to engineering and QA.

---

## 2. Strengths

- **Completeness**: All 37 requested sections are present and substantive (Purpose through Summary).
- **Concrete examples**: Example JSON for content_payload, lesson_progress (in_progress and completed), GET /lessons and GET /lessons/:id responses, POST /progress/lesson request/response, 403 payload.
- **State and lifecycle**: States (not_started, in_progress, completed, abandoned) and transition rules are explicit; idempotent complete and no double usage/XP are specified.
- **Commands/Actions**: Table of commands (List, Start, Checkpoint, Complete, Resume, Enforce cap) with preconditions and postconditions.
- **Configuration/Admin**: Config keys (free_tier cap, period_type, level_filter, checkpoint boundaries, quiz retry, etc.) with types and examples.
- **API design**: Four endpoints with request/response examples; 403 free_cap_reached and usage object documented.
- **Information flows**: Catalog, start, checkpoint, complete, and continue flows described step-by-step.
- **UI**: Main screens, reusable components (LessonCard, StepRenderer, QuizQuestion, SummaryCard, CapReachedModal), UX rules (checkpoint, retry, back, cap), and accessibility (IS-011, screen reader, touch, i18n).
- **Integration design**: Table of systems (Entitlements, Gamification, Personalization, Spaced Repetition, Profile, Content) with direction and contract.
- **Example journeys**: Three end-to-end journeys (first lesson under cap, at cap, resume) with API calls and outcomes.
- **Extensibility and testing**: New lesson/exercise types, cap by content type, A/B; unit, integration, and E2E test requirements.

---

## 3. Missing Functional Detail

- **Minor**: “Review only” (flashcards or quiz without full lesson) is mentioned in journeys and out-of-scope for “new” lesson start; whether review increments usage or counts toward cap is product decision. Spec could state explicitly: “Standalone review does not count toward lesson cap” (or does) to avoid ambiguity.
- **Minor**: Pass/fail threshold (e.g. 0.7) is in content_payload; whether quiz is “passed” for Gamification or analytics could be explicit (e.g. score >= pass_threshold → quiz_passed).

No critical functional gaps.

---

## 4. Missing Workflow Detail

- **None significant**: Start, checkpoint, complete, resume, and cap flows are detailed. Optional: explicit diagram for state machine (Mermaid) would add clarity but is not required for implementation.

---

## 5. Missing Data/API/Event Detail

- **Minor**: Spaced repetition recordCompletion payload (e.g. item_ids from lesson vocabulary_refs) not fully specified; spec says “lesson_id or item_ids.” Implementers can align with Personalization/SR service; acceptable.
- **Minor**: GET /lessons response schema for “in_progress” and “completed” on each lesson is present; pagination (total, limit, offset) is present. No gap.

Events (lesson_started, lesson_completed, lesson_abandoned, free_cap_reached, quiz_passed/failed) and consumers are documented. No critical gap.

---

## 6. Missing UI Detail

- **None**: Main screens, components, UX rules, and accessibility are covered. Detailed wireframes are out of scope (UI doc). Spec level is appropriate for frontend implementation.

---

## 7. Missing Integration Detail

- **None**: Entitlements (cap, usage), Gamification (award), Personalization (activity-event), Spaced Repetition, Profile, Content are listed with direction and contract. Error handling (Gamification/Personalization down: persist completion, log/retry) is noted. No missing integration.

---

## 8. Missing Edge Cases

- **Minor**: “Progress corrupt” (e.g. last_step_index > steps.length) is mentioned in journey exit; recovery (restart from 0 or clamp step_index) could be one sentence in Edge Cases or State Transition Rules. Not blocking.
- **Minor**: Concurrent complete (two tabs submit) — idempotent complete handles it; could be stated explicitly. Spec already says idempotent for (user_id, lesson_id).

No critical edge-case gaps.

---

## 9. Missing Technical Implementation Detail

- **None**: Frontend (state, checkpoint debounce, complete await, cap pre-check or 403 handling, routing) and backend (Lesson Engine, cap check, idempotent complete, transactions) are specified. Stack-agnostic but actionable.

---

## 10. Suggested Improvements

1. **Explicit cap rule for “review”**: Add one sentence: “Standalone review (flashcard/quiz-only) does [or does not] count toward daily lesson cap” per product decision.
2. **Pass/fail**: State that “quiz_passed” event is when score >= lesson’s pass_threshold (e.g. 0.7).
3. **Progress corruption**: In State Transition Rules or Edge Cases, add: “If last_step_index exceeds steps length (e.g. content changed), treat as resume from 0 or clamp to max step.”
4. **Concurrent complete**: In API or Business Rules, add: “Duplicate complete (e.g. two tabs) is idempotent; first write wins; no double usage or XP.”

---

## 11. Scorecard

| Category | Score | Notes |
|----------|--------|--------|
| Clarity | 10/10 | Structure and examples are clear. |
| Completeness | 9/10 | All 37 sections; minor explicit rules (review cap, pass/fail, corrupt progress). |
| Feature depth | 10/10 | Deep enough for implementation. |
| Technical usefulness | 10/10 | APIs, data, flows, and patterns actionable. |
| Implementation readiness | 9/10 | Ready; small additions above would round out. |
| Cross-module consistency | 10/10 | Integrations and BFR/FD refs aligned. |

**Overall**: Every score ≥ 9/10.

---

## 12. Confidence Rating

**98%** — Confident the spec is sufficient for implementation. Remaining 2%: product may clarify review vs. lesson for cap and pass_threshold semantics; spec supports both with one-sentence clarification.

---

## 13. Recommendation

**Approve with minor improvements.** Incorporate the four suggested improvements (review cap, pass/fail, progress corruption, concurrent complete) in next revision; not blocking for implementation. Proceed to audit and finalize.
