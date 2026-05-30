# Database Schema — Content & Language Platform

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

This document defines the **physical database schema** for content and language entities: tables, columns, types, indexes, and constraints. It supports vocabulary, grammar, scenarios, lessons, exercises, prompts, exam prep, pronunciation, and runtime content at scale.

---

## 2. Scope

- **In scope**: Table definitions for all content domains; indexes for query patterns; FK relationships; JSONB usage where appropriate.
- **Out of scope**: User/auth tables (see existing backend/data specs); application-level validation rules (see content-quality-rules).

---

## 3. Conventions

- **IDs**: UUID or bigint; PKs as `id`; FKs as `{entity}_id` (e.g. `scenario_id`).
- **Timestamps**: `created_at`, `updated_at` (UTC).
- **Soft delete**: Optional `deleted_at` for content that may be restored; otherwise hard delete with versioning.
- **Locale**: `locale` VARCHAR(10) BCP 47 (e.g. `nl`, `en-GB`); or `language_id` FK to `languages` table.
- **JSONB**: Used for flexible payloads (e.g. lesson steps, prompt variables); index with GIN where queried.

---

## 4. Reference Tables

### 4.1 locales

| Column | Type | Constraints |
|--------|------|--------------|
| id | BIGSERIAL | PK |
| code | VARCHAR(10) | UNIQUE, NOT NULL (BCP 47) |
| name | VARCHAR(100) | |
| is_teaching_language | BOOLEAN | DEFAULT false |
| created_at, updated_at | TIMESTAMPTZ | |

### 4.2 cefr_levels

| Column | Type | Constraints |
|--------|------|--------------|
| id | BIGSERIAL | PK |
| code | VARCHAR(5) | UNIQUE (A0, A1, A2, B1, B2, C1, C2) |
| sort_order | INT | |
| created_at, updated_at | TIMESTAMPTZ | |

### 4.3 content_types

| Column | Type | Constraints |
|--------|------|--------------|
| id | BIGSERIAL | PK |
| code | VARCHAR(50) | UNIQUE (vocabulary_lesson, grammar_lesson, scenario_simulation, etc.) |
| category | VARCHAR(50) | (lesson, exercise, scenario, exam) |
| created_at, updated_at | TIMESTAMPTZ | |

### 4.4 scenario_categories

| Column | Type | Constraints |
|--------|------|--------------|
| id | BIGSERIAL | PK |
| code | VARCHAR(50) | UNIQUE (cafe, restaurant, supermarket, ...) |
| name_key | VARCHAR(100) | i18n key |
| sort_order | INT | |
| created_at, updated_at | TIMESTAMPTZ | |

---

## 5. Vocabulary

### 5.1 vocabulary_terms

| Column | Type | Constraints |
|--------|------|--------------|
| id | BIGSERIAL | PK |
| locale | VARCHAR(10) | NOT NULL, FK or ref to locales |
| lemma | VARCHAR(255) | NOT NULL |
| base_form | VARCHAR(255) | normalized form |
| cefr_level_id | BIGINT | FK cefr_levels |
| part_of_speech | VARCHAR(50) | (noun, verb, adjective, ...) |
| translations | JSONB | [{ "locale": "en", "text": "..." }] |
| example_sentences | JSONB | [{ "text": "...", "translation": "..." }] |
| pronunciation_hints | TEXT | |
| phoneme_guidance | JSONB | IPA or phoneme sequence |
| scenario_tags | TEXT[] or JSONB | array of scenario category codes |
| grammar_rule_ids | BIGINT[] | or JSONB array of ids |
| synonyms | TEXT[] or JSONB | |
| related_term_ids | BIGINT[] | |
| frequency_score | DECIMAL(5,4) | 0–1 or corpus frequency |
| difficulty_score | DECIMAL(5,4) | 0–1 |
| is_verified | BOOLEAN | DEFAULT false (human/AI verified) |
| source | VARCHAR(50) | (authored, ai_generated, imported) |
| version | INT | DEFAULT 1 |
| created_at, updated_at | TIMESTAMPTZ | |

