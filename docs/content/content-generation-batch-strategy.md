# Content Generation Batch Strategy

## 1. Purpose

This document defines how the content generation engine **generates content at scale**: batch configuration, chunking, concurrency, rate limiting, resumability, cost management, job tracking, and artifact grouping. It supports use cases such as “generate 100 café lessons across levels”, “generate 500 vocabulary packs”, “generate B1 exam tasks for speaking”, and “regenerate all beginner workplace dialogues”.

## 2. Scope

- **In scope**: Batch request shape; chunking strategy; concurrency and rate limits; resumability (checkpoints, resume from failure); cost caps; job tracking (batch_id, status, counts); artifact grouping and output organization.
- **Out of scope**: Specific job scheduler (e.g. Bull, Celery); only design and contracts.

## 3. Batch Configuration

| Parameter | Type | Description |
|-----------|------|-------------|
| job_type | string | e.g. vocabulary_pack, dialogue, lesson_blueprint, exam_task |
| requests | GenerationRequest[] | One per item (e.g. 100 scenarios × 3 levels = 300 requests) |
| options | BatchOptions | chunk_size, concurrency, rate_limit_rpm, max_cost_usd?, resume_from_checkpoint? |

### 3.1 BatchOptions

| Option | Type | Default | Description |
|--------|------|---------|--------------|
| chunk_size | number | 10 | Process N requests per chunk before checkpoint |
| concurrency | number | 3 | Max parallel pipeline runs |
| rate_limit_rpm | number | 60 | Max requests per minute to provider (if applicable) |
| max_cost_usd | number? | null | Optional cap; stop batch if estimated cost exceeds |
| resume_from_checkpoint | boolean | false | If true, load checkpoint and skip already-processed |
| stop_on_first_failure | boolean | false | If true, stop batch on first item failure |

## 4. Chunking

- **Purpose**: Avoid long-running single jobs; allow progress persistence and resume.
- **Mechanism**: Split requests into chunks of size chunk_size; after each chunk, persist progress (batch_id, last_processed_index, stored_artifact_ids, error_count); optionally persist artifact_ids per chunk for grouping.
- **Resume**: On restart with resume_from_checkpoint=true, load batch state; skip requests [0, last_processed_index); continue from last_processed_index.

## 5. Concurrency

- **Concurrency limit**: At most N pipeline runs in parallel (e.g. 3). Use a semaphore or queue; when one pipeline run completes, start the next request.
- **Provider limits**: rate_limit_rpm may require throttling (e.g. sleep or queue) so that total invokes per minute do not exceed provider limit.

## 6. Rate Limiting

- **Per provider**: Respect provider’s RPM/token limits; throttle invocations.
- **Global**: Optional global cap across all batches (e.g. max 100 RPM total) for cost/safety.

## 7. Resumability

- **Checkpoint**: After each chunk (or each item if chunk_size=1), update batch state: last_processed_index, artifact_ids[], errors[].
- **Storage**: Batch state in DB or file (generation_batches table: batch_id, status, total_count, processed_count, artifact_ids[], errors[], created_at, updated_at).
- **Idempotency**: Each request should be idempotent by (batch_id, request_index) so that replay does not create duplicates; use deterministic client_generated_id from (batch_id, index) if needed.

## 8. Cost Management

- **Per-invocation cost**: Log token usage and estimated cost (from model price table); accumulate in batch.
- **Cap**: If max_cost_usd set, before each new invocation check (accumulated_cost + estimated_next) <= max_cost_usd; else pause or stop batch and report.
- **Reporting**: Batch result includes total_estimated_cost, total_requests, success_count, failure_count.

## 9. Job Tracking

- **Batch record**: batch_id (UUID), job_type, status (running | completed | failed | partial), total_count, processed_count, success_count, error_count, artifact_ids[], errors[] (list of { request_index, error_message }), total_estimated_cost?, created_at, updated_at, completed_at?.
- **Query**: API or CLI can query batch by batch_id for status and results.

## 10. Artifact Grouping

- **By batch**: All artifacts from a batch carry generation_batch_id; easy to list “all artifacts from batch X”.
- **By scenario/level**: For “100 café lessons across levels”, each request has scenario_id + cefr_level; artifacts are grouped logically by (scenario_id, cefr_level) for downstream use (e.g. discovery, recommendations).
- **Output**: Batch runner returns BatchResult { batch_id, status, success_count, error_count, artifact_ids[], errors[], total_estimated_cost? }.

## 11. Example: Generate 100 Café Lessons Across Levels

- **Requests**: 100 items = e.g. 10 scenarios × 2 levels (A1, A2) × 5 variants, or 100 (scenario_id, level) pairs.
- **Config**: chunk_size=10, concurrency=3, rate_limit_rpm=60.
- **Flow**: Create batch; for each chunk of 10, run pipeline 3 at a time (throttled); checkpoint after chunk; on failure, record error and continue (unless stop_on_first_failure); at end, set status=completed or partial; return BatchResult.

## 12. Failure Modes

- **Single item failure**: Record in errors[]; continue next item (unless stop_on_first_failure).
- **Checkpoint write failure**: Retry; if persistent, fail batch and report last_processed_index for manual resume.
- **Cost cap exceeded**: Stop batch; set status=partial; report.

## 13. Dependencies

- generation-pipeline-architecture.md (single-item pipeline)
- content-artifact-model.md (GeneratedContentBatch)
- prompt-execution-framework.md (usage/cost logging)

## 14. Recommended Decisions

- Implement BatchRunner that takes (batch_id, requests[], options) and runs pipeline per request with concurrency and chunking; persists batch state and artifacts via repository.
- Use a simple in-memory queue or worker pool for concurrency; for production, plug in a job queue (Bull, etc.) that respects the same contract.
