# Sub-Feature: Quiz

**Feature**: Core Lessons (FD-02)  
**Sub-feature**: quiz

---

## 1. Purpose

Deliver quiz block (questions from exercises), accept user answers, score against correct answers, support one retry on fail, and pass score to lesson-completion for persistence and downstream (Gamification, analytics).

---

## 2. Core Concept

- **Quiz**: Last step(s) of lesson; type=quiz in content_payload; exercise_ids point to exercises (multiple_choice, fill_blank, etc.). Client renders questions; user submits; server scores (or client scores with server validation); score and pass/fail (vs pass_threshold) drive completion and events.
- **Retry**: If score < pass_threshold and retry_count=0, client allows “Try again”; second submit is final; then show correct answers and continue to summary.

---

## 3. User Problems Solved

- Assess understanding; reinforce learning. One retry reduces frustration; correct answers after support learning.

---

## 4. Trigger Conditions

- User on quiz step; submits answers (POST /progress/lesson with completed=true, score, answers). Optional: POST with completed=false, score, answers for “check only” (client can score locally and send for persistence); in this design single submit with completed=true carries score.

---

## 5. Inputs

- lesson_id, completed=true, score (0–100 or 0–1), answers: [{ exercise_id, selected_option_id | answer }]. Optional retry_count (client or server).

---

## 6. Outputs

- 200 with score; lesson-completion persists and triggers downstream. Client shows summary. If score < threshold and retry allowed, client shows retry UI; second submit no retry.
- Optional: feedback per question (correct/incorrect, correct_answer). Can be in response or client-computed from exercise payload.

---

## 7. Workflow / Lifecycle

- Client loads quiz exercises from lesson content. User answers. Submit → server validates and scores (or accepts client score). Server: score = correct_count / total or weighted; compare to pass_threshold (e.g. 0.7). Persist via lesson-completion. quiz_passed event if score >= threshold; quiz_failed else. Retry: client-side state (retry_count); second submit same API with new answers and score.

---

## 8. Business Rules

- FD02-FR-002 (quizzes). One retry on fail; then show correct answers (IS-007, pedagogy). pass_threshold in lesson content_payload.quiz (e.g. 0.7). Allow partial answers (product rule: score what’s present or require all).

---

## 9. Configuration Model

- quiz.retry_allowed: true. quiz.require_all_answers: false (allow partial). pass_threshold per lesson (e.g. 0.7).

---

## 10. Data Model

- **Read**: exercises (payload with correct_option_id, correct_answer). **Write**: score and answers passed to lesson-completion (lesson_progress.score, optional answers in payload or separate table). No separate quiz_attempts table required if lesson_progress holds score.

---

## 11. API Endpoints

- Same as lesson-completion: POST /v1/progress/lesson with completed=true, score, answers. Quiz is the final step; completion request includes quiz result.

---

## 12.–24. Summary

- **Events**: quiz_passed | quiz_failed (score >= threshold). **Integrations**: lesson-completion (receives score), Gamification (on complete), Analytics. **UI**: QuizQuestion, QuizResult (correct/incorrect, retry button), SummaryCard. **Permissions**: Auth; own lesson. **Errors**: 400 invalid answers. **Edge cases**: Partial submit; double submit (idempotent complete). **Performance**: Score in memory; no extra DB for quiz only. **Observability**: quiz_passed/failed events. **Implementation**: Scoring in Lesson Engine or client; server validates and persists. **Testing**: Unit: score calculation; pass threshold. Integration: Submit answers → completion with score. E2E: Pass and fail; retry once; see correct answers.
