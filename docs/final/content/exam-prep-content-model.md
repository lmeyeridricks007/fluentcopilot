# Exam Prep Content Model — Structure and Alignment

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

This document defines the **exam prep content model**: structures for exam types, modules (reading, listening, speaking, writing, civic knowledge), tasks, question formats, and scoring criteria aligned to CEFR and official Dutch exams (e.g. A2, B1, civic, integration).

---

## 2. Scope

- **In scope**: exam_types, exam_modules, exam_tasks schema; question formats; scoring criteria; alignment to CEFR and official specs.
- **Out of scope**: Actual exam delivery platform (product); proctoring (future).

---

## 3. Exam Types

| Code | Name | Typical CEFR | Use |
|------|------|--------------|-----|
| civic_a2 | Civic integration (A2) | A2 | KNM-style |
| integration_b1 | Language integration (B1) | B1 | Reading, listening, speaking, writing |
| state_exam | State exam practice | A2–B1 | Full exam sim |

- **exam_types** table: id, code, name, locale; one row per exam product.

---

## 4. Exam Modules

| Code | Name | Description |
|------|------|-------------|
| reading | Reading | Comprehension tasks |
| listening | Listening | Audio + questions |
| speaking | Speaking | Oral tasks / roleplay |
| writing | Writing | Written production |
| civic_knowledge | Civic knowledge | KNM / knowledge questions |

- **exam_modules** table: id, exam_type_id, code, name, sort_order. Each exam type has N modules.

---

## 5. Exam Task Schema

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| id | bigint | PK | Yes |
| exam_module_id | FK | reading, listening, etc. | Yes |
| locale | varchar(10) | | Yes |
| external_id | varchar(100) | Stable id | Yes |
| task_type | varchar(50) | multiple_choice, open_response, fill_blank, match, etc. | Yes |
| cefr_level_id | FK | | Yes |
| prompt | text | Task instruction | Yes |
| payload | JSONB | Questions, options, correct answers, audio_ref, rubric | Yes |
| scoring_criteria | JSONB | For human or AI scoring; rubric | Yes |
| time_limit_seconds | int | Optional | Optional |
| version | int | | Yes |

---

## 6. Question Formats (task_type)

| Code | Description | payload shape |
|------|-------------|---------------|
| multiple_choice | Single correct | questions[], options[], correct_option_id |
| multiple_choice_multi | Multiple correct | questions[], options[], correct_option_ids[] |
| fill_blank | Gap-fill | prompt with blanks, correct_answers[] |
| open_response | Short/long text | prompt, model_answer, rubric |
| matching | Match items | left[], right[], correct_pairs |
| ordering | Order items | items[], correct_order |
| listening | Audio + question | audio_ref, question, correct_answer or options |

---

## 7. Scoring Criteria (Schema)

- **Automated**: correct_option_id or correct_answers; exact or partial match.
- **Rubric**: For open_response or speaking: criteria array with points or levels; human or AI scores against rubric.
- **Stored in**: exam_tasks.scoring_criteria JSONB. Example: `{ "type": "rubric", "criteria": [{ "name": "grammar", "max_points": 5 }, { "name": "vocabulary", "max_points": 5 }] }`.

---

## 8. Alignment

- **CEFR**: Every task has cefr_level_id; filter practice by level.
- **Official specs**: Exam type aligns to official exam structure (e.g. Dutch integration exam sections); content authored or licensed to match.
- **Content**: Reading/listening tasks use vocabulary and grammar within level; speaking/writing can use scenario and prompt templates.

---

## 9. Sourcing and Validation

- **Source**: Authored to match official exam format; no AI-generated exam answers without verification. Practice tasks can use AI-generated distractors with validation.
- **Validation**: payload conforms to task_type schema; scoring_criteria valid; no PII in prompt; moderation on open content.
- **Scale**: Hundreds of tasks per exam type; index (exam_module_id), (locale, cefr_level_id).

---

## 10. Dependencies

- **database-schema.md**: exam_types, exam_modules, exam_tasks.
- **content-entities.md**: Exam task lifecycle.
- **exercise-template-system.md**: exam task as exercise type.
- **content-quality-rules.md**: Validation.
