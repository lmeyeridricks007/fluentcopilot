# Content Validation Pipeline — Automated Checks

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

This document defines the **content validation pipeline**: automated checks (schema, length, safety, pedagogy) that run on every content create/update so that only valid content can be saved or published.

---

## 2. Scope

- **In scope**: When validation runs; what is checked; pass/fail behavior; integration with ingestion and AI pipelines.
- **Out of scope**: Human review (content-review-process); release (content-release-process).

---

## 3. Triggers

- **On save** (draft create or update): Validate before persisting; reject if fail.
- **On submit for review**: Re-validate; block submit if fail.
- **On publish**: Final validation; block publish if fail.
- **In pipelines**: Ingestion and AI generation pipelines call validation as a step; do not save if validation fails.

---

## 4. Checks (Summary)

| Check category | What | Implementation |
|----------------|------|----------------|
| **Schema** | Required fields present; types correct; refs (FK) exist | Per content type (see content-quality-rules); DB constraint where possible |
| **Length** | All string fields within max length | Per content-quality-rules |
| **Safety** | No PII; no harmful content; moderation on text | PII pattern scan; moderation API or block list |
| **Pedagogy** | CEFR in set; vocabulary/grammar refs exist; no contradiction (optional) | Ref existence; allowed value sets |
| **Format** | Valid JSON where applicable; valid locale/BCP 47 | Parse and enum check |

---

## 5. Per-Entity Validation

- **Vocabulary**: lemma, base_form, cefr_level_id, part_of_speech, translations (≥1); scenario_tags in allowed set; no PII in lemma/translations/examples; moderation on text.
- **Grammar**: name, description, rule_type, cefr_level_id, examples (≥1); same safety.
- **Scenario**: context, goals, key_phrases, ai_roleplay_instructions, difficulty_level; scenario_category_id exists; moderation.
- **Lesson**: content_payload conforms to template structure_schema; refs exist; moderation on title and any free text in payload.
- **Exercise**: payload conforms to exercise_template input_schema; correct_answer valid; moderation.
- **Prompt template**: body, input_schema, output_schema, constraints, safety_requirements; placeholders match input_schema.
- **Exam task**: prompt, payload, scoring_criteria; task_type in set; moderation.
- **Pronunciation target**: target_word_or_phrase, scoring_thresholds, corrective_feedback_templates; same safety.
- **Cultural context**: do_s, dont_s; moderation.

---

## 6. Pass/Fail Behavior

- **Pass**: Content is saved (or submitted/published); validation result logged (optional).
- **Fail**: Content is not saved; return validation errors (field, message) to caller; caller (UI or pipeline) shows errors or retries.
- **Partial**: For batch, per-item pass/fail; save only passing items; return list of failures.

---

## 7. Failure Modes

- **Moderation API down**: Option A: fail validation (safe). Option B: allow with flag "moderation_pending"; run moderation async and quarantine if flag. Prefer A for publish path.
- **Ref check slow**: Cache ref existence (cefr_levels, scenario_categories) or validate in transaction; timeout and fail if needed.
- **False positive PII**: Tune pattern; allow override with reviewer approval (logged).

---

## 8. Dependencies

- **content-quality-rules.md**: Full rule set.
- **content-entities.md**: Entity definitions.
- **database-schema.md**: Constraints.
- **ai-content-generation-policies.md**: Additional AI output checks.
