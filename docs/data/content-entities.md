# Content Entities — Definitions and Lifecycle

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

This document defines **content entities** in detail: attributes, lifecycle states, ownership, and how they relate to templates, versioning, and localization. It is the authority for what each content type contains and how it is used.

---

## 2. Scope

- **In scope**: Vocabulary, grammar, scenario, lesson, exercise, prompt, exam, pronunciation, cultural context; entity states and transitions.
- **Out of scope**: Pipeline implementation (see pipelines); governance roles (see content-governance).

---

## 3. Entity Definitions

### 3.1 Vocabulary Term

| Attribute | Description | Required |
|-----------|-------------|----------|
| id | Unique identifier | Yes |
| locale | Teaching language (BCP 47) | Yes |
| lemma | Canonical form (e.g. "lopen") | Yes |
| base_form | Normalized form for matching | Yes |
| cefr_level | A0–C2 | Yes |
| part_of_speech | noun, verb, adjective, adverb, etc. | Yes |
| translations | One or more locale → text | Yes (at least one) |
| example_sentences | NL + translation; 1–3 typical | Recommended |
| pronunciation_hints | Text hint for learner | Optional |
| phoneme_guidance | IPA or phoneme sequence for TTS/assessment | Optional |
| scenario_tags | Scenario categories this term appears in | Optional |
| grammar_rule_ids | Rules that use this term | Optional |
| synonyms / related_term_ids | For expansion and variety | Optional |
| frequency_score | 0–1 or corpus frequency | Optional |
| difficulty_score | 0–1 for ordering | Optional |
| is_verified | Passed validation and optional review | Yes |
| source | authored, ai_generated, imported | Yes |
| version | Incremented on edit | Yes |

**Lifecycle**: draft → in_review → verified → published. Soft delete or archive; no hard delete without version history.

---

### 3.2 Grammar Rule

| Attribute | Description | Required |
|-----------|-------------|----------|
| id | Unique identifier | Yes |
| locale | Teaching language | Yes |
| name | Short name (e.g. "Present tense regular") | Yes |
| description | Pedagogical explanation | Yes |
| rule_type | tense, agreement, word_order, etc. | Yes |
| cefr_level | A0–C2 | Yes |
| structure_example | Example pattern | Recommended |
| examples | Multiple NL + translation | Yes |
| common_mistakes | Typical errors and corrections | Optional |
| related_rule_ids | Prerequisites or follow-ups | Optional |
| is_verified, source, version | As for vocabulary | Yes |

**Lifecycle**: Same as vocabulary (draft → in_review → verified → published).

---

### 3.3 Scenario

| Attribute | Description | Required |
|-----------|-------------|----------|
| id | Unique identifier | Yes |
| locale | Teaching language | Yes |
| external_id | Stable slug (e.g. cafe, doctor_visit) | Yes |
| scenario_category_id | FK to scenario_categories | Yes |
| title | Display title | Yes |
| context | Situation description (for learner and AI) | Yes |
| goals | Learning/communication goals | Yes |
| vocabulary_term_ids | Terms to emphasize | Optional |
| key_phrases | Phrases with translations | Yes |
| grammar_focus_ids | Grammar rules to practice | Optional |
| cultural_notes | Do's, don'ts, tips | Optional |
| ai_roleplay_instructions | System prompt fragment, role, constraints | Yes (for AI simulations) |
| difficulty_level | CEFR or composite | Yes |
| common_mistakes | What to avoid | Optional |
| is_verified, source, version | As above | Yes |

**Lifecycle**: draft → in_review → verified → published → archived (optional).

---

### 3.4 Lesson Template

| Attribute | Description | Required |
|-----------|-------------|----------|
| id | Unique identifier | Yes |
| code | Unique code (e.g. vocabulary_guided) | Yes |
| name | Human-readable name | Yes |
| content_type_id | FK content_types | Yes |
| structure_schema | JSON schema: steps, exercise slots, options | Yes |
| default_cefr_min / max | Applicable level range | Optional |
| is_active | Available for instantiation | Yes |
| version | Incremented on change | Yes |

**Lifecycle**: Active/inactive; versioned; no "draft" for template (only for instances). Template changes can spawn new lesson versions when instances exist.

---

### 3.5 Lesson (Instance)

| Attribute | Description | Required |
|-----------|-------------|----------|
| id | Unique identifier | Yes |
| locale | Teaching language | Yes |
| lesson_template_id | FK lesson_templates | Yes |
| external_id | Stable slug per locale | Yes |
| title | Display title | Yes |
| cefr_level_id | Target level | Yes |
| topic | Topic or theme tag | Optional |
| content_payload | Steps, cards, quiz config, refs (vocabulary, scenario) | Yes |
| status | draft, in_review, published, archived | Yes |
| source | authored, ai_generated, runtime | Yes |
| content_version_id | Current version pointer | Optional |
| version | Incremented on edit | Yes |
| published_at | When first published | When status=published |

**Lifecycle**: draft → in_review → published. published → archived (no direct draft from published without new version).

---

### 3.6 Exercise Template

