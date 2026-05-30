# Prompt Output Schema — Expected Output Shapes

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

This document defines **expected output shapes** for prompt templates: structure and fields so that LLM output can be parsed, validated, and used safely (tutor correction, quiz questions, reflection lesson, etc.).

---

## 2. Scope

- **In scope**: Output schema per template category; types; required fields; validation.
- **Out of scope**: Template body (in DB); parsing implementation (backend).

---

## 3. Common Output Shapes

### 3.1 tutor_correction

```json
{
  "correction": "string (corrected sentence, Dutch)",
  "explanation": "string (brief explanation, optional in learner locale)"
}
```

### 3.2 quiz_generation

```json
{
  "questions": [
    {
      "question_text": "string",
      "options": [{ "id": "A", "text": "string" }, ...],
      "correct_option_id": "string",
      "explanation": "string (optional)"
    }
  ]
}
```

### 3.3 reflection_lesson_generation

Must conform to lesson content_payload schema (see lesson-template-system). Example:

```json
{
  "title": "string",
  "steps": [
    { "type": "intro", "content": "string" },
    { "type": "vocabulary", "terms": [{ "lemma": "string", "meaning": "string" }] },
    { "type": "exercise", "question": "string", "correct_answer": "string" }
  ],
  "cefr_level": "string"
}
```

### 3.4 level_adaptation

```json
{
  "adapted_text": "string"
}
```

### 3.5 pronunciation_coaching_feedback

```json
{
  "feedback_text": "string",
  "tip": "string (optional)"
}
```

### 3.6 exam_feedback

```json
{
  "feedback": "string",
  "score_breakdown": [{ "criterion": "string", "points": number }]
}
```

### 3.7 vocabulary_example_sentence

```json
{
  "sentence_nl": "string",
  "translation": "string"
}
```

### 3.8 scenario_debrief

```json
{
  "debrief_text": "string"
}
```

---

## 4. Validation

- **Parse**: LLM response must be parseable (JSON); if markdown or plain text, strip and parse JSON block.
- **Schema**: Parsed object must conform to output_schema (required fields present; types correct; length within bounds).
- **Content**: Run content-quality-rules (no PII, no harmful); moderation on all string fields.
- **Failure**: If parse or validation fails, retry once or return fallback (e.g. generic correction message); log failure.

---

## 5. Storage

- **output_schema** in prompt_templates table: JSON schema for each template. Used at runtime to validate LLM response before use.
- **Versioning**: When template version changes, output_schema can change; ensure runtime uses correct version.

---

## 6. Dependencies

- **prompt-template-catalog.md**: Template codes.
- **lesson-template-system.md**: reflection_lesson content_payload shape.
- **content-quality-rules.md**: Validation rules.
- **database-schema.md**: prompt_templates.output_schema.
