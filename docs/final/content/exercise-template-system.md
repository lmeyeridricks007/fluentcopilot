# Exercise Template System — Input, Output, Grading, Feedback

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

This document defines the **exercise template system**: exercise types, input schema (question/options), expected output schema (answers), grading logic, and feedback structure so exercises can be authored or generated consistently and scored correctly.

---

## 2. Scope

- **In scope**: Exercise template codes; input and output schemas per type; grading (exact match, partial, AI-scored); feedback structure; relationship to lessons.
- **Out of scope**: Frontend rendering (UI); speech/pronunciation API (integrations).

---

## 3. Exercise Template Codes and Schemas

### 3.1 multiple_choice

| Field | Input (payload) | Output (answer) | Grading |
|-------|------------------|-----------------|---------|
| question | { "text": string, "audio_ref": optional } | selected_option_id: string | exact_match: correct_option_id |
| options | [{ "id": string, "text": string }] | | |
| correct_option_id | string | | |
| explanation | optional string | | Shown in feedback |

**Feedback**: correct → { "correct": true, "explanation" }; incorrect → { "correct": false, "correct_option_id", "explanation" }.

### 3.2 fill_blank

| Field | Input | Output | Grading |
|-------|--------|--------|---------|
| prompt | "Fill in the blank: ... ___ ..." | answer: string or string[] (if multiple blanks) | exact_match or normalized (trim, lowercase); optional accept_alternatives[] |
| correct_answer(s) | string or string[] | | |
| accept_alternatives | optional string[] | | For valid synonyms |

**Feedback**: correct/incorrect; show correct answer if incorrect.

### 3.3 sentence_order

| Field | Input | Output | Grading |
|-------|--------|--------|---------|
| words_or_sentences | string[] (shuffled) | order: number[] (indices) | exact_match to correct order |
| correct_order | number[] | | |

**Feedback**: correct/incorrect; show correct order.

### 3.4 listening_comprehension

| Field | Input | Output | Grading |
|-------|--------|--------|---------|
| audio_ref | URL or asset_id | | |
| question | text | answer: string or selected_option_id | exact_match or multiple_choice |
| correct_answer | string or option_id | | |
| options | optional (if MC) | | |

**Feedback**: correct/incorrect; optional replay.

### 3.5 pronunciation_repeat

| Field | Input | Output | Grading |
|-------|--------|--------|---------|
| target_text | string | | Backend: audio upload → speech API |
| pronunciation_target_id | optional FK | | Score from pronunciation API |
| scoring_thresholds | { "good": 80, "acceptable": 60 } | score, details | ai_scored (pronunciation API) |

**Feedback**: From corrective_feedback_templates in pronunciation_targets; e.g. "Stress on first syllable: LO-pen."

### 3.6 ai_roleplay

| Field | Input | Output | Grading |
|-------|--------|--------|---------|
| scenario_id | FK | conversation turns (stored separately) | No single "correct"; completion and optional quality from AI or rubric |
| goal | optional string | | |

**Feedback**: Per-turn tutor correction (from prompt); end-of-session summary optional.

### 3.7 writing_practice

| Field | Input | Output | Grading |
|-------|--------|--------|---------|
| prompt | text | user_text: string | ai_scored (LLM feedback) or human |
| model_answer | optional | | |
| rubric | optional | | |

**Feedback**: AI-generated correction and tips (from prompt template).

---

## 4. Grading Logic (Summary)

| Logic | Use case | Implementation |
|-------|----------|----------------|
| exact_match | MC, fill_blank (single), sentence_order | Compare answer to correct_answer; normalize if needed |
| partial | Fill_blank with multiple blanks; match each | Score = count_correct / total |
| ai_scored | Pronunciation, writing | Call speech or LLM; return score and feedback from API |
| completion | Roleplay, open-ended | Mark complete; optional qualitative feedback |

---

## 5. Feedback Structure (Schema)

Common feedback fields (in feedback_schema or returned by backend):

| Field | Type | When |
|-------|------|------|
| correct | boolean | For scored exercises |
| score | number | When applicable (pronunciation, partial) |
| correct_answer | string or object | When incorrect (for learner to see) |
| explanation | string | Optional |
| hint | string | Optional (e.g. "Remember the verb goes in position 2") |
| feedback_type | enum | correction, encouragement, tip |
| details | object | Pronunciation: phoneme feedback; Writing: bullet points |

---

## 6. Validation

- **Input**: Exercise payload must conform to exercise_templates.input_schema for that template code.
- **Output**: User answer must be parseable to exercise_templates.output_schema (e.g. selected_option_id string; order number[]).
- **Grading**: Backend uses exercise_templates.grading_logic and payload (correct_option_id, etc.) to compute result; return feedback per feedback_schema.

---

## 7. Dependencies

- **database-schema.md**: exercise_templates, exercises tables.
- **content-entities.md**: Exercise and exercise template.
- **pronunciation-dataset.md**: pronunciation_target_id and scoring.
- **prompt-template-catalog.md**: Writing feedback and roleplay prompts.
- **lesson-template-system.md**: Exercise blocks in lessons.
