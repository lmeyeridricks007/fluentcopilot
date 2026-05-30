# Lesson Template System — Structure and Instantiation

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

This document defines the **lesson template system**: how lessons are constructed from templates, the template schema, and runtime instantiation logic so the platform can support thousands of lessons with consistent structure and pedagogy.

---

## 2. Scope

- **In scope**: Lesson template schema (structure_schema); lesson types; step and exercise slots; instantiation (from template + content refs or AI generation); relationship to exercises.
- **Out of scope**: Exercise template detail (see exercise-template-system); API (backend).

---

## 3. Lesson Types (Template Codes)

| Code | Description | Typical steps |
|------|-------------|----------------|
| vocabulary_guided | Vocabulary introduction and practice | intro → vocab list → example → flashcard/quiz |
| grammar_guided | Grammar rule + examples + practice | rule → examples → fill_blank/quiz |
| flashcard_session | Standalone flashcards | card stack (vocabulary or grammar refs) |
| guided_dialogue | Step-by-step dialogue | prompt 1 → user response → prompt 2 → ... |
| quiz_lesson | Quiz only | question set (exercise refs) |
| listening_lesson | Listening + questions | audio → questions |
| pronunciation_drill | Pronunciation targets | target 1 → repeat → target 2 → ... |
| scenario_simulation | AI scenario (wrapped in lesson) | intro → scenario start (AI) → debrief |
| exam_prep_lesson | Exam-style task(s) | task 1 → task 2 → ... |
| reflection_generated | Runtime-generated from reflection | variable (see prompt output schema) |

---

## 4. Template Schema (structure_schema)

JSONB on lesson_templates. Defines the shape of a lesson instance.

**Example (vocabulary_guided):**

```json
{
  "version": 1,
  "steps": [
    { "type": "intro", "slot": "title", "required": true },
    { "type": "vocabulary_list", "slot": "vocabulary_refs", "max_items": 20 },
    { "type": "example_sentences", "slot": "examples", "optional": true },
    { "type": "exercise_block", "slot": "exercise_ids", "template_codes": ["multiple_choice", "flashcard"], "min": 1, "max": 5 }
  ],
  "options": {
    "show_translations": true,
    "allow_skip": false
  }
}
```

**Example (scenario_simulation):**

```json
{
  "version": 1,
  "steps": [
    { "type": "intro", "slot": "scenario_context", "required": true },
    { "type": "scenario_start", "slot": "scenario_id", "required": true },
    { "type": "debrief", "slot": "debrief_prompt", "optional": true }
  ]
}
```

- **steps**: Ordered list of step types and slots. Each slot is filled in the lesson instance's content_payload.
- **slot**: Key in content_payload (e.g. vocabulary_refs = array of vocabulary_term_ids; scenario_id = id).
- **template_codes**: For exercise_block, which exercise templates are allowed.
- **options**: Default behavior (show_translations, allow_skip, etc.).

---

## 5. Lesson Instance (content_payload)

Lesson row has content_payload JSONB that conforms to its template's structure_schema.

**Example (vocabulary_guided instance):**

```json
{
  "title": "Greetings and introductions",
  "vocabulary_refs": [101, 102, 103],
  "examples": [{"nl": "Hallo!", "en": "Hello!"}],
  "exercise_ids": [201, 202],
  "cefr_level": "A1"
}
```

- **Validation**: On save, validate content_payload against lesson_templates.structure_schema (required slots present; types correct; refs exist).
- **Exercises**: exercise_ids point to exercises table; those exercises have lesson_id = this lesson.

---

## 6. Runtime Instantiation Logic

| Step | Action |
|------|--------|
| 1 | Load lesson_template by code; get structure_schema. |
| 2 | Resolve content refs: vocabulary (by level, topic, or explicit ids), scenario (by id or category), or use AI generation to fill slots. |
| 3 | For each step with slot, fill slot: from request (e.g. scenario_id), from recommendation (vocabulary set), or from AI output (parsed to schema). |
| 4 | Create exercises if step type = exercise_block: create exercise rows with exercise_template_id and payload; link to lesson. |
| 5 | Persist lesson row with content_payload and status (draft or published per pipeline). |
| 6 | Optional: validate against content-quality-rules; run moderation on any generated text. |

**Pre-authored lesson**: content_payload is authored directly; no runtime generation; same validation.

**AI-generated lesson**: Prompt template output is parsed to content_payload shape; then same validation and persist.

---

## 7. Versioning and Template Changes

- When lesson_template.structure_schema changes (new version), existing lessons retain old payload shape. New lessons use new schema. Optional migration job to upgrade old lessons or mark "legacy".
- Lesson instance has version; template_id points to template; template version can be stored on lesson for audit ("created with template version 2").

---

## 8. Dependencies

- **database-schema.md**: lesson_templates, lessons tables.
- **content-entities.md**: Lesson and lesson template.
- **exercise-template-system.md**: Exercise blocks in lessons.
- **prompt-output-schema.md**: If lesson is generated, output must match content_payload schema.
- **content-quality-rules.md**: Validation rules for payload.
