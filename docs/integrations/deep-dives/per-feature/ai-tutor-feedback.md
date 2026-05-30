# AI Tutor Feedback — Per-Feature Integration Specification

**Feature**: FD-11 AI Tutor Feedback  
**Source**: docs/final/feature-domain-breakdown.md §13

---

## 1. Purpose

Specifies **integrations used by AI Tutor Feedback**: LLM to generate feedback (grammar, vocabulary, pronunciation, fluency, listening) from session/lesson data; content moderation (IS-017) for AI-generated text; analytics. Triggered after scenario, voice session, or lesson.

---

## 2. Feature Reference

- **Domain**: FD-11. **User goal**: Receive clear feedback after lessons/conversations. **Data dependencies**: Sessions, turns, pronunciation results; AI Conversation, Lesson Engine, Speech. **Moderation**: IS-017 if feedback is AI-generated.

---

## 3. Integrations Used (Summary)

| Integration | Role | Criticality |
|-------------|------|-------------|
| **LLM** | Generate feedback text from aggregated data (turns, errors, scores, level) | Critical |
| **Content moderation** | Moderate AI-generated feedback before persist and display (IS-017) | Critical |
| **Analytics** | feedback_viewed, feedback_practice_clicked | High |

---

## 4. Per-Integration Detail

- **LLM**: After activity end (scenario, voice, lesson), backend aggregates data; builds prompt; calls LLM; receives feedback text → moderate → persist and return. Can be sync (in request) or async (job). See [llm-orchestration.md](../../llm-orchestration.md). **Local**: Mock LLM (fixed feedback).
- **Moderation**: All AI feedback text must pass moderation before persist. See [content-safety-moderation.md](../../content-safety-moderation.md). **Local**: Mock pass.
- **Analytics**: Events when user views feedback and clicks “Practice.” See [analytics-provider.md](../../analytics-provider.md). **Local**: Mock.

---

## 5. Implementation Implications

- **Backend**: Feedback service (aggregate, prompt, LLM, moderate, persist); may be job after session/lesson end. **DB**: feedback records (activity_type, source_id, content, model_id). **UI**: Feedback screen (scores, tips, “Practice this” CTA); IS-016 (indicate AI). **Testing**: Mock LLM and moderation; assert blocked content not stored; E2E view feedback.

---

## 6. Summary

AI Tutor Feedback uses **LLM** and **moderation** in the generation path, and **analytics** for engagement. Can be sync or async; moderation is mandatory before storing or showing feedback.
