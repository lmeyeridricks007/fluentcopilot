# Implementation Data Model

**Source**: docs/features/deep-dives/final/core-lessons.md, docs/final/data/database-schema.md, entitlement sub-features

This document defines tables, indexes, relationships, and example records required for implementation. Content and auth tables are referenced where needed.

---

## 1. Core Lessons

### 1.1 lessons

| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGSERIAL | PK |
| locale | VARCHAR(10) | NOT NULL |
| lesson_template_id | BIGINT | FK lesson_templates |
| external_id | VARCHAR(100) | UNIQUE per locale |
| title | VARCHAR(255) | |
| title_key | VARCHAR(100) | optional i18n |
| cefr_level_id | BIGINT | FK cefr_levels |
| topic | VARCHAR(100) | |
| topic_tags | TEXT[] or JSONB | optional |
| exam_tags | TEXT[] or JSONB | optional (e.g. ["A2","KNM"]) |
| content_payload | JSONB | steps, vocabulary_refs, exercise_ids, quiz config |
| status | VARCHAR(20) | draft, review, published, archived |
| version | INT | DEFAULT 1 |
| published_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Indexes**: (locale, cefr_level_id), (locale, status), (external_id, locale), GIN(topic_tags), GIN(exam_tags).

**Example content_payload (vocabulary_guided)**:

```json
{
  "steps": [
    { "type": "intro", "title_key": "lessons.food.intro", "duration_estimate_sec": 30 },
    { "type": "vocabulary_list", "vocabulary_refs": [101, 102, 103], "max_items": 10 },
    { "type": "example_sentences", "examples": [{ "nl": "Ik eet brood.", "en": "I eat bread." }] },
    { "type": "exercise_block", "exercise_ids": [201, 202], "template_codes": ["multiple_choice", "flashcard"] },
    { "type": "quiz", "exercise_ids": [301, 302, 303], "pass_threshold": 0.7 }
  ],
  "options": { "show_translations": true, "allow_skip": false }
}
```

### 1.2 lesson_progress

| Column | Type | Constraints |
|--------|------|-------------|
| user_id | UUID | PK (composite with lesson_id) |
| lesson_id | BIGINT | PK, FK lessons |
| status | VARCHAR(20) | not_started \| in_progress \| completed |
| last_step_index | INT | 0-based; NULL if not_started |
| score | DECIMAL(5,2) | NULL until completed; 0–100 |
| completed_at | TIMESTAMPTZ | NULL until completed |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Unique**: (user_id, lesson_id). **Index**: (user_id, status).

**Example (in_progress)**:

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "lesson_id": 42,
  "status": "in_progress",
  "last_step_index": 2,
  "score": null,
  "completed_at": null,
  "updated_at": "2025-03-14T10:15:00Z"
}
```

**Example (completed)**:

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "lesson_id": 42,
  "status": "completed",
  "last_step_index": 4,
  "score": 85.5,
  "completed_at": "2025-03-14T10:22:00Z",
  "updated_at": "2025-03-14T10:22:00Z"
}
```

### 1.3 usage_counts (shared with Entitlements)

| Column | Type | Constraints |
|--------|------|-------------|
| user_id | UUID | PK (composite) |
| period_key | VARCHAR(20) | e.g. "2025-03-14" or "2025-W11" |
| lessons_completed_count | INT | DEFAULT 0 |
| scenarios_completed_count | INT | DEFAULT 0 |
| updated_at | TIMESTAMPTZ | |

**Unique**: (user_id, period_key). Used for cap check and GET /entitlements.

### 1.4 spaced_repetition (optional)

| Column | Type | Constraints |
|--------|------|-------------|
| user_id | UUID | |
| item_id | BIGINT | vocabulary_term_id or lesson_id |
| item_type | VARCHAR(20) | vocabulary \| lesson \| exercise |
| last_reviewed_at | TIMESTAMPTZ | |
| next_due_at | TIMESTAMPTZ | |
| recall_success_count | INT | DEFAULT 0 |
| recall_fail_count | INT | DEFAULT 0 |
| created_at, updated_at | TIMESTAMPTZ | |

**Index**: (user_id, next_due_at) for due-for-review queries.

---

## 1A. CEFR curriculum path & revision (extension)

**Source**: `docs/feature-extensions/cefr-curriculum-path-overview.md`, `docs/implementation/features/cefr-curriculum-path.md`

Additive tables only; `lesson_progress` remains authoritative for lesson completion.

### 1A.1 curriculum_manifests

| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGSERIAL | PK |
| locale | VARCHAR(10) | NOT NULL |
| cefr_level_id | BIGINT | NOT NULL, FK cefr_levels |
| schema_version | INT | NOT NULL |
| title | VARCHAR(255) | |
| source | VARCHAR(50) | e.g. cms, json_import |
| published_at | TIMESTAMPTZ | |
| created_at, updated_at | TIMESTAMPTZ | |

**Unique**: (locale, cefr_level_id, schema_version) or (locale, cefr_level_id) if single active manifest per level.

### 1A.2 curriculum_units

| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGSERIAL | PK |
| curriculum_manifest_id | BIGINT | NOT NULL, FK curriculum_manifests |
| external_id | VARCHAR(64) | NOT NULL, stable (e.g. a2-u01) |
| title | VARCHAR(255) | |
| sort_order | INT | NOT NULL |
| summary | TEXT | optional |
| created_at, updated_at | TIMESTAMPTZ | |

**Unique**: (curriculum_manifest_id, external_id).

### 1A.3 curriculum_unit_lessons

| Column | Type | Constraints |
|--------|------|-------------|
| curriculum_unit_id | BIGINT | PK part, FK curriculum_units |
| lesson_id | BIGINT | PK part, FK lessons |
| sort_order | INT | NOT NULL |

**Unique**: (curriculum_unit_id, lesson_id).

### 1A.4 user_curriculum_state

| Column | Type | Constraints |
|--------|------|-------------|
| user_id | UUID | PK |
| active_cefr_level_id | BIGINT | NOT NULL, FK cefr_levels |
| curriculum_manifest_id | BIGINT | FK curriculum_manifests |
| daily_lesson_target | SMALLINT | optional (e.g. 1–3) |
| pacing_preference | VARCHAR(30) | optional (e.g. relaxed, standard) |
| updated_at | TIMESTAMPTZ | |

Align `active_cefr_level_id` with profile or define override rules in product.

### 1A.5 exercise_attempts (weak signals)

| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGSERIAL | PK |
| user_id | UUID | NOT NULL |
| lesson_id | BIGINT | FK lessons |
| exercise_id | BIGINT | FK exercises |
| correct | BOOLEAN | NOT NULL |
| topic_tags | TEXT[] or JSONB | optional |
| attempt_context | VARCHAR(30) | lesson_run, revision_session |
| revision_session_id | BIGINT | nullable, FK revision_sessions |
| created_at | TIMESTAMPTZ | |

**Index**: (user_id, topic_tags) or GIN(topic_tags) for weak-area aggregation.

### 1A.6 revision_sessions

| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGSERIAL | PK |
| user_id | UUID | NOT NULL |
| exercise_ids | JSONB | ordered list of exercise ids |
| source_lesson_ids | JSONB | optional provenance |
| status | VARCHAR(20) | in_progress, completed, abandoned |
| score | DECIMAL(5,2) | optional |
| created_at, completed_at | TIMESTAMPTZ | |

### 1A.7 Read models

| Read model | Source | Purpose |
|------------|--------|---------|
| Path for user | curriculum_* + user_curriculum_state + lesson_progress | Next lesson, unit % |
| Today queue | path + daily_lesson_target + cap | Home “Today” |
| Weak areas | exercise_attempts aggregates | Practice list |
| Revision deck | completed lessons + exercises | POST revision session |

---

## 2. Entitlements & Subscription

### 2.1 subscriptions

| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGSERIAL | PK |
| user_id | UUID | NOT NULL, FK users |
| external_id | VARCHAR(255) | provider subscription id, UNIQUE |
| provider | VARCHAR(50) | e.g. stripe |
| status | VARCHAR(30) | active, canceled, past_due, incomplete |
| plan_id | VARCHAR(100) | |
| current_period_start | TIMESTAMPTZ | |
| current_period_end | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Indexes**: (user_id), (external_id).

### 2.2 trials

| Column | Type | Constraints |
|--------|------|-------------|
| user_id | UUID | PK (one trial per user) |
| started_at | TIMESTAMPTZ | NOT NULL |
| ends_at | TIMESTAMPTZ | NOT NULL |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Index**: (ends_at) for trial-expiry job.

---

## 3. Content Reference Tables (from database-schema)

- **cefr_levels**: id, code (A0–C2), sort_order.
- **lesson_templates**: id, code (vocabulary_guided, grammar_guided), structure_schema (JSONB).
- **exercises**: id, lesson_id or standalone, template_code, payload (JSONB), locale, cefr_level_id.
- **vocabulary_terms**: id, locale, lemma, cefr_level_id, translations (JSONB), etc.

---

## 4. Read Models / Projections

| Read model | Source | Purpose |
|------------|--------|---------|
| Catalog | lessons (status=published) + lesson_progress (for badges) | GET /lessons |
| Lesson detail | lessons + exercises (by content_payload ids) | GET /lessons/:id |
| User progress | lesson_progress (user_id) | GET /progress/lessons |
| Usage | usage_counts (user_id, period_key) | Cap check; GET /entitlements |
| Entitlement | subscriptions + trials + usage_counts | GET /entitlements |

No event-sourced projections required for MVP; current state tables suffice.

---

## 5. Seed Data Requirements

- **locales**: nl, en (at least).
- **cefr_levels**: A0, A1, A2, B1, B2, C1, C2.
- **lesson_templates**: vocabulary_guided, grammar_guided (structure_schema).
- **lessons**: 5–10 published lessons (A0–A2), mix of topics (food, greetings, numbers); valid content_payload with steps and exercise_ids.
- **exercises**: Multiple choice, flashcard, short answer linked from lesson content_payload.
- **vocabulary_terms**: Sample terms for vocabulary_list steps.
- **Config**: free_tier.lessons_cap_per_period=5, period_type=day (or in config table / env).

Optional for staging: one test subscription (active), one test trial (ends_at in future).
