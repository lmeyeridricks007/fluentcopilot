# Conversation latency refactor (FluentCopilot Talk)

## Problem statement

The legacy path used **one large JSON contract** per turn (`assistantReply`, `feedback`, `saveWordCandidates`, `scenarioProgress`, `updatedSummary`, …) in a **single blocking** `POST /conversations/{threadId}/messages` call. That inflated:

- **Prompt + completion size** (slow token generation and validation).
- **Perceived latency** (no assistant text until coaching + extraction + summary finished).
- **Scenario start** (blocking side-effects like blob upload on the critical path).

## New architecture (staged)

### Stage A — fast assistant reply (blocking, user-visible)

- **LLM**: `generateAssistantReplyOnly` → small `REPLY_ONLY_JSON_CONTRACT` (persona line + light progress flags).
- **Persistence**: user row, assistant row (with `metadata.enrichmentPending: true`), thread `currentStage` from reply.
- **HTTP**: `POST .../messages` returns immediately with `enrichmentPending: true`, `feedback: null`, empty `saveWordCandidates`, and `perf` timings.

### Stage B — enrichment (second request, non-blocking for assistant text)

- **LLM**: `generateTurnEnrichment` → `ENRICHMENT_JSON_CONTRACT` (coach feedback, save phrases/words, rolling summary, optional `scenarioProgress` for streamed turns, optional `evaluation` blob).
- **HTTP**: `POST .../conversations/{threadId}/messages/enrich` with `{ userMessageId, assistantMessageId }`.
- **Persistence**: `FeedbackItems` (when `feedbackMode === 'turn'`), `ConversationThreads.summaryText`, assistant `metadata.saveWordCandidates` + `enrichmentComplete`, optional artifact upload.
- **Idempotency**: if `metadata.enrichmentComplete` is already true, returns cached row without a second LLM call.

### Stage C — side-effects

- **Async / fire-and-forget** (local): `publishAppEvent` after Stage A where safe; artifact upload deferred to Stage B.
- **Production evolution**: replace “second HTTP from client” with **Service Bus + worker** using the same enrichment function body; the client would then subscribe via **SSE / polling / WebSocket** for enrichment completion.

## Streaming (Stage A)

- **Route**: `POST .../conversations/{threadId}/messages/stream`
- **Wire format**: **NDJSON** (`application/x-ndjson`): `meta` → many `delta` → `done`.
- **Providers**: OpenAI SDK streaming for direct API; Azure OpenAI uses chunked SSE over REST. Mock yields one chunk.
- **Frontend**: gated by `NEXT_PUBLIC_CONVERSATION_STREAM=1`; falls back to JSON Stage A otherwise.

## Prompt / context trimming

- **Recent turns**: default window reduced from **24 → 8** (`AI_CONVERSATION_RECENT_MESSAGES_MAX`, min 4 / max 40).
- **Rolling summary**: still `thread.summaryText`; **updated asynchronously** in Stage B (not required to show the assistant reply).
- **Separate system prompts** for reply-only vs enrichment to avoid shipping the full monolithic JSON contract on Stage A.

## Model strategy (OpenAI direct vs Azure later)

| Stage / use        | Env (OpenAI direct)        | Notes                                      |
|-------------------|----------------------------|--------------------------------------------|
| Stage A reply     | `OPENAI_MODEL_CONVERSATION` (fallback `OPENAI_MODEL`) | Default `gpt-4o-mini`                    |
| Stage B enrich    | `OPENAI_MODEL_ENRICHMENT`  | Defaults to conversation model             |
| End recap         | `OPENAI_MODEL_RECAP`       | Defaults through enrichment → conversation |
| Azure deployments | `AZURE_OPENAI_DEPLOYMENT_CHAT`, optional `AZURE_OPENAI_DEPLOYMENT_ENRICHMENT` | Same split pattern |

Token budgets: `AI_CONVERSATION_REPLY_MAX_OUTPUT_TOKENS`, `AI_CONVERSATION_ENRICHMENT_MAX_OUTPUT_TOKENS` (see `aiProviderConfig.ts`).

## Instrumentation

- **Backend**: `ConversationPerf` marks + `perf` object on JSON responses; `conversation_perf` log lines in local profiles.
- **Frontend**: `[fc-conv]` console logs in development (or `NEXT_PUBLIC_CONVERSATION_PERF=1`).

## Contracts

| Type / route              | Role                                      |
|---------------------------|-------------------------------------------|
| `SendMessageResponse`     | Stage A result + `enrichmentPending` + `perf` |
| `EnrichTurnResponse`      | Stage B merge payload                     |
| NDJSON stream events      | Progressive Stage A + same enrich follow-up |

## Remaining bottlenecks / follow-ups

1. **Client-driven Stage B** is simple for local dev; production should move enrichment to a **queue + worker** and push updates to the client.
2. **Cold Azure Functions host** still adds seconds on first call — mitigated by warming / premium plans / separating API host.
3. **Moderation** on Stage A is still sequential; could parallelize safe paths per policy.
4. **True “single connection” streaming + enrich** could use WebSockets or SSE multiplexing instead of REST + REST.
