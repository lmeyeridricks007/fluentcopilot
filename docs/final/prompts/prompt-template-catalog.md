# Prompt Template Catalog — Codes and Purposes

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

This document catalogs **prompt template codes**, purposes, inputs, and output types for the prompt library. It is the reference for which prompt to use for each use case (tutor correction, roleplay, quiz generation, etc.).

---

## 2. Scope

- **In scope**: Template code, purpose, high-level input/output, safety notes.
- **Out of scope**: Full template body (stored in DB); API (backend).

---

## 3. Catalog

| Code | Purpose | Key inputs | Output type | Safety |
|------|---------|------------|-------------|--------|
| **tutor_correction** | Correct learner sentence; explain error briefly | learner_sentence, correct_form, grammar_rule_id (optional), locale | { correction, explanation } | No PII; Dutch only in correction |
| **roleplay_system** | System prompt for AI role (scenario) | scenario_context, role, key_phrases, constraints | N/A (system message) | No PII; role only |
| **roleplay_turn** | Not used as standalone; turn is conversational | (handled by conversation API) | N/A | Moderation on each turn |
| **quiz_generation** | Generate multiple-choice or fill-blank from vocabulary | vocabulary_terms[], level, num_questions, locale | { questions[] } | No PII; validate against vocabulary |
| **dialogue_expansion** | Expand short dialogue to more lines | dialogue_seed[], level, scenario_id | { turns[] } | No PII; Dutch only |
| **level_adaptation** | Simplify or complexify text to target level | text, source_level, target_level, locale | { adapted_text } | No PII |
| **pronunciation_coaching_feedback** | Text feedback for pronunciation (after API score) | score, dimension_scores, target_word, condition | { feedback_text, tip } | No PII; from template |
| **reflection_lesson_generation** | Generate lesson from reflection entry | reflection_text, learner_level, locale | lesson content_payload (per schema) | No PII in output; moderate reflection input |
| **exam_feedback** | Feedback on exam practice task | task_type, user_answer, correct_answer, rubric | { feedback, score_breakdown } | No PII |
| **vocabulary_example_sentence** | Generate example sentence for vocabulary term | lemma, meaning, level, locale | { sentence_nl, translation } | No PII; validate lemma |
| **scenario_debrief** | Short debrief after scenario | scenario_id, summary_points[], locale | { debrief_text } | No PII |

---

## 4. Input and Output Schemas

- **Detailed input_schema and output_schema** per template are in prompt-input-schema.md and prompt-output-schema.md.
- **Template body** and constraints are stored in prompt_templates table; not duplicated here for security and single source of truth.

---

## 5. Usage by Feature

| Feature | Template(s) |
|---------|-------------|
| AI scenario conversation | roleplay_system (per scenario); turns via conversation API |
| Quiz (generated) | quiz_generation |
| Reflection lesson | reflection_lesson_generation |
| Tutor feedback on error | tutor_correction |
| Pronunciation feedback text | pronunciation_coaching_feedback |
| Level-adapted content | level_adaptation |
| Exam practice feedback | exam_feedback |
| Vocabulary expansion | vocabulary_example_sentence |
| Scenario debrief | scenario_debrief |

---

## 6. Dependencies

- **prompt-input-schema.md**: Input variable definitions.
- **prompt-output-schema.md**: Output structure definitions.
- **ai-content-generation-policies.md**: Safety and constraints.
- **database-schema.md**: prompt_templates table.
