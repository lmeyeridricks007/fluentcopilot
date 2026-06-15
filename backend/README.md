# FluentCopilot — Azure Functions backend

TypeScript Azure Functions (programming model v4) for **Feature 1: text conversation** and future surfaces.

## Azure dev setup

1. Copy `local.settings.example.json` → `local.settings.json` only if you need to run Functions locally against Azure dev resources.
2. Put real secret values in Azure Function App settings or the untracked `local.settings.json`; do not commit them.
3. Bootstrap the clean Azure SQL database with `backend/database/azure_clean_create_and_seed.sql`.
4. Deploy the backend to the Azure Function App:

```bash
# from repo root
npm run backend:deploy

# or
./scripts/deploy-backend.sh
```

Base URL: `https://func-language-tutor-dev-cqd6fkgdb2hmcnah.westeurope-01.azurewebsites.net/api/`

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
