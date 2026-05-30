# FluentCopilot backend — architecture (Azure-first)

## Goals

- **Azure Functions** as the HTTP API runtime (scale-to-zero friendly, EU regions).
- **Azure SQL** as the system of record for threads, messages, feedback, saved words, scenario/persona definitions.
- **Azure OpenAI** for assistant turns, structured JSON, and recap (toggleable vs **LocalMock**).
- **Azure AI Content Safety** for moderation (toggleable vs **NoOp** in `LocalMock`).
- **Azurite** + **Service Bus Emulator** prepared for local parity with cloud.
- **Application Insights**-ready structured logs (`correlation-id` header on responses).

## Repository layout

```
backend/
  src/
    main.ts                    # Loads HTTP registrations
    http/registerHttpFunctions.ts
    config/env.ts              # Profile + connection strings (no secrets in code)
    models/contracts.ts        # Domain DTOs shared across layers
    domain/                    # Pure rules, scenario defaults (no I/O)
    repositories/              # SQL access only (parameterized queries)
    services/
      conversation/            # Application orchestration (Feature 1)
      sql/
      azureOpenAi/             # REST client, parsers, mock generator
      moderation/              # Provider pattern
      storage/                 # Blob abstraction (Azurite / Azure)
      serviceBus/              # Topic publish (emulator / Azure)
      telemetry/               # AI hooks / structured logs
    prompts/                   # Layered prompt construction (no prompts in HTTP files)
    shared/                    # errors, http wrapper, logging, ids
  database/                    # Schema, migrations, seeds (see sibling doc)
```

## Layering rules

| Layer | Responsibility |
|-------|------------------|
| **HTTP (`registerHttpFunctions`)** | Routing, Zod validation, `x-user-id`, map to app service |
| **conversationAppService** | Transactional orchestration: moderate → persist user msg → LLM → moderate → persist assistant → feedback rules → summary update |
| **Repositories** | CRUD + queries; no business rules |
| **Prompts** | Build system/user messages from scenario/persona/mode |
| **Providers** | Mock vs Azure implementations selected by `APP_PROFILE` / env presence |

## API surface (relative to `/api`)

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/health` | Liveness + SQL probe |
| POST | `/conversations/start` | Start or return active thread |
| GET | `/conversations/{threadId}` | Thread + messages + scenario + persona + feedback |
| POST | `/conversations/{threadId}/messages` | User turn → assistant + optional feedback |
| POST | `/conversations/{threadId}/end` | Recap + complete thread |
| GET | `/talk/continue` | Latest active thread for Talk landing |
| POST | `/saved-words` | Persist saved lexeme |

## Environment profiles

- **LocalMock** — No Azure OpenAI or Content Safety calls; deterministic mock turn/recap; SQL optional (degraded health if missing).
- **LocalAzure** — Functions local; OpenAI + Content Safety hit **real Azure endpoints** (keys in `local.settings.json`).
- **CloudDev** — Same as LocalAzure but deployed; settings from App Configuration / Key Vault.

## Future expansion (hooks already present)

- **Service Bus**: `publishAppEvent` after start / turn / end (topic name configurable).
- **Blob**: `tryUploadConversationArtifact` under `conversations/{threadId}/…` for future audio, OCR, exports.
- **Speech / pronunciation**: add provider under `services/speech/`; reuse moderation + storage.
- **Auth**: replace `x-user-id` with validated JWT / EasyAuth principal id.

## Error contract

JSON errors: `{ "error": { "code", "message", "fields?" } }` aligned with product API guidelines.

## Related docs

- [Setup & operations](./backend-setup-azure-local-and-cloud.md)
- [Database](./database-migrations-and-seeding.md)
- [OpenAI orchestration](./azure-openai-conversation-orchestration.md)
