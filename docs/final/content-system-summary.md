# Content & Data Architecture System — Final Summary

## Overview

This document summarizes the **complete content and data architecture system** for the AI Language Coach: content architecture, schemas, pipelines, sourcing strategy, governance, and runtime generation. The system is designed to scale to thousands of lessons and scenarios, multiple languages, AI-driven personalization, exam prep, and speech/pronunciation content.

---

## 1. Content Architecture

### 1.1 Core Domains

| Domain | Purpose | Scale |
|--------|---------|--------|
| **Vocabulary** | Lemmas, translations, examples, CEFR, scenario tags, phonemes | 10k–100k terms per language |
| **Grammar** | Rules, structures, examples, CEFR, common mistakes | 1k–10k rules |
| **Scenarios** | Real-life situations, goals, phrases, AI roleplay instructions, cultural notes | Thousands |
| **Lessons** | Template-based instances (vocabulary, grammar, flashcard, quiz, listening, pronunciation, scenario, exam) | Thousands |
| **Exercises** | Multiple choice, fill-blank, sentence order, listening, pronunciation, AI roleplay, writing | 10k+ |
| **Prompts** | Tutor correction, roleplay, quiz generation, reflection lesson, level adaptation, exam feedback | Hundreds of templates |
| **Exam prep** | Exam types, modules (reading/listening/speaking/writing/civic), tasks, scoring | Hundreds per exam type |
| **Pronunciation** | Targets, phonemes, stress, scoring thresholds, corrective feedback templates | 5k–20k targets |
| **Cultural context** | Do's, don'ts, notes per topic/scenario | Hundreds |
| **Runtime** | Generated lessons and recommendations from learner profile, progress, and AI | On demand; cache optional |

### 1.2 Data Model

- **Reference tables**: locales, cefr_levels, content_types, scenario_categories.
- **Content tables**: vocabulary_terms, grammar_rules, scenarios, lesson_templates, lessons, exercise_templates, exercises, prompt_templates, exam_types, exam_modules, exam_tasks, pronunciation_targets, cultural_context_entries.
- **Versioning**: content_versions (snapshots); version column on each entity; draft → in_review → published → archived.
- **Localization**: locale on every content row; translations in vocabulary; multi-language = new rows per locale.
- **Storage**: PostgreSQL for structured content; JSONB for flexible payloads (lesson content_payload, prompt template_body); object storage for media (audio, images).

---

## 2. Schemas (Key)

- **Vocabulary**: lemma, base_form, cefr_level_id, part_of_speech, translations, example_sentences, pronunciation_hints, phoneme_guidance, scenario_tags, grammar_rule_ids, frequency_score, difficulty_score, is_verified, source, version.
- **Scenario**: context, goals, vocabulary_term_ids, key_phrases, grammar_focus_ids, cultural_notes, ai_roleplay_instructions, difficulty_level, common_mistakes.
- **Lesson**: lesson_template_id, content_payload (conforms to template structure_schema), status, source (authored | ai_generated | runtime), content_version_id.
- **Exercise**: exercise_template_id, payload (conforms to template input_schema), grading_logic, feedback_schema.
- **Prompt template**: code, template_body ({{ placeholders }}), input_schema, output_schema, constraints, safety_requirements.
- **Exam task**: exam_module_id, task_type, prompt, payload, scoring_criteria.
- **Pronunciation target**: target_word_or_phrase, phoneme_structure, stress_pattern, scoring_thresholds, corrective_feedback_templates.

Full DDL and field details: docs/final/data/database-schema.md, docs/final/data/content-entities.md.

---

## 3. Pipelines

| Pipeline | Inputs | Outputs | Checkpoints |
|----------|--------|---------|-------------|
| **Content ingestion** | Manual authoring, CSV/JSON import | Draft rows in DB | Format, mapping, validation |
| **AI content generation** | Template code, context, constraints | Draft (or published) content | Input schema, LLM call, output schema, validation, moderation |
| **Content validation** | Any content create/update | Pass/fail + errors | Schema, length, safety, pedagogy |
| **Content review** | Draft submitted | Approved or back to draft | Reviewer checklist, approver |
| **Content release** | Approved content | Published; cache invalidated | Publish, invalidate, audit |
| **Content expansion telemetry** | Usage, completion, success rates | Backlog items | Aggregate, signal, prioritize |

