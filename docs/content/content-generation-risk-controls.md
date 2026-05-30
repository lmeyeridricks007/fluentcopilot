# Content Generation Risk Controls

## 1. Purpose

This document defines **risk controls** for the content generation engine: pedagogical quality, AI safety, content provenance, multi-language support, and cost control. It ensures the engine does not produce harmful, incorrect, or low-quality content and that all outputs are traceable and reviewable.

## 2. Scope

- **In scope**: Pedagogical quality principles; AI safety (harmful/offensive/bizarre output prevention); provenance requirements; multi-language and locale handling; cost control (tokens, retries, batch sizing, caching, reuse); kill switch and policy enforcement.
- **Out of scope**: Legal/compliance (handled elsewhere); only engine-level controls.

## 3. Pedagogical Quality

| Control | Description |
|---------|-------------|
| Level appropriateness | All content has or inherits CEFR level; validators check level consistency; no A2 content in B2-only flows. |
| Progression | Lesson and exercise generation can use “prerequisite” rules (e.g. vocab before dialogue). |
| Practical usefulness | Templates and prompts emphasize real-life relevance (scenarios, phrases); scenario taxonomy drives dialogue and phrase content. |
| Linguistic correctness | Validators can optionally check grammar/language (heuristic or AI-assisted); human review for high-stakes content. |
| No bizarre examples | Output schema and validation reject obviously off-topic or nonsensical text; length and format bounds. |

## 4. AI Safety

| Control | Description |
|---------|-------------|
| Harmful outputs | Moderation API on all generated text before persist; block list for prohibited topics. |
| Offensive outputs | Same moderation; policy forbids offensive or discriminatory content. |
| Bizarre/unrealistic | Schema and length checks; optional “sanity” validator; human review for dialogues and cultural notes. |
| Incorrect cultural guidance | Cultural notes and scenario content default to manual review; templates avoid generating “facts” about culture without review. |
| Unstable grading | Exercise grading logic is validated (e.g. correct answer exists, distractor count); no AI-generated “correct” answers for exam items per policy. |

## 5. Content Provenance

| Requirement | Implementation |
|-------------|----------------|
| Prompt and version | Every artifact stores prompt_template_id, prompt_template_code, prompt_version. |
| Model | model_id (provider + model name) stored. |
| Input trace | input_hash (hash of sanitized input; no PII) stored. |
| Validator results | validation_report summary or id stored. |
| Human review | review_decision_id, decided_by, decided_at when applicable. |
| Batch | generation_batch_id when part of batch. |

No artifact is published without provenance; audit trail supports recall and quality analysis.

## 6. Multi-Language Support

| Control | Description |
|---------|-------------|
| No Dutch-only hardcoding | Core engine uses locale and artifact locale field; no “nl” literal in business logic. |
| Multiple target languages | Same pipeline and templates; template and artifact locale drive language. |
| Multiple learner languages | Translations and hints can target learner locale (e.g. en for UI); engine produces content per teaching locale. |
| Locale-specific variants | Scenario and topic can vary by market (e.g. NL vs BE); filters and targeting use locale. |

## 7. Cost Control

| Control | Description |
|---------|-------------|
| Token costs | Log input_tokens, output_tokens per run; estimate cost from model price table; batch reports total. |
| Retries | Limit retries (e.g. 2) to avoid runaway cost; no infinite retry. |
| Batch sizing | chunk_size and concurrency limit parallel load; max_cost_usd cap per batch. |
| Caching | Optional: cache (request_hash, template_version) → parsed output for identical requests (e.g. deterministic seed); TTL and invalidation on template change. |
| Reuse | Reuse existing content when possible (e.g. level adaptation from existing lesson instead of full regenerate). |
| Promotion priority | High-value content types (e.g. exam, core lessons) can be prioritized for generation and review over bulk expansion. |

## 8. Kill Switch and Policy

| Control | Description |
|---------|-------------|
| Disable generation | Config flag (e.g. generation_enabled=false) stops all pipeline invocations; no new artifacts. |
| Disable by template | Per-template is_active or allow_generation flag; disabled templates are not selected. |
| Disable by artifact type | Policy can forbid generation for certain types (e.g. exam_task) from AI in production until approved. |
| Rate limit | Global or per-tenant rate limit to prevent abuse or cost spike. |

## 9. Failure Modes and Escalation

- **Repeated moderation flags**: Alert; consider disabling template or model until review.
- **High validation failure rate**: Alert; review template or model; optionally pause batch.
- **Cost spike**: Batch cap and global limits; alert if approaching budget.

## 10. Dependencies

- content-validation-and-quality-gates.md
- prompt-execution-framework.md
- docs/final/prompts/ai-content-generation-policies.md
- content-artifact-model.md (provenance fields)

## 11. Recommended Decisions

- Implement provenance as required fields on every generated artifact; reject persist if missing.
- Use a single Config or Policy service that the pipeline and batch runner read for kill switch, rate limits, and per-type rules.
- Log all generation runs (trace_id, template, model, cost, validation result) for audit and tuning.
