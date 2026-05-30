# AI Content Generation Pipeline — Generate, Validate, Optional Review

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

This document defines the **AI content generation pipeline**: how the system generates content (quiz items, example sentences, reflection lessons, etc.) using prompt templates and LLM, validates output, and optionally routes to human review before publish.

---

## 2. Scope

- **In scope**: Trigger; template selection; input build; LLM call; parse and validate; save draft or publish; review routing; failure handling.
- **Out of scope**: LLM provider integration (integrations); prompt body (stored in DB).

---

## 3. Inputs

| Input | Source |
|-------|--------|
| **Trigger** | User action (e.g. "generate quiz"), scheduled job (e.g. expand vocabulary examples), or reflection submit. |
| **Template code** | From trigger (e.g. quiz_generation, reflection_lesson_generation). |
| **Context** | Vocabulary terms, scenario, reflection text, learner level, locale. |
| **Constraints** | max_items, level, num_questions. |

---

## 4. Pipeline Steps

1. **Select template**: Load prompt_templates by code (and locale); get template_body, input_schema, output_schema, constraints.
2. **Build input**: Build input object from context; validate against input_schema; sanitize (no PII).
3. **Call LLM**: Inject input into template; send to LLM; respect max_tokens and temperature from constraints.
4. **Parse output**: Extract JSON from response; parse to object.
5. **Validate**: Validate against output_schema; run content-quality-rules (length, safety); run moderation on all text fields.
6. **Save**: Create content rows (e.g. exercises, lesson) with status=draft; source=ai_generated; set prompt_template_id and optional input_hash for audit.
7. **Review routing**: If policy requires review (see ai-content-generation-policies), assign to reviewer or add to sampling queue; else optional auto-approve path.
8. **Audit**: Log template_id, version, input_hash, output_hash, validation result, created entity ids.

---

## 5. Validation Checkpoints

- **Input**: input_schema validation; PII check; length.
- **Output**: output_schema validation; content-quality-rules; moderation API on every string field.
- **Pedagogy**: Optional check (vocabulary in quiz exists; level consistent). On failure: reject and do not save; retry optional.

---

## 6. Failure Modes

| Failure | Behavior |
|---------|----------|
| **LLM timeout** | Retry once; then fail; return fallback or error to user. |
| **Parse error** | Retry once with "output valid JSON only"; then fail; do not save. |
| **Validation fail** | Do not save; log; return error or fallback. |
| **Moderation flag** | Do not save; log; alert if repeated. |
| **Rate limit** | Queue or return "try again later". |

---

## 7. Automation and Review

- **Auto-approve**: Only when policy allows and quality metrics (e.g. validation pass rate) are above threshold; otherwise draft + review.
- **Sampling**: Random sample of generated content sent to reviewer queue; feedback used to tune template or validation.
- **Kill switch**: Disable pipeline or template via config; no new generations when disabled.

---

## 8. Outputs

- **DB**: New rows (exercises, lessons, vocabulary examples) with status=draft and source=ai_generated; or status=published if auto-approved.
- **Audit**: Log entry (no PII) for each run.
- **User**: If user-triggered (e.g. reflection lesson), return lesson id or payload; if batch, report count and any failures.

---

## 9. Dependencies

- **prompt-library-architecture.md**, **prompt-input-schema.md**, **prompt-output-schema.md**.
- **ai-content-generation-policies.md**.
- **content-validation-pipeline.md**.
- **content-governance.md** (review routing).
