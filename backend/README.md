# FluentCopilot — Azure Functions backend

TypeScript Azure Functions (programming model v4) for **Feature 1: text conversation** and future surfaces.

## Quick start

1. Copy `local.settings.example.json` → `local.settings.json` and fill values.
2. Deploy SQL schema + seeds (see `/docs/backend/backend-setup-azure-local-and-cloud.md`).
3. Install Azure Functions Core Tools v4 (`npm i -g azure-functions-core-tools@4 --unsafe-perm true` or official installer).
4. From this folder use **`npm start`** (not bare `func start` if you are unsure):

```bash
npm install
npm start
```

`npm start` forces `FUNCTIONS_WORKER_RUNTIME=node`. If you run `func start` interactively and pick **dotnet** by mistake, Core Tools writes `dotnet-isolated` into `local.settings.json` and you will see **0 functions** / **No HTTP routes** — set `FUNCTIONS_WORKER_RUNTIME` back to **`node`** in `local.settings.json`.

**`Failed to decrypt settings`:** use `"IsEncrypted": false` when values are plain text. `IsEncrypted: true` requires values produced by `func settings add`, not hand-edited strings.

Base URL: `http://localhost:7071/api/`

## Profiles

| `APP_PROFILE` | LLM | Moderation | Typical use |
|---------------|-----|------------|-------------|
| `LocalMock` | Deterministic mock | No-op | Free local dev, CI |
| `LocalAzure` | Azure OpenAI (cloud) | Content Safety (cloud) | Integration testing |
| `CloudDev` | Azure OpenAI | Content Safety | Deployed dev slot |

## Auth (dev)

Send header `x-user-id` (external id, e.g. `local-demo-user`). Production should swap to EasyAuth / JWT validation in middleware (future).

## Documentation

- [Setup & operations — local + Azure](../docs/backend/backend-setup-azure-local-and-cloud.md)
- [Architecture](../docs/backend/backend-architecture.md)
- [Database migrations & seeding](../docs/backend/database-migrations-and-seeding.md)
- [OpenAI orchestration](../docs/backend/azure-openai-conversation-orchestration.md)