**Indexes**: (locale, cefr_level_id), (locale, part_of_speech), (locale), GIN(scenario_tags), GIN(lemma gin_trgm_ops) if full-text search.

### 5.2 vocabulary_translations (optional normalized)

| Column | Type | Constraints |
|--------|------|--------------|
| id | BIGSERIAL | PK |
| vocabulary_term_id | BIGINT | FK vocabulary_terms |
| locale | VARCHAR(10) | |
| translation_text | TEXT | |
| created_at, updated_at | TIMESTAMPTZ | |

---

## 6. Grammar

### 6.1 grammar_rules

| Column | Type | Constraints |
|--------|------|--------------|
| id | BIGSERIAL | PK |
| locale | VARCHAR(10) | NOT NULL |
| name | VARCHAR(255) | |
| description | TEXT | |
| rule_type | VARCHAR(50) | (tense, agreement, word_order, ...) |
| cefr_level_id | BIGINT | FK |
| structure_example | TEXT | |
| examples | JSONB | [{ "nl": "...", "en": "..." }] |
| common_mistakes | JSONB | |
| related_rule_ids | BIGINT[] | |
| vocabulary_term_ids | BIGINT[] | optional |
| is_verified | BOOLEAN | DEFAULT false |
| source | VARCHAR(50) | |
| version | INT | DEFAULT 1 |
| created_at, updated_at | TIMESTAMPTZ | |

**Indexes**: (locale, cefr_level_id), (locale, rule_type).

---

## 7. Scenarios

### 7.1 scenarios

| Column | Type | Constraints |
|--------|------|--------------|
| id | BIGSERIAL | PK |
| locale | VARCHAR(10) | NOT NULL |
| external_id | VARCHAR(100) | UNIQUE per locale (slug) |
| scenario_category_id | BIGINT | FK scenario_categories |
| title | VARCHAR(255) | |
| title_key | VARCHAR(100) | i18n key optional |
| context | TEXT | situation description |
| goals | JSONB | ["goal1", "goal2"] |
| vocabulary_term_ids | BIGINT[] or JSONB | or link table |
| key_phrases | JSONB | [{ "phrase": "...", "translation": "..." }] |
| grammar_focus_ids | BIGINT[] | FK grammar_rules |
| cultural_notes | JSONB | |
| ai_roleplay_instructions | JSONB | system prompt fragment, role, constraints |
| difficulty_level | VARCHAR(20) | (A1, A2, B1, ...) or cefr_level_id |
| common_mistakes | JSONB | |
| is_verified | BOOLEAN | DEFAULT false |
| source | VARCHAR(50) | |
| version | INT | DEFAULT 1 |
| created_at, updated_at | TIMESTAMPTZ | |

**Indexes**: (locale, scenario_category_id), (locale, difficulty_level), (locale), (external_id, locale).

---

## 8. Lesson Templates and Lessons

### 8.1 lesson_templates

| Column | Type | Constraints |
|--------|------|--------------|
| id | BIGSERIAL | PK |
| code | VARCHAR(50) | UNIQUE (vocabulary_guided, grammar_quiz, scenario_simulation, ...) |
| name | VARCHAR(255) | |
| content_type_id | BIGINT | FK content_types |
| structure_schema | JSONB | defines steps, exercise slots, options |
| default_cefr_min, default_cefr_max | VARCHAR(5) | |
| is_active | BOOLEAN | DEFAULT true |
| version | INT | DEFAULT 1 |
| created_at, updated_at | TIMESTAMPTZ | |

### 8.2 lessons

