# Local conversation performance (FluentCopilot)

## Quick start

1. **Backend** (Azure Functions): from `backend/`, run the Functions host per your existing README (`func start` or npm script).
2. **Frontend**: set `NEXT_PUBLIC_API_BASE_URL` (e.g. `http://localhost:7071`) and `NEXT_PUBLIC_FEATURE1_CHAT_SOURCE=backend` so Talk uses HTTP, not the mock store.
3. **Database**: SQL must be reachable — conversation routes require a pool (same as before).

## Environment variables

### API / Functions (backend `local.settings.json` or shell)

| Variable | Purpose |
|----------|---------|
| `AI_PROVIDER` | `openai` \| `azure-openai` \| `mock` |
| `OPENAI_API_KEY` | Required when `AI_PROVIDER=openai` |
| `OPENAI_MODEL_CONVERSATION` | Stage A fast reply model (optional; falls back to `OPENAI_MODEL` then `gpt-4o-mini`) |
| `OPENAI_MODEL_ENRICHMENT` | Stage B coach / extraction (optional; defaults to conversation model) |
| `OPENAI_MODEL_RECAP` | End-of-thread recap (optional) |
| `AI_CONVERSATION_RECENT_MESSAGES_MAX` | Recent-turn window (default **8**, min 4, max 40) |
| `AI_CONVERSATION_REPLY_MAX_OUTPUT_TOKENS` | Stage A cap (default 520) |
| `AI_CONVERSATION_ENRICHMENT_MAX_OUTPUT_TOKENS` | Stage B cap (default 900) |
| `CONVERSATION_PERF_LOG=1` | Extra `conversation_perf` lines from Azure host logs |

### Azure OpenAI (optional)

| Variable | Purpose |
|----------|---------|
| `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_API_VERSION` | REST access |
| `AZURE_OPENAI_DEPLOYMENT_CHAT` (or `AZURE_OPENAI_DEPLOYMENT`) | Stage A deployment |
| `AZURE_OPENAI_DEPLOYMENT_ENRICHMENT` | Optional Stage B deployment |

### Next.js (frontend `.env.local`)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | Functions origin without `/api` suffix (client adds `/api`) |
| `NEXT_PUBLIC_FEATURE1_CHAT_SOURCE=backend` | Force backend chat |
| `NEXT_PUBLIC_CONVERSATION_STREAM=1` | Use NDJSON streaming for Stage A |
| `NEXT_PUBLIC_CONVERSATION_PERF=1` | Verbose `[fc-conv]` timing logs even outside dev |

## What to measure locally

Use browser DevTools **Network** plus `[fc-conv]` logs:

| Metric | How |
|--------|-----|
| Scenario start → thread visible | Time from tap to first paint of `TrainStationChatPage` (seeded query cache from `POST /conversations/start`). |
| Send → first assistant token | NDJSON first `delta` timestamp minus send click (streaming mode). |
| Send → full assistant JSON | `POST .../messages` completion time; check `perf` object. |
| Send → coach feedback visible | Time until `POST .../messages/enrich` completes and UI merges feedback. |

Backend `perf` keys are best-effort deltas between internal marks (`d_*_ms`, `tTotalMs`).

## Fast scenario start

- `startConversation` returns after inserting the thread + deterministic opening message.
- `publishAppEvent` and `tryUploadConversationArtifact` are **fire-and-forget** so they do not extend the HTTP critical path.
- Talk “Start” seeds React Query `['conversation', threadId]` before navigation so the thread route is not blank while `GET .../conversations/{id}` refetches.

## Troubleshooting

- **CORS**: streaming uses the same CORS helper as JSON routes; ensure `NEXT_PUBLIC_API_BASE_URL` origin is allowed by Functions CORS config.
- **Enrich fails**: assistant text is already shown; use “Retry coach tips” (reuses last ids).
- **Stream shows errors**: malformed NDJSON — check Functions logs for `ndjson_stream_failed`.
