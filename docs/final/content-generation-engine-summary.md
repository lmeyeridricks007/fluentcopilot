# Content Generation Engine — Final Summary

## 1. Purpose

This document summarizes the **content generation engine** design and implementation scaffolding for the AI Language Coach. The engine creates, expands, validates, versions, and prepares learning content at scale through a controlled pipeline: structured input → prompt template → generation → parse → validation → normalization → scoring → review routing → persistence → publish candidate. It does not rely on raw one-shot LLM output in production.

---

## 2. Engine Architecture

- **Stages**: Request formation → Source loading → Prompt selection → Prompt rendering → Model invocation → Structured output parse → Normalization → Rule validation → Scoring → Deduplication → Review routing → Persistence → Publish candidate registration.
- **Principles**: Structured input and output; template-driven generation; validation before persist; provenance on every artifact; review or auto-approve by policy; versioning and rollback support.
- **Docs**: docs/content/content-generation-engine-overview.md, docs/pipelines/generation-pipeline-architecture.md.

---

## 3. Schemas and Artifact Model

- **Artifact types**: VocabularyItem, PhraseItem, Dialogue, LessonBlueprint, LessonInstance, ExerciseInstance, PronunciationTarget, ExamTask, ReflectionLessonDraft. Each has metadata (locale, cefr_level, status, source) and optional provenance (prompt_template_code, prompt_version, model_id, input_hash).
- **Zod schemas**: src/content-engine/schemas/artifacts.ts (all types), requests.ts (GenerationRequest, BatchOptions), validation.ts (ValidationReport, CheckResult).
- **Types**: src/content-engine/types/artifacts.ts, requests.ts, validation.ts, pipeline.ts.
- **Docs**: docs/content/content-artifact-model.md.

---

## 4. Prompt Execution Framework

- **Template selection**: By use case and artifact type; registry returns PromptTemplateRef (code, version, body, input_schema, output_schema, constraints, safety).
- **Model abstraction**: LLMProvider.invoke(request) → InvokeResult (raw_response, usage); no direct API in engine.
- **Output**: ParseResult<T> (ParsedOutput<T> | ParseError); retry once on parse failure; moderation on text before use.
- **Traceability**: trace_id, template_code, template_version, model_id, input_hash, validation result.
- **Docs**: docs/prompts/prompt-execution-framework.md.
- **Scaffolding**: src/content-engine/prompts/registry.ts (getTemplate, getTemplateForUseCase).

---

## 5. Generation Pipelines

- **Single-item**: IGenerationPipeline.run(request) → PipelineResult (success, stored_artifacts, errors, validation_reports).
- **Batch**: BatchJob with requests[] and BatchOptions (chunk_size, concurrency, rate_limit_rpm, max_cost_usd, resume_from_checkpoint); BatchResult with success_count, error_count, artifact_ids, errors.
- **Stub**: StubGenerationPipeline validates request and returns success with empty artifacts; full implementation wires registry, provider, validators, repositories.
- **Docs**: docs/pipelines/generation-pipeline-architecture.md, docs/content/content-generation-batch-strategy.md.
- **Scaffolding**: src/content-engine/pipelines/orchestrator.ts (IGenerationPipeline, StubGenerationPipeline, IBatchRunner).

---

## 6. Validators and Quality Gates

- **Validators**: Schema (Zod), CEFR, Duplicate, Safety, Language, Length, Scenario completeness, Pedagogy (interfaces and schema validator implemented).
- **ValidationReport**: artifact_ref, passed, checks[], overall_score, recommendations.
- **Quality gate**: evaluateGate(artifactType, report, policy) → GateOutcome (auto_reject | auto_retry | manual_review | auto_approve). Dialogue, LessonBlueprint, ExamTask, ReflectionLessonDraft → manual_review; VocabularyItem with high score → auto_approve.
- **Docs**: docs/pipelines/content-validation-and-quality-gates.md.
- **Scaffolding**: src/content-engine/validators/interfaces.ts, schemaValidator.ts; src/content-engine/review/qualityGate.ts.

---

## 7. Review and Publish Flow

- **Review queue**: ReviewQueueItem (artifact_snapshot, source_inputs, prompt_version, validation_report, quality_score, status, decision). Decision: approve | reject | edit_and_approve | send_for_regeneration.
- **Publish**: Status flow draft → in_review → approved → published → deprecated; content_version snapshot on publish; rollback supported.
- **Docs**: docs/pipelines/content-review-queue-design.md, docs/pipelines/content-publishing-flow.md.
- **Scaffolding**: types/pipeline.ts (ReviewQueueItem, ReviewDecision, PublishRecord); repositories/interfaces.ts (IReviewQueueRepository, IPublishRecordRepository).

---

## 8. Batch Strategy