| Column | Type | Constraints |
|--------|------|--------------|
| id | BIGSERIAL | PK |
| locale | VARCHAR(10) | NOT NULL |
| lesson_template_id | BIGINT | FK lesson_templates |
| external_id | VARCHAR(100) | UNIQUE per locale |
| title | VARCHAR(255) | |
| title_key | VARCHAR(100) | optional i18n |
| cefr_level_id | BIGINT | FK |
| topic | VARCHAR(100) | |
| content_payload | JSONB | steps, cards, quiz config, refs to vocabulary/scenario |
| status | VARCHAR(20) | (draft, review, published, archived) |
| source | VARCHAR(50) | (authored, ai_generated, runtime) |
| content_version_id | BIGINT | FK content_versions optional |
| version | INT | DEFAULT 1 |
| published_at | TIMESTAMPTZ | |
| created_at, updated_at | TIMESTAMPTZ | |

**Indexes**: (locale, lesson_template_id), (locale, cefr_level_id), (locale, status), (external_id, locale).

### 8.3 exercise_templates

| Column | Type | Constraints |
|--------|------|--------------|
| id | BIGSERIAL | PK |
| code | VARCHAR(50) | UNIQUE (multiple_choice, fill_blank, sentence_order, ...) |
| name | VARCHAR(255) | |
| input_schema | JSONB | expected structure of inputs |
| output_schema | JSONB | expected structure of answers |
| grading_logic | VARCHAR(50) | (exact_match, partial, ai_scored) |
| feedback_schema | JSONB | structure of feedback |
| version | INT | DEFAULT 1 |
| created_at, updated_at | TIMESTAMPTZ | |

### 8.4 exercises

| Column | Type | Constraints |
|--------|------|--------------|
| id | BIGSERIAL | PK |
| lesson_id | BIGINT | FK lessons (nullable if standalone) |
| exercise_template_id | BIGINT | FK exercise_templates |
| locale | VARCHAR(10) | |
| external_id | VARCHAR(100) | |
| payload | JSONB | question, options, correct answer, audio_ref, etc. |
| order_index | INT | within lesson |
| source | VARCHAR(50) | |
| version | INT | DEFAULT 1 |
| created_at, updated_at | TIMESTAMPTZ | |

**Indexes**: (lesson_id), (exercise_template_id), (locale).

---

## 9. Prompts

### 9.1 prompt_templates

| Column | Type | Constraints |
|--------|------|--------------|
| id | BIGSERIAL | PK |
| code | VARCHAR(100) | UNIQUE (tutor_correction, roleplay_turn, quiz_generation, ...) |
| purpose | VARCHAR(255) | |
| locale | VARCHAR(10) | optional; default for language |
| template_body | TEXT | with placeholders {{ var }} |
| input_schema | JSONB | required/optional vars |
| output_schema | JSONB | expected structure |
| constraints | JSONB | max_tokens, safety, pedagogy |
| safety_requirements | JSONB | moderation, block list |
| is_active | BOOLEAN | DEFAULT true |
| version | INT | DEFAULT 1 |
| created_at, updated_at | TIMESTAMPTZ | |

**Indexes**: (code), (locale).

---

## 10. Exam Prep

### 10.1 exam_types

| Column | Type | Constraints |
|--------|------|--------------|
| id | BIGSERIAL | PK |
| code | VARCHAR(50) | UNIQUE (civic_a2, integration_b1, ...) |
| name | VARCHAR(255) | |
| locale | VARCHAR(10) | |
| created_at, updated_at | TIMESTAMPTZ | |

### 10.2 exam_modules

| Column | Type | Constraints |
|--------|------|--------------|
| id | BIGSERIAL | PK |
| exam_type_id | BIGINT | FK exam_types |
| code | VARCHAR(50) | (reading, listening, speaking, writing, civic_knowledge) |
| name | VARCHAR(255) | |
| sort_order | INT | |
| created_at, updated_at | TIMESTAMPTZ | |

### 10.3 exam_tasks

