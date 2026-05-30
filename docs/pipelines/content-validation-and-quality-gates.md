# Content Validation and Quality Gates

## 1. Purpose

This document defines the **validation layer** and **quality gates** for the content generation engine: validation categories, deterministic and heuristic validators, AI-assisted options, human review triggers, and gate outcomes (auto reject, auto retry, manual review required, auto approve).

## 2. Scope

- **In scope**: Validation categories (schema, CEFR, duplicate, safety, language, policy, pedagogy, length, scenario completeness); validator interfaces; quality gate rules per artifact type; auto reject/retry/review/approve logic.
- **Out of scope**: Implementation of external moderation API (interface only); human review UI.

## 3. Validation Categories

| Category | Description | Deterministic? | Blocks persist? |
|----------|-------------|----------------|-----------------|
| Schema validity | Required fields present; types correct; enum values allowed | Yes | Yes |
| Missing required fields | Per artifact schema | Yes | Yes |
| CEFR mismatch risk | Level within allowed set; consistency with scenario/lesson | Yes/heuristic | Configurable |
| Duplicate content risk | Same lemma+locale; near-duplicate text | Yes/heuristic | Configurable |
| Unsafe/inappropriate | Moderation API on all text fields | No (API) | Yes |
| Language mismatch | Target language matches locale; no wrong-language leakage | Heuristic | Yes |
| Banned content / policy | Block list; no prohibited topics | Yes | Yes |
| Grammar/explanation consistency | Optional; explanation matches content | Heuristic/AI | No (warning) |
| Output length bounds | Min/max length per field or total | Yes | Yes if out of bounds |
| Prompt contract compliance | Output matches expected structure and intent | Yes (schema) | Yes |
| Scenario completeness | Dialogue has enough turns; lesson has blocks | Heuristic | Configurable |

## 4. Validator Interfaces

### 4.1 Generic Validator

- **Input**: artifact (normalized), context (locale, scenario, existing_store_ref optional).
- **Output**: CheckResult { name, passed, message?, severity?: error \| warning }.
- **Usage**: Pipeline runs all validators for the artifact type; aggregates into ValidationReport.

### 4.2 Validators by Category

| Validator | Input | Logic | Output |
|-----------|-------|-------|--------|
| SchemaValidator | artifact, artifact_schema | Zod or JSON Schema validate | passed/failed, errors |
| CEFRValidator | artifact, allowed_levels | cefr_level in set; optional consistency check | passed/failed |
| DuplicateValidator | artifact, store_ref or in_batch_set | Compare lemma+locale or hash; threshold | passed/failed, duplicate_ref |
| SafetyValidator | artifact (all text fields) | Call moderation API; block list check | passed/failed |
| LanguageValidator | artifact, expected_locale | Detect language of text fields; match locale | passed/failed |
| LengthValidator | artifact, bounds config | Min/max length per field | passed/failed |
| ScenarioCompletenessValidator | artifact, scenario_ref | Turn count, required elements | passed/failed or warning |
| PedagogyValidator | artifact, rules | Lesson/exercise-specific rules (e.g. vocab exists) | passed/failed or warning |

## 5. AI-Assisted Validation (Optional)

- **Use**: When deterministic/heuristic checks pass but quality is uncertain (e.g. “does this dialogue sound natural?”).
- **Flow**: Optional second LLM call with a “validation” prompt that returns pass/fail + reason; result attached to ValidationReport.
- **Trigger**: Configurable per artifact type (e.g. only for dialogues or reflection lessons).
- **Cost**: Log tokens; use only when needed.

## 6. Human Review Triggers

- **Always**: Exam tasks; dialogue; lesson blueprints; reflection lesson drafts (unless sampling).
- **Conditional**: Phrase packs (cultural); vocabulary packs only if safety or CEFR fails or score below threshold.
- **Never (auto-approve path)**: Vocabulary items when schema + safety pass and template is trusted; exercise instances when template is pre-approved and validation pass.

## 7. Quality Gates

### 7.1 Gate Outcomes

| Outcome | Meaning | Next step |
|---------|---------|-----------|
| **Auto reject** | One or more blocking checks failed | Do not persist; return ValidationReport; optional retry with different params |
| **Auto retry** | Transient or “soft” failure (e.g. duplicate in batch) | Retry generation once (e.g. different seed or prompt variant) |
| **Manual review required** | Policy says this artifact type must be reviewed | Persist as draft; create ReviewQueueItem |
| **Auto approve** | All checks passed and policy allows auto-approve for this type | Persist with status approved; optionally create PublishRecord |

### 7.2 Rules by Artifact Type

| Artifact type | Auto reject if | Auto retry if | Manual review | Auto approve if |
|---------------|----------------|---------------|---------------|------------------|
| VocabularyItem | schema fail, safety fail, CEFR invalid | duplicate in batch | — | schema + safety + CEFR pass; policy allows |
| PhraseItem | schema fail, safety fail | — | default | — |
| Dialogue | schema fail, safety fail, scenario incomplete | — | default | — |
| LessonBlueprint | schema fail, pedagogy fail | — | default | — |
| LessonInstance | schema fail, template mismatch | — | default | — |
| ExerciseInstance | schema fail, template fail, grading invalid | — | optional | schema + template pass; template pre-approved |
| ExamTask | schema fail, safety fail, exam misalignment | — | always | — |
| ReflectionLessonDraft | schema fail, safety fail | — | default or sampling | — |

## 8. ValidationReport Schema

- **artifact_ref**: client_generated_id or id.
- **passed**: boolean (all blocking checks passed).
- **checks**: CheckResult[].
- **overall_score**: optional 0–100.
- **recommendations**: optional string[] (e.g. “consider adding example sentence”).

## 9. Failure Modes

- Moderation API down → treat as fail (do not persist) or optional “skip safety” in dev only.
- Validator throws → catch; add check result with failed + error message; continue other validators.

## 10. Security and Safety

- All user-facing text must pass moderation before persist.
- Block list and policy checks are mandatory for certain categories (e.g. no harmful content).

## 11. Dependencies

- content-artifact-model.md
- generation-pipeline-architecture.md
- docs/final/content/content-quality-rules.md
- docs/final/prompts/ai-content-generation-policies.md

## 12. Recommended Decisions

- Implement each validator as a pure function (artifact, context) → CheckResult[].
- ValidationReport is built by running all validators for the artifact type and aggregating.
- Quality gate logic is a separate function (artifact_type, report, policy) → GateOutcome.
