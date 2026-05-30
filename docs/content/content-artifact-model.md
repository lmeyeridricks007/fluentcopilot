# Content Generation Engine — Artifact Model

## 1. Purpose

This document defines the **normalized content artifact system** used by the content generation engine: artifact types, identifier strategy, schemas, metadata, provenance, validation status, review status, publish status, and targeting (locale, CEFR, scenario/topic). All generated content is represented as one of these artifact types before and after persistence.

## 2. Scope

- **In scope**: Artifact type definitions; schema requirements; identifier strategy; metadata and provenance fields; validation/review/publish status; locale and CEFR targeting; storage contract (logical).
- **Out of scope**: Physical DB DDL (see database-schema); UI representation.

## 3. Artifact Types (Summary)

| Artifact type | Description | Identifier | Primary key in store |
|---------------|-------------|------------|----------------------|
| VocabularyItem | Single vocabulary term with lemma, translations, examples, CEFR | client_generated_id or store id | vocabulary_terms.id |
| PhraseItem | Phrase with intent, formality, variants | client_generated_id or store id | phrases.id (or embedded) |
| Dialogue | Multi-turn dialogue for a scenario | scenario_id + version or id | dialogues.id |
| LessonBlueprint | Lesson structure (objective, blocks, example refs) | blueprint_id (UUID) | lesson_blueprints.id |
| LessonInstance | Concretized lesson (content_payload) | lesson_id | lessons.id |
| ExerciseTemplate | Template for exercise type | template_id | exercise_templates.id |
| ExerciseInstance | Single exercise (MCQ, fill-blank, etc.) | exercise_id | exercises.id |
| PronunciationTarget | Word/phrase with phoneme/stress/feedback | target_id | pronunciation_targets.id |
| ExamTask | Single exam practice task | task_id | exam_tasks.id |
| ReflectionLessonDraft | Draft lesson from reflection input | draft_id | reflection_lesson_drafts.id |
| PromptTemplate | Prompt template definition | code + version | prompt_templates.id |
| GeneratedContentBatch | Batch job and its outputs | batch_id | generation_batches.id |
| ValidationReport | Result of validation run | report_id | validation_reports.id |
| ReviewDecision | Approve/reject/edit/regenerate | decision_id | review_decisions.id |
| PublishRecord | Record of publish event | publish_id | publish_records.id |

## 4. Identifier Strategy

- **Stored artifacts**: Use DB-assigned id (bigint/UUID) after persist; before persist use temporary client_generated_id (UUID) for reference in batch.
- **Prompts**: code (string) + version (int); e.g. `vocabulary_pack_generation@2`.
- **Batches**: batch_id (UUID) assigned at job start.
- **Versions**: Linear version number per artifact; content_version snapshot on publish.

## 5. Common Metadata (All Artifacts)

Every artifact carries:

| Field | Type | Description |
|-------|------|-------------|
| locale | string (BCP 47) | Target teaching/locale (e.g. nl, en-GB). |
| cefr_level | string (optional) | A0–C2 when applicable. |
| scenario_id / scenario_code | string (optional) | When scenario-specific. |
| topic | string (optional) | Topic or category. |
| created_at | ISO8601 | Creation time (UTC). |
| updated_at | ISO8601 | Last update (UTC). |
| version | number | Linear version. |
| status | enum | draft \| in_review \| approved \| published \| deprecated. |
| source | enum | authored \| ai_generated \| imported \| runtime. |

## 6. Provenance (AI-Generated Artifacts)

For source = ai_generated:

| Field | Type | Description |
|-------|------|-------------|
| prompt_template_id | string or number | Template used. |
| prompt_template_code | string | e.g. dialogue_generation. |
| prompt_version | number | Template version. |
| model_id | string | Provider + model name. |
| input_hash | string | Hash of sanitized input (no PII). |
| validator_results | object | ValidationReport summary. |
| generation_batch_id | string (optional) | If part of batch. |

## 7. Schema Requirements (Per Type)

### 7.1 VocabularyItem

- **Required**: lemma, locale, cefr_level (or level_id), translations (array of { locale, text }).
- **Optional**: base_form, part_of_speech, example_sentences[], pronunciation_hints, phoneme_guidance, scenario_tags[], grammar_rule_ids[], frequency_score, difficulty_score.
- **Validation**: Schema, CEFR in allowed set, no duplicate lemma+locale in same pack (or check against store).

### 7.2 PhraseItem

- **Required**: phrase (target language), translation (learner language or locale), locale.
- **Optional**: intent, formality, variants[], follow_ups[], common_mistakes[].
- **Validation**: Schema, language match, moderation on all text.

### 7.3 Dialogue