- **Config**: chunk_size, concurrency, rate_limit_rpm, max_cost_usd, resume_from_checkpoint, stop_on_first_failure.
- **Resumability**: Checkpoint after each chunk; batch state (processed_count, artifact_ids, errors); resume from last_processed_index.
- **Cost**: Per-run token/cost logging; batch cap via max_cost_usd.
- **Docs**: docs/content/content-generation-batch-strategy.md.

---

## 9. Risk and Cost Control

- **Pedagogical quality**: Level appropriateness, progression, practical relevance, no bizarre examples; validators and review.
- **AI safety**: Moderation on all text; block list; no PII in prompts/logs; provenance and audit.
- **Multi-language**: locale on all artifacts; no Dutch-only hardcoding in engine.
- **Cost**: Token/cost logging; retry limits; batch caps; optional caching.
- **Kill switch**: generation_enabled and per-template flags in config.
- **Docs**: docs/content/content-generation-risk-controls.md; src/content-engine/config/index.ts.

---

## 10. Implementation Scaffolding Summary

| Module | Contents |
|--------|----------|
| **types/** | artifacts, requests, validation, pipeline (TS interfaces) |
| **schemas/** | artifacts, requests, validation (Zod) |
| **config/** | EngineConfig, defaultEngineConfig, get/setEngineConfig |
| **prompts/** | registry (getTemplate, getTemplateForUseCase), default templates |
| **generators/** | IContentGenerator and input/result types |
| **validators/** | ValidatorFn, IValidatorRegistry, buildValidationReport, validateSchema |
| **normalizers/** | NormalizeInput, INormalizer |
| **scorers/** | scoreFromReport, QualityScore |
| **pipelines/** | IGenerationPipeline, StubGenerationPipeline, IBatchRunner |
| **repositories/** | IVocabularyRepository, IDialogueRepository, … IGenerationBatchRepository |
| **review/** | evaluateGate, QualityGatePolicy |
| **cli/** | run.ts (generate:scenario, generate:batch, validate:artifacts, publish:approved) |
| **tests/** | schemaValidator, requestSchema, pipeline, qualityGate |

---

## 11. What Still Needs Real Implementation

- **LLM provider**: Implement InvokeRequest → InvokeResult (e.g. OpenAI, Anthropic adapter).
- **Prompt executor**: Render template + variables; call provider; parse response; return ParseResult + trace.
- **Full pipeline**: Wire registry, executor, validators, normalizers, scorers, quality gate, repositories; run all stages; persist and optionally create review queue items.
- **Batch runner**: Concurrency loop, chunking, checkpoint persistence, cost accumulation.
- **Repositories**: DB implementations for vocabulary, dialogue, lesson, exercise, exam, reflection draft, review queue, publish record, batch.
- **Safety**: Moderation API integration in SafetyValidator; PII stripping in prompt render.

---

## 12. Tests

- **schemaValidator.test.ts**: Valid/invalid VocabularyItem and Dialogue.
- **requestSchema.test.ts**: generationRequestSchema, batchOptionsSchema.
- **pipeline.test.ts**: StubGenerationPipeline success and failure.
- **qualityGate.test.ts**: auto_reject, manual_review, auto_approve.

Run: `npm run test` (Vitest).

---

## 13. Document Index

| Document | Location |
|----------|----------|
| Engine overview | docs/content/content-generation-engine-overview.md |
| Use cases | docs/content/content-generation-use-cases.md |
| Artifact model | docs/content/content-artifact-model.md |
| Prompt execution framework | docs/prompts/prompt-execution-framework.md |
| Pipeline architecture | docs/pipelines/generation-pipeline-architecture.md |
| Validation and quality gates | docs/pipelines/content-validation-and-quality-gates.md |
| Review queue design | docs/pipelines/content-review-queue-design.md |
| Publishing flow | docs/pipelines/content-publishing-flow.md |
| Batch strategy | docs/content/content-generation-batch-strategy.md |
| Risk controls | docs/content/content-generation-risk-controls.md |
| Review v1 | docs/reviews/content-generation-engine-review-v1.md |
| Audit | docs/audits/content-generation-engine-audit.md |
| Final summary | docs/final/content-generation-engine-summary.md (this file) |

---

## 14. Recommended Next Steps

1. **Implement LLM provider adapter** and prompt executor (render + invoke + parse).
2. **Implement full pipeline** in pipelines/orchestrator.ts: load template, build variables from request + source, execute, normalize, validate, score, gate, persist or enqueue review.
3. **Implement repositories** against existing DB schema (docs/final/data/database-schema.md).
4. **Implement batch runner** with concurrency and checkpoint persistence.
5. **Wire CLI** to real pipeline and batch runner; add config file support for generate:batch.
6. **Add SafetyValidator** that calls moderation API; integrate into pipeline.
7. **Telemetry adapter**: Define interface for “regeneration/expansion” signals and feed into batch or single-item requests.
