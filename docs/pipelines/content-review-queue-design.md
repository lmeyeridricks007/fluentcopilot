# Content Review Queue Design

## 1. Purpose

This document defines the **review queue model** for human or editor review of generated content: reviewable item structure, source inputs, prompt version, validator output, quality score, reviewer notes, and final decision (approve, reject, edit and approve, send for regeneration).

## 2. Scope

- **In scope**: Review queue item schema; what is attached (artifact, source, prompt version, validation report, score); decision types; workflow (assign, complete, escalate); integration with pipeline (routing) and publishing (approve → publish candidate).
- **Out of scope**: Full CMS UI for reviewers; only data model and engine contract.

## 3. Reviewable Item (ReviewQueueItem)

| Field | Type | Description |
|-------|------|-------------|
| id | string (UUID) | Queue item id |
| artifact_type | string | VocabularyItem, Dialogue, LessonBlueprint, etc. |
| artifact_id | string/number | After persist; or client_generated_id before |
| artifact_snapshot | object | Full artifact at time of queueing (for display and edit) |
| source_inputs | object | Sanitized request + source refs (no PII); e.g. scenario_id, locale, level |
| prompt_template_code | string | Template used |
| prompt_version | number | Template version |
| validation_report | ValidationReport | ValidationReport from pipeline |
| quality_score | number | 0–100 or null |
| status | enum | pending_review \| in_review \| completed |
| assigned_to | string (optional) | Reviewer actor id |
| assigned_at | ISO8601 (optional) | |
| decided_at | ISO8601 (optional) | |
| decision | ReviewDecision (optional) | When completed |
| created_at | ISO8601 | |

## 4. Review Decision

| Field | Type | Description |
|-------|------|-------------|
| decision | enum | approve \| reject \| edit_and_approve \| send_for_regeneration |
| decided_by | string | Actor id (user or system) |
| decided_at | ISO8601 | |
| notes | string (optional) | Reviewer comment |
| edited_artifact_snapshot | object (optional) | When decision = edit_and_approve; revised artifact to persist |

## 5. Workflow

- **Routing**: Pipeline creates ReviewQueueItem when policy says manual review required; status = pending_review.
- **Assignment**: Optional; assign to reviewer (assigned_to, assigned_at); status = in_review.
- **Completion**: Reviewer submits decision; store ReviewDecision; status = completed; if approve or edit_and_approve, create PublishRecord or update artifact and then publish candidate.
- **Reject**: Artifact remains draft or marked rejected; no publish.
- **Send for regeneration**: Artifact marked for regeneration; new generation request can be created with same params or adjusted.

## 6. Integration with Pipeline

- Pipeline stage “Review routing” creates ReviewQueueItem and persists it (or enqueues to a queue service).
- Pipeline does not wait for human review; it only persists artifact as draft and registers queue item.
- Separate process or API “complete review” applies decision: approve → publish candidate; edit_and_approve → persist edit then publish candidate; reject → mark artifact; send_for_regeneration → trigger new generation job.

## 7. Display Contract (for UI)

Review UI can show:
- artifact_snapshot (formatted per artifact type)
- source_inputs (scenario, locale, level)
- prompt_template_code, prompt_version
- validation_report (checks, passed, score)
- quality_score
- Reviewer: notes, decision, edited_artifact_snapshot

## 8. Failure Modes

- Queue full or service down: Pipeline still persists artifact as draft; queue item creation may be retried or stored in DB for later processing.
- Duplicate queue item: Idempotency by (artifact_id, artifact_type) or (client_generated_id, batch_id).

## 9. Dependencies

- content-artifact-model.md (ValidationReport, ReviewDecision)
- generation-pipeline-architecture.md (review routing stage)
- content-publishing-flow.md (approve → publish)

## 10. Recommended Decisions

- Store review queue items in a table (e.g. review_queue_items) with artifact_snapshot as JSONB.
- Decisions in review_decisions table linked to queue item and artifact.
- Optional: separate “review queue” service that pulls pending_review items and assigns; engine only produces items.
