# Database — migrations, schema, and seeding (Azure SQL)

## Philosophy

- **Version-controlled SQL** under `backend/database/` (not embedded in app startup).
- **Idempotent baseline** where practical (`IF NOT EXISTS` in `schema/001_initial_schema.sql`).
- **Forward-only migrations** in `migrations/` with human-readable names.
- **Seeds** use upsert/MERGE patterns; safe to re-run in dev.

## Layout

| Path | Role |
|------|------|
| `backend/database/schema/001_initial_schema.sql` | Tables, FKs, indexes, check constraints |
| `backend/database/azure_clean_create_and_seed.sql` | One-command Azure SQL bootstrap for a clean database |
| `backend/database/migrations/` | Incremental changes after baseline |
| `backend/database/seed/001_seed_reference_data.sql` | Dev user (`local-demo-user`) |
| `backend/database/seed/002_seed_mock_scenarios.sql` | `train-station` scenario |
| `backend/database/seed/003_seed_personas.sql` | NS-style assistant persona |
| `backend/database/seed/004_seed_sample_thread_optional.sql` | Optional sample thread (`@Run = 0` by default) |

## Tables (summary)

- `Users`, `UserPreferences`, `UserSignalEvents`
- `ScenarioDefinitions`, `PersonaDefinitions`
- `ConversationThreads`, `ConversationMessages`, `FeedbackItems`, `SavedWords`

## Azure SQL clean bootstrap

The dev Azure database is `LanguageTutor` on `sql-language-tutor-dev.database.windows.net`.
For a clean Azure SQL database, run the consolidated SQLCMD script from the repository root:

```bash
sqlcmd \
  -S sql-language-tutor-dev.database.windows.net,1433 \
  -d LanguageTutor \
  -U sqladmin \
  -P "$AZ_SQL_PASSWORD" \
  -N -C \
  -i backend/database/azure_clean_create_and_seed.sql
```

## Azure SQL (cloud)

1. Create **Azure SQL Database** (server + DB) in EU region.
2. Configure firewall / private endpoint per org policy.
3. Run `backend/database/azure_clean_create_and_seed.sql` once for a clean environment.
4. Store connection string in **Key Vault**; reference from Function App settings as `SQL_CONNECTION_STRING`.

## DACPAC / SQL project (optional)

This repo ships **script-based** delivery first (portable, review-friendly). If the team adopts **SQL Database Project**:

1. Import `001_initial_schema.sql` into `.sqlproj`.
2. Publish with **SqlPackage** / **VS SSDT** in pipeline.
3. Keep `migrations/` for additive changes not yet folded into the project, or generate diff from project.

Document the chosen path in the team wiki; do not mix silent drift.

## Repeatable vs one-time

- **Seeds**: must be idempotent (`IF NOT EXISTS` / `MERGE`).
- **Migrations**: assume **run once per environment**; document rollback scripts separately if needed.

## Persona ↔ scenario mapping

Persona is resolved in code (`domain/scenarios/scenarioDefaults.ts`) until `ScenarioDefinitions` gains `DefaultPersonaId` (future migration).

## Verification queries

```sql
SELECT Slug, Title FROM dbo.ScenarioDefinitions;
SELECT Slug, DisplayName FROM dbo.PersonaDefinitions;
SELECT TOP 5 Id, Status, Mode, FeedbackMode FROM dbo.ConversationThreads ORDER BY UpdatedAt DESC;
```

## Related

- [Backend setup](./backend-setup-azure-local-and-cloud.md)
- [Architecture](./backend-architecture.md)
