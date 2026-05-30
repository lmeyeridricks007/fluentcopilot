# Prompt Library Architecture — Structure and Governance

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

This document defines the **prompt library architecture**: how prompt templates are stored, versioned, and used for tutor correction, roleplay, quiz generation, dialogue expansion, level adaptation, pronunciation coaching, reflection lesson generation, and exam feedback; and how safety and output shape are enforced.

---

## 2. Scope

- **In scope**: Template storage (prompt_templates table); structure (body, input_schema, output_schema, constraints, safety); versioning; usage at runtime; governance.
- **Out of scope**: LLM provider API (integrations); frontend copy (i18n).

---

## 3. Template Structure

Each prompt template has:

| Component | Description |
|-----------|-------------|
| **code** | Unique identifier (e.g. tutor_correction, roleplay_turn, quiz_generation). |
| **purpose** | Short description for maintainers. |
| **locale** | Optional; default teaching language for template text. |
| **template_body** | Text with placeholders {{ var_name }}. |
| **input_schema** | JSON schema or key list: required/optional variables and types. |
| **output_schema** | Expected structure of LLM output (for parsing and validation). |
| **constraints** | max_tokens, temperature, pedagogy rules (e.g. "only Dutch in response"). |
| **safety_requirements** | Moderation, block list, no PII in prompt/output. |
| **is_active** | If false, not used at runtime. |
| **version** | Immutable after publish; new version = new row or version_number. |

---

## 4. Prompt Categories (By Purpose)

| Category | Purpose | Examples |
|----------|---------|----------|
| **Tutoring** | Correct learner output; explain mistake | tutor_correction, grammar_feedback |
| **Roleplay** | AI plays role in scenario | roleplay_turn, roleplay_system |
| **Generation** | Generate quiz, dialogue, lesson | quiz_generation, dialogue_expansion, reflection_lesson_generation |
| **Adaptation** | Adapt content to level | level_adaptation, simplify_phrase |
| **Pronunciation** | Coaching feedback text | pronunciation_coaching_feedback |
| **Exam** | Exam-style feedback | exam_feedback |
| **Reflection** | Generate lesson from reflection | reflection_lesson_generation |

---

## 5. Versioning and Immutability

- **Draft**: Template can be edited; not used in production.
- **Active**: Once active, prefer creating a new version (new row or version_number) over editing; old version retained for audit and rollback.
- **Runtime**: System loads template by code (and optionally version or "latest"); injects variables; sends to LLM; parses output against output_schema.

---

## 6. Safety and Governance

- **Input sanitization**: No learner PII in template variables that are sent to LLM; anonymize or hash where needed.
- **Output validation**: All output parsed and validated against output_schema; moderation on raw output before use.
- **Audit**: Log template code and version on each use; no logging of full prompt/output with PII.
- **Governance**: Prompt templates require review and approval (content-governance); changes require new version.

---

## 7. Scalability

- **Hundreds of templates**: Stored in prompt_templates table; index by code, locale. No single monolithic prompt file.
- **Multi-language**: Templates can have locale-specific rows (e.g. tutor_correction_nl, tutor_correction_en for UI language of feedback).
- **Caching**: Compiled prompt (with variables filled) can be cached by (code, version, input_hash) for repeated same input if needed.

---

## 8. Dependencies

- **prompt-template-catalog.md**: Codes and purposes.
- **prompt-input-schema.md**: Standard input shapes.
- **prompt-output-schema.md**: Standard output shapes.
- **ai-content-generation-policies.md**: Safety and constraints.
- **database-schema.md**: prompt_templates table.
