# Sub-Feature: Flashcards

**Feature**: Core Lessons (FD-02)  
**Sub-feature**: flashcards

---

## 1. Purpose

Deliver flashcard step or standalone flashcard session (vocabulary or grammar items); record flip/recall for spaced repetition (IS-008) and optional progress. Supports “Review flashcards” recommendation from Personalization.

---

## 2. Core Concept

- **In-lesson**: Step type vocabulary_list or exercise_block with template_codes including "flashcard"; render as cards (front/back); advance to next step; checkpoint as in lesson-progress.
- **Standalone**: “Review” flow loads items due from spaced repetition (getDueForReview); user flips/recalls; recordRecall(success); does not count toward lesson cap.

---

## 3. User Problems Solved

- Reinforce vocabulary/grammar; spaced repetition for retention. Review without starting a full lesson.

---

## 4. Trigger Conditions

- In lesson: user on flashcard step; next/checkpoint as usual. Standalone: user taps “Review flashcards”; load due items; submit recall results.

---

## 5. Inputs

- In-lesson: step with vocabulary_refs or exercise_ids (flashcard type). Standalone: user_id; getDueForReview(user_id) → item_ids; recordRecall(user_id, item_id, success).

---

## 6. Outputs

- In-lesson: progress checkpoint. Standalone: update spaced_repetition (next_due_at, recall counts); optional progress for “review session.”

---

## 7. Workflow / Lifecycle

- Load cards from vocabulary or exercises. User flips; client records success/fail per card. On step end (in-lesson) or session end (standalone): checkpoint or recordRecall batch. Spaced repetition service updates next_due_at.

---

## 8. Business Rules

- IS-008 (spaced repetition). Standalone review does not increment lesson usage (lesson-cap-enforcement). In-lesson flashcards are part of lesson progress.

---

## 9. Configuration Model

- Spaced repetition algorithm params (e.g. SM-2); max cards per session (optional).

---

## 10. Data Model

- **Read**: vocabulary_terms or exercises (flashcard payload). spaced_repetition (user_id, item_id, next_due_at). **Write**: lesson_progress (checkpoint) or spaced_repetition (recordRecall).

---

## 11. API Endpoints

- In-lesson: POST /progress/lesson (checkpoint). Standalone: POST /review/recall or internal recordRecall; GET /review/due (or from Personalization getDueForReview).

---

## 12.–24. Summary

- **Events**: Optional review_session_completed. **Integrations**: Lesson progress, Spaced Repetition, Personalization (recommendation). **UI**: FlashcardCard (front/back), flip animation, next. **Permissions**: Auth. **Errors**: No card due (empty list). **Implementation**: Lesson Engine for in-lesson; SR or Personalization for standalone. **Testing**: Unit: recordRecall. Integration: getDueForReview; recordRecall updates next_due. E2E: Complete flashcard step; do standalone review.