| Column | Type | Constraints |
|--------|------|--------------|
| id | BIGSERIAL | PK |
| exam_module_id | BIGINT | FK exam_modules |
| locale | VARCHAR(10) | |
| external_id | VARCHAR(100) | |
| task_type | VARCHAR(50) | (multiple_choice, open_response, fill_blank, ...) |
| cefr_level_id | BIGINT | FK |
| prompt | TEXT | |
| payload | JSONB | questions, options, correct answers, audio_ref, rubric |
| scoring_criteria | JSONB | |
| time_limit_seconds | INT | |
| version | INT | DEFAULT 1 |
| created_at, updated_at | TIMESTAMPTZ | |

**Indexes**: (exam_module_id), (locale, cefr_level_id).

---

## 11. Pronunciation

### 11.1 pronunciation_targets

| Column | Type | Constraints |
|--------|------|--------------|
| id | BIGSERIAL | PK |
| locale | VARCHAR(10) | NOT NULL |
| vocabulary_term_id | BIGINT | FK vocabulary_terms optional |
| target_word_or_phrase | VARCHAR(255) | |
| phoneme_structure | JSONB | IPA or phoneme breakdown |
| stress_pattern | VARCHAR(100) | |
| learner_difficulty | VARCHAR(20) | or score |
| example_audio_ref | VARCHAR(500) | URL or asset_id |
| scoring_thresholds | JSONB | { "good": 80, "acceptable": 60 } |
| corrective_feedback_templates | JSONB | [{ "condition": "stress", "template": "..." }] |
| is_verified | BOOLEAN | DEFAULT false |
| version | INT | DEFAULT 1 |
| created_at, updated_at | TIMESTAMPTZ | |

**Indexes**: (locale), (vocabulary_term_id).

---

## 12. Cultural Context

### 12.1 cultural_context_entries

| Column | Type | Constraints |
|--------|------|--------------|
| id | BIGSERIAL | PK |
| locale | VARCHAR(10) | NOT NULL |
| scenario_id | BIGINT | FK scenarios optional |
| topic | VARCHAR(100) | |
| do_s | JSONB | ["do1", "do2"] |
| dont_s | JSONB | |
| notes | TEXT | |
| source | VARCHAR(50) | |
| version | INT | DEFAULT 1 |
| created_at, updated_at | TIMESTAMPTZ | |

---

## 13. Content Versioning

### 13.1 content_versions

| Column | Type | Constraints |
|--------|------|--------------|
| id | BIGSERIAL | PK |
| entity_type | VARCHAR(50) | (lesson, scenario, exercise, vocabulary_term, ...) |
| entity_id | BIGINT | NOT NULL |
| version_number | INT | NOT NULL |
| snapshot_payload | JSONB | full or diff snapshot |
| change_reason | VARCHAR(255) | |
| created_by | VARCHAR(100) | user or system |
| created_at | TIMESTAMPTZ | |

**Indexes**: (entity_type, entity_id), (entity_type, entity_id, version_number) UNIQUE.

---

## 14. Runtime-Generated Content Cache (optional)

### 14.1 runtime_lesson_cache

| Column | Type | Constraints |
|--------|------|--------------|
| id | BIGSERIAL | PK |
| cache_key_hash | VARCHAR(64) | UNIQUE (hash of profile_hash, template_id, scenario_id, seed) |
| lesson_id | BIGINT | FK lessons (generated instance) or payload JSONB |
| prompt_template_id | BIGINT | FK |
| learner_profile_snapshot | JSONB | level, goals, weak_skills (anonymized or hashed) |
| expires_at | TIMESTAMPTZ | TTL |
| created_at | TIMESTAMPTZ | |

**Indexes**: (cache_key_hash), (expires_at) for cleanup.

---

## 15. Scalability Notes

- **Partitioning**: Consider partitioning `lessons`, `exercises`, `vocabulary_terms` by `locale` if row count per locale exceeds millions.
- **Archiving**: Move old versions to `content_versions` or archive table; keep only latest version in main table where applicable.
- **JSONB**: Use GIN index on `content_payload`, `translations`, `key_phrases` where filter/containment queries are needed.
- **Read replicas**: Content is read-heavy; use replicas for listing and search; primary for writes and versioning.