| Attribute | Description | Required |
|-----------|-------------|----------|
| id | Unique identifier | Yes |
| code | multiple_choice, fill_blank, sentence_order, etc. | Yes |
| name | Human-readable | Yes |
| input_schema | JSON schema for question/inputs | Yes |
| output_schema | JSON schema for answer(s) | Yes |
| grading_logic | exact_match, partial, ai_scored | Yes |
| feedback_schema | Structure of feedback (correct, incorrect, hint) | Yes |
| version | Incremented on change | Yes |

**Lifecycle**: Active; versioned. Used by exercises.

---

### 3.7 Exercise (Instance)

| Attribute | Description | Required |
|-----------|-------------|----------|
| id | Unique identifier | Yes |
| lesson_id | Parent lesson (nullable if standalone) | Optional |
| exercise_template_id | FK exercise_templates | Yes |
| locale | Teaching language | Yes |
| payload | Question, options, correct answer, audio_ref, etc. | Yes |
| order_index | Order within lesson | When lesson_id present |
| source, version | As above | Yes |

**Lifecycle**: Tied to lesson or standalone; versioned with lesson or independently.

---

### 3.8 Prompt Template

| Attribute | Description | Required |
|-----------|-------------|----------|
| id | Unique identifier | Yes |
| code | tutor_correction, roleplay_turn, quiz_generation, etc. | Yes |
| purpose | Short description | Yes |
| locale | Optional; default language | Optional |
| template_body | Text with {{ placeholders }} | Yes |
| input_schema | Required/optional variables | Yes |
| output_schema | Expected AI output structure | Yes |
| constraints | max_tokens, safety, pedagogy | Yes |
| safety_requirements | Moderation, block list | Yes |
| is_active | Available for use | Yes |
| version | Immutable after publish; new version = new row or version id | Yes |

**Lifecycle**: draft → active. Once active, prefer new version over edit to preserve audit.

---

### 3.9 Exam Task

| Attribute | Description | Required |
|-----------|-------------|----------|
| id | Unique identifier | Yes |
| exam_module_id | reading, listening, speaking, writing, civic | Yes |
| locale | Teaching language | Yes |
| task_type | multiple_choice, open_response, etc. | Yes |
| cefr_level_id | Target level | Yes |
| prompt | Task instruction | Yes |
| payload | Questions, options, correct answers, audio_ref, rubric | Yes |
| scoring_criteria | For human or AI scoring | Yes |
| time_limit_seconds | Optional | Optional |
| version | As above | Yes |

**Lifecycle**: draft → in_review → published; aligned to exam_types and exam_modules.

---

### 3.10 Pronunciation Target

| Attribute | Description | Required |
|-----------|-------------|----------|
| id | Unique identifier | Yes |
| locale | Teaching language | Yes |
| vocabulary_term_id | Link to term (optional) | Optional |
| target_word_or_phrase | Text to pronounce | Yes |
| phoneme_structure | IPA or phoneme breakdown | Recommended |
| stress_pattern | For feedback | Optional |
| learner_difficulty | Difficulty tier | Optional |
| example_audio_ref | URL or asset_id | Recommended |
| scoring_thresholds | good / acceptable / poor | Yes |
| corrective_feedback_templates | Condition → template | Yes |
| is_verified, source, version | As above | Yes |

**Lifecycle**: Same as vocabulary (draft → verified → published).

---

### 3.11 Cultural Context Entry

| Attribute | Description | Required |
|-----------|-------------|----------|
| id | Unique identifier | Yes |
| locale | Teaching language | Yes |
| scenario_id | Optional link to scenario | Optional |
| topic | Topic or scenario theme | Yes |
| do_s / dont_s | Arrays of do/don't | Yes |
| notes | Additional context | Optional |
| source, version | As above | Yes |

**Lifecycle**: draft → published; can be attached to scenarios.

---

## 4. Entity Relationships (Summary)

- **Vocabulary** ↔ **Grammar**: N:M (terms used in rules; rules apply to terms).
- **Vocabulary** ↔ **Scenario**: N:M (terms tagged to scenarios).
- **Scenario** → **Lesson**: Scenario can be context for a lesson (lesson references scenario_id).
- **Lesson template** → **Lesson**: 1:N (template instantiates many lessons).
- **Exercise template** → **Exercise**: 1:N.
- **Lesson** → **Exercise**: 1:N (lesson contains exercises).
- **Prompt template** → **Runtime lesson**: Used to generate lesson content; no direct FK required (referenced by code or id at runtime).
- **Exam module** → **Exam task**: 1:N.
- **Pronunciation target** ↔ **Vocabulary term**: Optional 1:1 or N:1.
- **Content version** → Any entity: 1:N per entity (entity_id + entity_type).

---

## 5. State Transitions

| Entity | States | Allowed transitions |
|--------|--------|---------------------|
| Vocabulary, Grammar, Pronunciation, Cultural | draft, in_review, verified, published | draft→in_review→verified→published; published→archived (optional) |
| Scenario | draft, in_review, verified, published, archived | Same |
| Lesson, Exercise | draft, in_review, published, archived | draft→in_review→published; published→archived |
| Lesson/Exercise template | active, inactive | Versioned; no state machine for template itself |
| Prompt template | draft, active | draft→active; new version for changes |

---

## 6. Dependencies

- **database-schema.md**: Physical tables implementing these entities.
- **content-versioning.md**: How version is stored and history retained.
- **content-governance.md**: Who can transition states; approval rules.
