# Content Generation Engine — Use Cases

## 1. Purpose

This document enumerates the primary use cases the content generation engine must support, with inputs, outputs, and pipeline stages. It aligns with the engine overview and artifact model.

## 2. Scope

- **In scope**: Ten generation modes (vocabulary pack, phrase pack, dialogue, guided lesson, exercise, level adaptation, exam prep, reflection lesson, recommendation pack, regeneration); triggers; artifact types; validation and review expectations.
- **Out of scope**: UI flows; real-time learner-facing generation (runtime layer).

## 3. Use Case Summary

| # | Use case | Trigger | Main artifact(s) | Validation | Review default |
|---|----------|---------|-------------------|------------|----------------|
| 1 | Vocabulary pack generation | CLI, API, scheduler | VocabularyItem[] | Schema, CEFR, dup, safety | Auto-approve if schema + safety pass |
| 2 | Phrase pack generation | CLI, API | PhraseItem[] | Schema, language, safety | Manual for cultural/phrase nuance |
| 3 | Dialogue generation | CLI, scenario batch | Dialogue | Schema, scenario fit, safety | Manual for scenario dialogues |
| 4 | Guided lesson generation | CLI, API | LessonBlueprint, LessonInstance | Schema, pedagogy, completeness | Manual for lessons |
| 5 | Exercise generation | CLI, lesson pipeline | ExerciseInstance[] | Schema, template fit, grading | Auto-approve if template validated |
| 6 | Level adaptation | CLI, API | Same type, new level | Schema, CEFR match | Same as source artifact |
| 7 | Exam prep generation | CLI, exam module | ExamTask[] | Schema, exam alignment, no AI answers | Manual for exam items |
| 8 | Reflection lesson generation | User submit, API | ReflectionLessonDraft | Schema, safety, pedagogy | Manual or sampling |
| 9 | Recommendation pack generation | Scheduler, API | LessonCandidate[] | Schema, targeting | Internal use; no publish |
| 10 | Regeneration / expansion | Telemetry, CLI | Same as source | Same as source type | Same as source type |

## 4. Use Case Details

### 4.1 Vocabulary Pack Generation

- **Inputs**: locale, cefr_level, topic (optional), scenario_codes (optional), learner_segment (optional), max_items.
- **Outputs**: Array of VocabularyItem (lemma, translations, examples, pronunciation_hints, scenario_tags, cefr_level).
- **Pipeline**: Request → load scenario/topic vocab if any → select prompt (e.g. vocabulary_pack_generation) → render → invoke → parse → normalize to VocabularyItem[] → validate (schema, CEFR, duplicate check, moderation) → score → persist as draft; auto-approve if policy allows.
- **Failure**: Parse or validation failure → no persist; return report.

### 4.2 Phrase Pack Generation

- **Inputs**: locale, scenario or intent, formality, max_phrases, variants (boolean).
- **Outputs**: PhraseItem[] (phrase, translation, intent, formality, follow_ups, common_mistakes).
- **Pipeline**: Same pattern; validators include language match, safety; default route to manual review for cultural accuracy.

### 4.3 Dialogue Generation

- **Inputs**: scenario_id or scenario_code, locale, cefr_level, num_turns, participants.
- **Outputs**: Dialogue (turns[], scenario_id, level, metadata).
- **Pipeline**: Load scenario (goals, key_phrases) → select dialogue generation template → generate → parse → validate (schema, scenario completeness, turn count, safety) → route to review (manual for dialogues).

### 4.4 Guided Lesson Generation

- **Inputs**: lesson_template_id or type, locale, cefr_level, topic/scenario, objective (optional), max_exercises.
- **Outputs**: LessonBlueprint (objective, content_blocks[], example_ids), then LessonInstance (content_payload conforming to template structure_schema).
- **Pipeline**: Load template and scenario/vocab → select lesson generation template → generate blueprint → validate → generate exercises → validate → persist as draft → route to review.

### 4.5 Exercise Generation

- **Inputs**: exercise_template_id, locale, cefr_level, source_content (e.g. vocab ids, lesson id), num_items.
- **Outputs**: ExerciseInstance[] (payload per template input_schema, grading_logic).
- **Pipeline**: Load template and source content → select exercise generation template (e.g. mcq_generation, fill_blank_generation) → generate → parse → validate (schema, template compliance, grading logic) → persist; auto-approve if template is pre-approved and validation pass.

### 4.6 Level Adaptation

- **Inputs**: source_artifact_id, target_cefr_level, artifact_type.
- **Outputs**: New artifact(s) of same type with target level; provenance links to source.
- **Pipeline**: Load source artifact → select level_adaptation template → generate → parse → validate (CEFR consistency) → persist; review policy same as source type.

### 4.7 Exam Prep Generation

- **Inputs**: exam_type_id, module (reading/listening/speaking/writing/civic), locale, num_tasks, difficulty.
- **Outputs**: ExamTask[] (task_type, prompt, payload, scoring_criteria); no AI-generated “correct answers” for high-stakes items (per policy).
- **Pipeline**: Load exam structure → select exam task template → generate prompts/items only where policy allows → validate (exam alignment, schema) → always route to manual review for exam content.

### 4.8 Reflection Lesson Generation

- **Inputs**: user_notes (text), optional photo_metadata, place_category, timeline_events (optional), locale, learner_level.
- **Outputs**: ReflectionLessonDraft (lesson outline, vocabulary used, exercises suggested).
- **Pipeline**: Sanitize input (no PII) → select reflection_lesson_generation template → generate → parse → validate (safety, pedagogy) → persist as draft; route to review or sampling.

### 4.9 Recommendation Pack Generation

- **Inputs**: learner_profile (level, goals, weak_skills), progress_history, locale, max_candidates.
- **Outputs**: LessonCandidate[] (lesson_id or blueprint_id, score, reason); not published as new content; used by recommendation service.
- **Pipeline**: Load eligible lessons/blueprints → score/rank by profile → optionally use LLM to diversify or explain → return list; no persist to content store (or persist as recommendation_set only).

### 4.10 Regeneration / Expansion

- **Inputs**: source_artifact_id or telemetry signal (e.g. low completion rate, high error rate), expansion_type (variant, level, distractor_improvement).
- **Outputs**: New or revised artifact(s); provenance points to source and signal.
- **Pipeline**: Load source and telemetry context → select regeneration/expansion template → generate → same validation and review as artifact type.

## 5. Triggers

| Trigger | Use cases | Typical runner |
|---------|-----------|----------------|
| CLI (generate:scenario, generate:batch) | 1–7, 10 | Operator, CI |
| API (internal) | 1–8, 10 | Backend service |
| User action (e.g. “Generate lesson from reflection”) | 8 | Backend service |
| Scheduler (e.g. weekly expansion) | 1, 2, 9, 10 | Cron / job runner |

## 6. Validation and Review (Summary)

- **Schema validity**: Required for all; parse and validate before persist.
- **Safety (moderation)**: Required for all text; fail and do not persist if flagged.
- **Pedagogy**: Required for lessons, exercises, exam; optional for vocab/phrase packs with auto-approve.
- **Duplicate / overlap**: Check where applicable (e.g. vocabulary pack vs existing terms).
- **Review**: Manual required for dialogue, lesson blueprints, exam tasks, reflection lessons (unless sampling); auto-approve allowed for vocabulary packs and exercise instances when template and validation are trusted.

## 7. Dependencies

- content-generation-engine-overview.md
- content-artifact-model.md (for artifact types and schemas)
- prompt-execution-framework.md
- generation-pipeline-architecture.md
