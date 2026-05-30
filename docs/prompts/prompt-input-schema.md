# Prompt Input Schema — Standard Input Shapes

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

This document defines **standard input shapes** for prompt templates: variable names, types, and constraints so that callers (backend, pipelines) can build prompt inputs consistently and templates can validate inputs.

---

## 2. Scope

- **In scope**: Input variables per template category; types; required vs optional; max lengths; allowed values.
- **Out of scope**: Template body text (in DB); output (see prompt-output-schema).

---

## 3. Common Variables

| Variable | Type | Max length | Use |
|----------|------|------------|-----|
| locale | string (BCP 47) | 10 | Teaching or response language |
| level | string (CEFR) or int | 5 | A0–C2 |
| learner_sentence | string | 500 | Learner's utterance (sanitized) |
| correct_form | string | 500 | Correct form for correction |
| vocabulary_terms | array of { id, lemma, meaning } | 20 items | For quiz generation |
| scenario_context | string | 2000 | Scenario description |
| role | string | 500 | AI role description |
| key_phrases | array of string | 50 items | Phrases for roleplay |
| reflection_text | string | 5000 | Reflection entry (sanitized; no PII) |
| text | string | 10000 | For level adaptation |
| target_word | string | 255 | For pronunciation feedback |
| score | number | 0–100 | Pronunciation score |
| condition | string | 50 | e.g. stress_wrong, phoneme_error |

---

## 4. Per-Template Input (Summary)

| Template code | Required | Optional |
|---------------|----------|----------|
| tutor_correction | learner_sentence, correct_form, locale | grammar_rule_id, level |
| roleplay_system | scenario_context, role, locale | key_phrases, constraints |
| quiz_generation | vocabulary_terms, level, locale, num_questions | scenario_id |
| dialogue_expansion | dialogue_seed, level, locale | scenario_id |
| level_adaptation | text, source_level, target_level, locale | — |
| pronunciation_coaching_feedback | score, target_word, condition, locale | dimension_scores |
| reflection_lesson_generation | reflection_text, learner_level, locale | scenario_id |
| exam_feedback | task_type, user_answer, correct_answer, locale | rubric |
| vocabulary_example_sentence | lemma, meaning, level, locale | — |
| scenario_debrief | scenario_id, summary_points, locale | — |

---

## 5. Validation

- **Required**: All required variables must be present and non-empty (or valid default).
- **Type**: Cast or validate type (string, number, array, object).
- **Length**: Enforce max length; reject or truncate (prefer reject).
- **Sanitization**: Remove or escape control characters; no script injection; learner_sentence and reflection_text must not contain PII (anonymize before send if needed).
- **Allowed values**: locale in allowed list; level in A0–C2; condition in allowed list for pronunciation.

---

## 6. Storage

- **input_schema** in prompt_templates table: JSON schema or key list. Example: `{ "required": ["learner_sentence", "correct_form", "locale"], "properties": { "learner_sentence": { "type": "string", "maxLength": 500 }, ... } }`.
- **Runtime**: Backend builds object from request and context; validates against input_schema; injects into template_body placeholders.

---

## 7. Dependencies

- **prompt-template-catalog.md**: Template codes.
- **prompt-library-architecture.md**: Template structure.
- **database-schema.md**: prompt_templates.input_schema.
