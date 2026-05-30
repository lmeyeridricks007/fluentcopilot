# Content Taxonomy — Classification and Structure

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

This document defines the **content taxonomy**: how lessons, exercises, scenarios, and supporting content are classified (types, levels, topics, tags) so the platform can filter, recommend, and scale consistently.

---

## 2. Scope

- **In scope**: Content type codes; CEFR level usage; topic and tag vocabularies; hierarchy where applicable; taxonomy for lessons, exercises, scenarios, vocabulary.
- **Out of scope**: UI labels (i18n); API field names (backend).

---

## 3. Content Types (Lessons and Exercises)

| Code | Name | Category | Description |
|------|------|----------|-------------|
| vocabulary_lesson | Vocabulary lesson | lesson | Guided vocabulary introduction and practice |
| grammar_lesson | Grammar lesson | lesson | Grammar rule + examples + practice |
| flashcard_session | Flashcard session | lesson | Card-based review (vocabulary/grammar) |
| guided_dialogue | Guided dialogue | lesson | Step-by-step dialogue with prompts |
| quiz_lesson | Quiz | lesson | Set of quiz questions (mixed or single type) |
| listening_lesson | Listening exercise | lesson | Audio + comprehension questions |
| pronunciation_drill | Pronunciation drill | lesson | Repeat and assess pronunciation |
| scenario_simulation | Scenario simulation | lesson | AI roleplay scenario (café, doctor, etc.) |
| exam_prep_exercise | Exam prep | lesson | Task aligned to exam section |
| reflection_generated | Reflection-generated | lesson | Generated from reflection entry (runtime) |
| multiple_choice | Multiple choice | exercise | Single/multiple correct options |
| fill_blank | Fill in the blank | exercise | Gap-fill |
| sentence_order | Sentence ordering | exercise | Order words or sentences |
| listening_comprehension | Listening comprehension | exercise | Listen + answer |
| pronunciation_repeat | Pronunciation repeat | exercise | Repeat after model; get score |
| ai_roleplay | AI roleplay | exercise | Turn-based conversation with AI |
| writing_practice | Writing practice | exercise | Free text; optional AI feedback |

---

## 4. CEFR Levels

| Code | Level | Use |
|------|--------|-----|
| A0 | Beginner (absolute) | First words and phrases |
| A1 | Breakthrough | Basic expressions, familiar topics |
| A2 | Waystage | Routine situations; simple sentences |
| B1 | Threshold | Main points; familiar matters |
| B2 | Vantage | Complex text; interaction |
| C1 | Effective proficiency | Fluency; demanding contexts |
| C2 | Mastery | Near-native |

- **Content**: Every lesson, scenario, vocabulary term, grammar rule, exam task has a CEFR level (or range). Used for filtering and recommendation.
- **Learner**: Profile has current_level and optional target_level; content is filtered by level (e.g. ≤ current_level + 1).

---

## 5. Topic Taxonomy (Examples)

- **Generic**: greetings, numbers, family, shopping, food_drink, travel, work, health, housing, administration, education, social, culture.
- **Scenario-aligned**: Same as scenario_categories (café, restaurant, supermarket, etc.) where lesson is tied to a scenario.
- **Grammar**: Can use rule_type (tense, agreement, word_order) as topic for grammar lessons.
- **Storage**: Topics as VARCHAR or FK to topics table; lessons and vocabulary tagged with topic[] or topic_id.

---

## 6. Scenario Categories (See scenario-taxonomy)

- Scenario categories (café, restaurant, doctor_visit, etc.) form a taxonomy for scenarios and for tagging vocabulary/phrases that appear in those contexts.
- Vocabulary and lessons can be tagged with scenario_category_ids or codes for "this is useful in café" filtering.

---

## 7. Tag Vocabularies

| Tag type | Purpose | Example values |
|----------|---------|----------------|
| content_type | Lesson/exercise type | (see Content Types above) |
| cefr_level | Level | A0–C2 |
| topic | Theme | greetings, shopping, work |
| scenario_category | Real-life context | cafe, doctor_visit |
| exam_type | Exam alignment | civic_a2, integration_b1 |
| skill | Skill focus | reading, listening, speaking, writing, pronunciation |
| source | Origin | authored, ai_generated, runtime, imported |

- **Controlled**: Prefer controlled vocabularies (tables or enums) for content_type, cefr_level, scenario_category, exam_type so that filters and analytics are consistent.
- **Free tags**: Optional free-text tags for special campaigns or internal use; not primary filter.

---

## 8. Hierarchy (Where Applicable)

- **Exam**: exam_type → exam_module (reading, listening, speaking, writing, civic) → exam_task. Tasks belong to one module.
- **Lesson**: lesson_template → lesson (instance). Lesson instances can be grouped by topic or level for display (no strict hierarchy beyond template).
- **Scenario**: scenario_category → scenario. Scenarios belong to one category; category can have parent in future (e.g. food → café, restaurant).
- **Vocabulary**: Flat list with tags (level, topic, scenario); optional grouping by "unit" or "theme" for curriculum (e.g. unit_id on lesson and vocabulary).

---

## 9. Use in Recommendation and Filtering

- **Catalog**: Filter lessons by locale, content_type, cefr_level, topic, scenario_category, status=published.
- **Next lesson**: Filter by level (≤ profile.level + 1), exclude completed, optionally bias by topic or scenario from profile/goals.
- **Scenario list**: Filter scenarios by locale, difficulty_level, scenario_category.
- **Vocabulary in generation**: Filter by locale, cefr_level, scenario_tags when building prompt input for runtime generation.

---

## 10. Dependencies

- **scenario-taxonomy.md**: Full scenario category list and structure.
- **database-schema.md**: content_types, cefr_levels, scenario_categories tables.
- **lesson-template-system.md**: Template codes aligned to content types.