- **Required**: scenario_id or scenario_code, locale, turns[] (each: speaker, text, optional translation).
- **Optional**: cefr_level, participant_labels, metadata.
- **Validation**: Schema, scenario exists, turn count in range, moderation.

### 7.4 LessonBlueprint

- **Required**: objective, locale, content_blocks[] (type, content_ref or inline).
- **Optional**: cefr_level, scenario_id, topic, example_ids[], exercise_template_ids[].
- **Validation**: Schema, pedagogy (blocks coherent, objective clear).

### 7.5 LessonInstance

- **Required**: lesson_template_id, content_payload (conforms to template structure_schema), locale, status.
- **Optional**: lesson_blueprint_id, cefr_level, scenario_id.
- **Validation**: Schema, template structure_schema, completeness.

### 7.6 ExerciseInstance

- **Required**: exercise_template_id, payload (conforms to template input_schema), locale.
- **Optional**: lesson_id, cefr_level, source_vocabulary_ids[].
- **Validation**: Schema, template compliance, grading_logic valid.

### 7.7 PronunciationTarget

- **Required**: target_word_or_phrase, locale.
- **Optional**: phoneme_structure, stress_pattern, scoring_thresholds, corrective_feedback_templates.
- **Validation**: Schema, safety on text.

### 7.8 ExamTask

- **Required**: exam_module_id, task_type, prompt or payload, locale.
- **Optional**: scoring_criteria, difficulty.
- **Validation**: Schema, exam alignment; no AI-generated “correct” answers for high-stakes (per policy).

### 7.9 ReflectionLessonDraft

- **Required**: learner_level, locale, lesson_outline or content_blocks.
- **Optional**: source_notes_hash (no PII), vocabulary_used[], exercises_suggested[].
- **Validation**: Schema, safety, pedagogy.

### 7.10 GeneratedContentBatch

- **Required**: batch_id, job_type, status (running \| completed \| failed \| partial), created_at.
- **Optional**: artifact_ids[], error_count, request_params.
- **Validation**: N/A (engine output).

### 7.11 ValidationReport

- **Required**: artifact_id or client_ref, passed (boolean), checks[] (name, passed, message).
- **Optional**: overall_score, recommendations.
- **Validation**: N/A.

### 7.12 ReviewDecision

- **Required**: artifact_id, decision (approve \| reject \| edit_and_approve \| send_for_regeneration), decided_at, decided_by (actor id).
- **Optional**: notes, edited_artifact_snapshot.
- **Validation**: N/A.

### 7.13 PublishRecord

- **Required**: artifact_type, artifact_id, content_version_id, published_at, published_by.
- **Optional**: release_batch_id, targeting_rules.
- **Validation**: N/A.

## 8. Validation Status

- **pending**: Not yet validated.
- **passed**: All required checks passed.
- **failed**: One or more checks failed; artifact not persisted (or persisted as failed for audit).
- **warning**: Passed with warnings; may still route to review.

## 9. Review Status

- **pending_review**: In review queue.
- **approved**: Human approved.
- **rejected**: Human rejected.
- **auto_approved**: Approved by rule (e.g. schema + safety pass, no manual review).
- **edit_pending**: Approved with edits; edits to be applied.

## 10. Publish Status

- **draft**: Not published.
- **published**: Has content_version; live.
- **deprecated**: Superseded or retired; old version may still be served for in-progress sessions.
- **archived**: Removed from active use.

## 11. Locale and CEFR Targeting

- **locale**: Every artifact has locale; engine never hardcodes a single language; multi-language = multiple artifacts or locale field.
- **cefr_level**: When applicable (vocabulary, lessons, exercises, dialogues), one of A0, A1, A2, B1, B2, C1, C2.
- **scenario/topic**: scenario_id or scenario_code, topic code or free text; used for filtering and recommendation.

## 12. Storage Contract (Logical)

- Artifacts are persisted via repository interfaces (e.g. VocabularyRepository.save(items)).
- Physical schema follows docs/final/data/database-schema.md.
- Engine produces artifacts in normalized form; repository maps to DB rows and JSONB where defined.
- Batch and validation/review/publish records are stored in engine-specific or shared tables (generation_batches, validation_reports, review_decisions, publish_records).

## 13. Dependencies

- docs/final/data/database-schema.md
- docs/final/data/content-entities.md
- content-generation-engine-overview.md
- content-generation-use-cases.md

## 14. Failure Modes

- Unknown artifact type → reject request.
- Missing required field after parse → validation failed; do not persist.
- Duplicate identifier in batch → deduplicate or fail batch item.

## 15. Security and Safety

- No PII in provenance (input_hash only; no raw user text in logs).
- Moderation required on all learner-facing text before persist.
