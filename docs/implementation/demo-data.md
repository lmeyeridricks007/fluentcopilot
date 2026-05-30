# Seed / Demo Data

**Purpose**: Ensure the application looks alive locally and supports demos, QA, and development. All data is realistic and consistent with schema and business rules.

**Source**: docs/features/deep-dives, docs/final/data/database-schema.md

---

## 1. Reference Data

### 1.1 locales

| id | code | name | is_teaching_language |
|----|------|------|----------------------|
| 1 | nl | Nederlands | true |
| 2 | en | English | false |
| 3 | en-GB | English (UK) | false |

### 1.2 cefr_levels

| id | code | sort_order |
|----|------|------------|
| 1 | A0 | 0 |
| 2 | A1 | 1 |
| 3 | A2 | 2 |
| 4 | B1 | 3 |
| 5 | B2 | 4 |
| 6 | C1 | 5 |
| 7 | C2 | 6 |

### 1.3 lesson_templates

| id | code | structure_schema (summary) |
|----|------|---------------------------|
| 1 | vocabulary_guided | steps: intro, vocabulary_list, example_sentences, exercise_block, quiz |
| 2 | grammar_guided | steps: intro, rule_explanation, examples, exercise_block, quiz |

---

## 2. Content: Vocabulary & Exercises

### 2.1 vocabulary_terms (sample)

| id | locale | lemma | cefr_level_id | part_of_speech | translations (JSONB) |
|----|--------|-------|---------------|----------------|----------------------|
| 101 | nl | brood | 2 | noun | [{"locale":"en","text":"bread"}] |
| 102 | nl | water | 2 | noun | [{"locale":"en","text":"water"}] |
| 103 | nl | melk | 2 | noun | [{"locale":"en","text":"milk"}] |
| 104 | nl | hallo | 1 | interjection | [{"locale":"en","text":"hello"}] |
| 105 | nl | dank je wel | 1 | phrase | [{"locale":"en","text":"thank you"}] |

### 2.2 exercises (sample)

| id | template_code | locale | cefr_level_id | payload (summary) |
|----|---------------|--------|---------------|-------------------|
| 201 | multiple_choice | nl | 2 | question: "Wat eet je?", options A/B/C, correct_option_id: "A" |
| 202 | flashcard | nl | 2 | term_id: 101, show_front_first: true |
| 301 | multiple_choice | nl | 2 | quiz question 1 |
| 302 | multiple_choice | nl | 2 | quiz question 2 |
| 303 | short_answer | nl | 2 | question: "Hoe zeg je 'bread' in het Nederlands?", correct: "brood" |

---

## 3. Lessons (Published)

At least 5–10 published lessons (A0–A2). Example two:

### 3.1 Lesson: Food basics (A1)

| Column | Value |
|--------|--------|
| id | 42 |
| locale | nl |
| lesson_template_id | 1 |
| external_id | food-basics-a1 |
| title | Food basics |
| title_key | lessons.food.basics |
| cefr_level_id | 2 |
| topic | food |
| topic_tags | ["food", "daily_life"] |
| exam_tags | [] |
| content_payload | See JSON below |
| status | published |
| version | 1 |
| published_at | 2025-01-15T00:00:00Z |

**content_payload**:

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

### 3.2 Lesson: Greetings (A0)

| Column | Value |
|--------|--------|
| id | 38 |
| locale | nl |
| external_id | greetings-a0 |
| title | Greetings |
| cefr_level_id | 1 |
| topic | greetings |
| status | published |
| content_payload | steps: intro, vocabulary_list (104, 105), exercise_block, quiz |

Additional lessons: 2–3 more A1 (e.g. "Numbers", "Family"), 2 A2 (e.g. "At the café", "Directions") so filters and recommendations have variety.

---

## 4. User & Progress (Demo Accounts)

### 4.1 Demo user: free_at_cap

- **user_id**: e.g. `550e8400-e29b-41d4-a716-446655440001`
- **Profile**: level A1, locale nl.
- **usage_counts**: period_key = today (e.g. "2025-03-14"), lessons_completed_count = 5 (at cap).
- **lesson_progress**: 5 completed lessons (e.g. ids 38, 40, 41, 42, 43); no in_progress.
- **Purpose**: Test 403 free_cap_reached on GET /lessons/:id for a new lesson.

### 4.2 Demo user: has_in_progress

- **user_id**: e.g. `550e8400-e29b-41d4-a716-446655440002`
- **lesson_progress**: One row status=in_progress, lesson_id=42, last_step_index=2.
- **usage_counts**: lessons_completed_count = 2 today.
- **Purpose**: Test resume flow and checkpoint.

### 4.3 Demo user: premium

- **user_id**: e.g. `550e8400-e29b-41d4-a716-446655440003`
- **subscriptions**: One row status=active, current_period_end in future.
- **Purpose**: Test no cap; manage_url in GET /entitlements.

### 4.4 Demo user: trial

- **user_id**: e.g. `550e8400-e29b-41d4-a716-446655440004`
- **trials**: started_at = 2 days ago, ends_at = 5 days from now.
- **Purpose**: Test tier=trial and trial_ends_at in GET /entitlements.

---

## 5. Config (Feature / Admin)

- **free_tier.lessons_cap_per_period**: 5
- **free_tier.period_type**: day
- **free_tier.period_timezone**: user (or UTC for simplicity)
- **catalog.level_filter**: stretch_1 (user level + 1)
- **quiz.retry_allowed**: true
- **quiz.pass_threshold**: 0.7 (or 70)

Store in config table or env; seed script applies for local.

---

## 6. Scenarios / Other Features (Optional for MVP)

- **Scenarios**: 2–3 published scenarios (e.g. "At the supermarket", "At the doctor") with prompt_templates and metadata for Scenario Simulations (E-04).
- **Listening**: 1–2 listening exercises with audio URL (CDN) and questions for Listening Training (E-06).

---

## 7. Seed Script Requirements

- Run order: locales → cefr_levels → lesson_templates → vocabulary_terms → exercises → lessons (then optional scenarios, listening).
- Idempotent: use INSERT ... ON CONFLICT or check existence.
- Demo users: optional seed script or fixture; ensure usage_counts and lesson_progress match desired test cases.
- Config: seed default config rows or document env vars for cap and period.

**Goal**: After seed, engineer can open app, see lesson list, start a lesson, checkpoint, complete, see summary; and (with free_at_cap user) hit 403 on next lesson start and see upsell.