Failure modes, automation opportunities, and dependencies are in each pipeline doc (docs/final/pipelines/*).

---

## 4. Sourcing Strategy

- **Authored curriculum**: Core lessons, scenarios, vocabulary, grammar; editorial + pedagogy review.
- **Authoritative references**: CEFR lists, grammar references; import with mapping and spot-check.
- **Official exam**: Exam structure and alignment; no AI-generated exam answers.
- **AI-assisted**: Example sentences, quiz items, dialogue variations, reflection lessons; always validated and optionally human-reviewed; never publish unvalidated.
- **Community** (future): Corrections and suggestions; moderation and editorial decision.
- **Telemetry**: Informs backlog and expansion; not a source of copy.

Validation per source: docs/final/content/content-sourcing-strategy.md.

---

## 5. Governance

- **Roles**: Content author (create, edit, submit); Reviewer (review, approve or request changes); Approver / Content lead (publish, archive, rollback).
- **AI controls**: All AI output validated; sampling or mandatory review per policy; no PII in prompt; audit log; kill switch.
- **Workflow**: draft → in_review → approved → published; optional archived; rollback from content_versions.
- **Audit**: Log create, update, submit, approve, publish, archive, rollback with actor and timestamp.
- **Safety**: No PII in content; moderation on all text; pedagogy sign-off for exam and high-stakes.

Details: docs/final/content/content-governance.md, docs/final/content/content-operations-model.md.

---

## 6. Runtime Content Generation

- **Inputs**: Learner profile (level, goals, weak skills), past progress, scenario choice, vocabulary/grammar filters, prompt template, constraints.
- **Flow**: Resolve context → filter content → select template → build input → call LLM → parse output → validate → create lesson instance or return payload → optional cache.
- **Cache**: Key = hash(profile, template, scenario, seed); TTL (e.g. 24h); invalidate on template or profile change.
- **Validation**: Output schema; content-quality-rules; moderation on generated text.
- **Personalization**: Level filter; avoid repeat (exclude completed); bias weak skills and goals; scenario vocabulary injection.

Details: docs/final/data/runtime-content-generation.md.

---

## 7. Versioning and Localization

- **Versioning**: Linear version number per entity; content_versions for snapshots; draft vs published; impact on in-progress learners (use version at session start).
- **Localization**: locale on all content; one row per (entity, locale); vocabulary translations array for learner hints; UI i18n separate; multi-country (e.g. NL vs BE) via topic/scenario or market filter.

Details: docs/final/data/content-versioning.md, docs/final/data/localization-model.md.

---

## 8. Document Index (Final)

| Location | Documents |
|----------|-----------|
| **docs/final/data/** | data-model-overview, database-schema, content-entities, content-versioning, localization-model, runtime-content-generation |
| **docs/final/content/** | content-strategy, content-taxonomy, scenario-taxonomy, lesson-template-system, exercise-template-system, vocabulary-dataset, grammar-dataset, pronunciation-dataset, cultural-context-dataset, exam-prep-content-model, content-sourcing-strategy, content-governance, content-quality-rules, content-operations-model |
| **docs/final/prompts/** | prompt-library-architecture, prompt-template-catalog, ai-content-generation-policies, prompt-input-schema, prompt-output-schema |
| **docs/final/pipelines/** | content-ingestion-pipeline, ai-content-generation-pipeline, content-validation-pipeline, content-review-process, content-release-process, content-expansion-telemetry-loop |

---

## 9. Quality and Audit

- **Scorecard** (CONTENT_DATA_SPEC_GUIDELINES): Clarity, Completeness, Scalability, Pedagogical coherence, Implementation readiness, AI safety and quality — each ≥ 9/10, confidence ≥ 95%.
- **Audit**: Scalability, data integrity, AI misuse risk, content quality risks, localization readiness, exam compliance. Verdict: Pass / Pass with improvements / Needs revision.
- This run: All documents created in v1; batch review and audit applied; promoted to final after Pass.

---

## 10. What This Enables

- **Scalable content creation**: Templates and pipelines support thousands of lessons and scenarios; ingestion and AI generation with validation and review.
- **Safe AI expansion**: Policies, output schema, validation, and human review; no unvalidated publish; audit and kill switch.
- **Consistent pedagogy**: CEFR, content taxonomy, scenario taxonomy, and quality rules applied across all content.
- **Structured storage**: Full schema in database-schema and content-entities; versioning and localization built in.
- **Automated pipelines**: Ingestion, validation, review workflow, release, and telemetry-driven backlog.
- **Runtime personalization**: Learner profile and progress drive lesson generation and recommendations; cache and invalidation defined.
- **Exam and pronunciation**: Exam prep and pronunciation datasets and models defined; aligned to official and speech APIs.
- **Multi-language readiness**: Locale on all entities; translations and cultural context; same architecture for new teaching languages.
