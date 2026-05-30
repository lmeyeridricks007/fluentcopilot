# Content Quality Rules — Validation and Standards

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

This document defines **content quality rules**: validation checks (schema, length, safety, pedagogy) applied to all content before and after creation so that only correct, safe, and pedagogically sound content is published.

---

## 2. Scope

- **In scope**: Automated and manual checks; rules per content type; length limits; safety (no PII, no harmful); pedagogy (CEFR, consistency); failure handling.
- **Out of scope**: Pipeline implementation detail (see content-validation-pipeline); governance (see content-governance).

---

## 3. Schema Validation

- **Vocabulary**: lemma, base_form, cefr_level_id, part_of_speech, translations (≥1) required; translations[].locale and text non-empty; scenario_tags in allowed set if present.
- **Grammar**: name, description, rule_type, cefr_level_id, examples (≥1) required; examples[].nl and translation non-empty.
- **Scenario**: context, goals, key_phrases (≥1), ai_roleplay_instructions, difficulty_level required; scenario_category_id in allowed set.
- **Lesson**: content_payload conforms to lesson_template.structure_schema; required slots filled; refs (vocabulary_term_ids, scenario_id) exist.
- **Exercise**: payload conforms to exercise_template.input_schema; correct_answer/correct_option_id present and valid.
- **Prompt template**: template_body, input_schema, output_schema, constraints, safety_requirements required; placeholders in body match input_schema.

---

## 4. Length and Format Rules

| Content | Rule |
|---------|------|
| **Lemma / phrase** | Max length 255 (or per schema); no leading/trailing whitespace. |
| **Example sentence** | Max 500 chars (configurable); no control characters. |
| **Scenario context** | Max 2000 chars. |
| **Lesson title** | Max 255. |
| **Prompt body** | Max 50k chars (or per provider limit). |
| **Key phrases** | Max 10 per scenario (or configurable). |
| **Translations** | Max 1000 chars per translation. |

---

## 5. Safety Rules

| Rule | Check |
|------|--------|
| **No PII** | No email, phone, name, address in content text; automated scan or block list. |
| **No harmful** | Moderation API or block list on all user-facing text (lemma, translations, examples, scenario context, prompt output). |
| **No injection** | No executable code or script in text; sanitize if rendered in UI. |
| **Attribution** | Licensed/imported content has attribution; AI-generated marked. |

---

## 6. Pedagogy Rules

| Rule | Check |
|------|--------|
| **CEFR** | cefr_level_id in allowed set (A0–C2); content difficulty consistent with level. |
| **Consistency** | Vocabulary in lesson exists and is same locale; scenario refs exist; grammar rule refs exist. |
| **No contradiction** | Optional: cross-check grammar rules and definitions (manual or heuristic). |
| **Exam alignment** | Exam task payload and scoring_criteria match task_type; no unofficial answer keys in public content. |

---

## 7. Failure Handling

- **Schema fail**: Reject save; return validation errors to author or system.
- **Safety fail**: Reject; log; do not publish; optional alert for repeated failure.
- **Pedagogy fail**: Reject or flag for review; approver decides.
- **Length fail**: Reject or truncate (prefer reject with message).

---

## 8. Automated vs Manual

- **Automated**: Schema, length, PII scan, moderation API, ref existence. Run in content-validation-pipeline on every create/update.
- **Manual**: Pedagogy depth, cultural appropriateness, exam alignment. Reviewer checks before approve; sampling for AI-generated.

---

## 9. Dependencies

- **content-validation-pipeline.md**: Runs these rules.
- **content-entities.md**: Entity schemas.
- **database-schema.md**: Constraints and types.
- **ai-content-generation-policies.md**: Additional AI output rules.
