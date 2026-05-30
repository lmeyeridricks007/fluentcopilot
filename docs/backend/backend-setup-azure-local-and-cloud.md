# Backend setup — Azure Functions, local emulators, and cloud

This guide covers **end-to-end** setup for the FluentCopilot Azure Functions backend (`/backend`): local run, emulators, Azure provisioning, secrets, database, OpenAI, Content Safety, and promotion to cloud.

---

## 1. Architecture overview

| Component | Local | Cloud |
|-----------|-------|-------|
| HTTP API | Azure Functions Core Tools | Azure Functions (Consumption / Premium / Flex) |
| SQL | Docker SQL Server / LocalDB / Azure SQL edge | Azure SQL Database |
| Blob | **Azurite** | Azure Storage Account |
| Messaging | **Service Bus Emulator** | Azure Service Bus |
| LLM | **Mock** or **Azure OpenAI** (remote) | Azure OpenAI |
| Moderation | **No-op** or **Content Safety** (remote) | Azure AI Content Safety |
| Telemetry | Console / host logs | Application Insights |

See [backend-architecture.md](./backend-architecture.md) for module boundaries.

Conversation LLM providers (OpenAI direct, Azure OpenAI, mock): [ai-provider-architecture.md](./ai-provider-architecture.md) and [openai-now-azure-later-strategy.md](./openai-now-azure-later-strategy.md).

---

## 2. Prerequisites

- **Node.js 20+** (LTS recommended).
- **npm** 10+.
- **Azure Functions Core Tools v4**  
  Install: [Microsoft docs](https://learn.microsoft.com/azure/azure-functions/functions-run-local) — e.g. `brew tap azure/functions && brew install azure-functions-core-tools@4` (macOS) or MSI/npm global per docs.
- **Docker** (optional, for SQL + Azurite + emulator containers).
- **Azure CLI** (`az login`) when provisioning cloud resources.

---

## 3. Clone, configure, build

```bash
cd backend
cp local.settings.example.json local.settings.json
npm install
npm run build
func start
```

Default base URL: **`http://localhost:7071/api/`**

### 3.1 `local.settings.json` (secrets)

Never commit `local.settings.json`. Copy from `local.settings.example.json` and set:

| Key | Purpose |
|-----|---------|
| `APP_PROFILE` | `LocalMock` \| `LocalAzure` \| `CloudDev` |
| `SQL_CONNECTION_STRING` | Azure SQL or local SQL Server |
| `AZURE_OPENAI_*` | Endpoint, key, API version, deployment name |
| `AZURE_CONTENT_SAFETY_*` | Endpoint + subscription key |
| `AZURE_STORAGE_CONNECTION_STRING` | `UseDevelopmentStorage=true` for Azurite |
| `AZURE_STORAGE_SERVICE_VERSION` | Optional. **Public Azure only** — override blob REST `x-ms-version` (see §6.1). Leave unset for Azurite; the backend pins a compatible version automatically. |
| `AZURITE_ALLOW_AZURE_SERVICE_VERSION` | Set to `1` only with `AZURE_STORAGE_SERVICE_VERSION` to force that version against Azurite / non–public-cloud strings (advanced). |
| `SERVICE_BUS_CONNECTION_STRING` | Emulator or namespace connection string |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | Optional for local AI export |
| `CORS_ALLOWED_ORIGINS` | Optional. Comma-separated browser origins (e.g. `https://app.example.com`). Local profiles default to `localhost:3000` / `127.0.0.1:3000` when unset. |

`AzureWebJobsStorage` — use `UseDevelopmentStorage=true` with Azurite for Functions runtime internal state.

### 3.2 Local CORS (browser → Functions)

If the frontend runs on **http://localhost:3000** (or **127.0.0.1:3000**) and calls **http://localhost:7071**, the browser sends a **CORS preflight** (`OPTIONS`). Without CORS, the console shows *No 'Access-Control-Allow-Origin' header* and the UI may show **Failed to fetch**.

Add a **`Host`** block to **`local.settings.json`** (see `local.settings.example.json`) if you use Core Tools features that read it:

```json
"Host": {
  "CORS": "http://localhost:3000,http://127.0.0.1:3000"
}
```

The **Node v4 programming model** answers browser **preflight (`OPTIONS`)** from the function app itself: each HTTP route registers **`OPTIONS`**, and responses include **`Access-Control-Allow-Origin`** when the request **`Origin`** is allowed. For **LocalMock** / **LocalAzure**, allowed origins default to **`http://localhost:3000`** and **`http://127.0.0.1:3000`**. Override or extend with app setting **`CORS_ALLOWED_ORIGINS`** (comma-separated). For **CloudDev**, set **`CORS_ALLOWED_ORIGINS`** to your web app origin(s) or configure CORS in the **Azure Portal** on the Function App.

Restart **`func start`** / **`npm start`** in `/backend` after changing settings.

---

## 4. Environment profiles

### LocalMock (default)

- **No** Azure OpenAI or Content Safety calls.
- Deterministic conversation + recap (`mockTurnGenerator`).
- SQL **optional**: health returns `degraded` if `SQL_CONNECTION_STRING` missing; conversation endpoints require SQL.

### LocalAzure

- Functions run **locally**; OpenAI + Content Safety call **real Azure** in the cloud.
- Set keys in `local.settings.json` (personal dev keys or team dev subscription).
- **Step-by-step:** [azure-openai-and-foundry-setup.md](./azure-openai-and-foundry-setup.md) (Azure OpenAI, Azure AI Foundry portal, Content Safety, env mapping).

### CloudDev

- Same code deployed to Azure; settings from **Application settings** / **Key Vault references**.
- Use for integration, stakeholder demos, pre-prod.

---

## 5. Azure SQL Database — provision

1. `az group create -n rg-fluentcopilot-dev -l westeurope`
2. Create server + database (portal or CLI). Example CLI pattern:
   - `az sql server create` …
   - `az sql db create` …
3. Firewall: allow your IP for dev; use private endpoint for production.
4. Connection string format (ADO.NET style works with `mssql`):
   - `Server=tcp:YOURSERVER.database.windows.net,1433;Database=FluentCopilot;User ID=...;Password=...;Encrypt=True;`

### 5.1 Apply schema and seeds

See [database-migrations-and-seeding.md](./database-migrations-and-seeding.md).

Run in order:

1. `backend/database/schema/001_initial_schema.sql`
2. `backend/database/seed/001_seed_reference_data.sql`
3. `backend/database/seed/002_seed_mock_scenarios.sql`
4. `backend/database/seed/003_seed_personas.sql`

---

## 6. Run Azurite (Blob + legacy storage)

**Prefer a project-local install** (avoids macOS `EACCES` on `npm install -g` under `/usr/local`):

```bash
cd backend
npm install   # installs devDependency `azurite`
npm run azurite
```

Equivalent one-off: `npx azurite --silent --location ./azurite-data --debug ./azurite-debug.log` from `backend/`.

If you really want global Azurite, fix npm’s global prefix to a directory you own, or use `sudo` only as a last resort.

Set in `local.settings.json`:

- `AzureWebJobsStorage=UseDevelopmentStorage=true`
- `AZURE_STORAGE_CONNECTION_STRING=UseDevelopmentStorage=true`

### 6.1 Blob service API version (`x-ms-version`)

All app blob traffic goes through `backend/src/services/storage/blobStorageService.ts`, which builds `BlobServiceClient` with pipeline options from `blobClientPipelineOptions.ts`:

| Connection string | `x-ms-version` behavior |
|---------------------|-------------------------|
| Azurite / dev storage (`UseDevelopmentStorage=true`, `devstoreaccount1`, `127.0.0.1:10000`, etc.) | Pinned to **2024-11-04** so Azurite accepts requests (newer `@azure/storage-blob` defaults such as 2026-xx can be rejected by the emulator). |
| Other non–public-Azure hosts (custom URL, private blob host without public `EndpointSuffix`) | Same pin (**2024-11-04**). |
| Public Azure (`*.blob.core.windows.net` or `EndpointSuffix=core.windows.net` / China / Gov) | Optional **`AZURE_STORAGE_SERVICE_VERSION`** in app settings; if unset, the **SDK default** (current Azure Storage REST version). |

Advanced: set **`AZURITE_ALLOW_AZURE_SERVICE_VERSION=1`** together with **`AZURE_STORAGE_SERVICE_VERSION`** to override the pinned version for local emulator scenarios.

Speak Live and quick-capture **require** blob uploads when configured; failures surface as dependency errors rather than silent skips.

---

## 7. Azure Service Bus Emulator (local)

Microsoft provides a **Service Bus emulator** for local development (see current Microsoft Learn topic *“Service Bus emulator”*).

1. Install/run the emulator per official docs (container or installer).
2. Set `SERVICE_BUS_CONNECTION_STRING` in `local.settings.json` to the emulator connection string.
3. Create topic **`fc-app-events`** (or override `SERVICE_BUS_TOPIC_EVENTS`) — or allow publish to fail silently in early dev.

`publishAppEvent` no-ops when connection string is missing or placeholder.

---

## 8. Azure OpenAI — provision

1. Create **Azure OpenAI** resource (approved subscription).
2. In **Azure AI Studio** / portal, deploy a chat model (e.g. `gpt-4o-mini`).
3. Copy:
   - Endpoint: `https://YOUR_RESOURCE.openai.azure.com`
   - Key
   - **Deployment name** (not model name) into `AZURE_OPENAI_DEPLOYMENT_CHAT`
4. Set API version compatible with `json_object` (e.g. `2024-08-01-preview`).

### 8.1 Test from local Functions

Set `APP_PROFILE=LocalAzure`, fill OpenAI env vars, run `func start`, call:

```bash
curl -s -X POST http://localhost:7071/api/conversations/start \
  -H "Content-Type: application/json" \
  -H "x-user-id: local-demo-user" \
  -d '{"scenarioId":"train-station","mode":"guided","feedbackMode":"turn"}'
```

---

## 9. Azure AI Content Safety

1. Create **Cognitive Services** / **Content Safety** resource in the same region policy allows.
2. Copy endpoint (e.g. `https://YOUR_REGION.api.cognitive.microsoft.com`) and key.
3. Set `AZURE_CONTENT_SAFETY_ENDPOINT`, `AZURE_CONTENT_SAFETY_KEY`, `AZURE_CONTENT_SAFETY_API_VERSION`.

With `APP_PROFILE=LocalMock`, moderation is **NoOp** regardless.

With `LocalAzure`, user + assistant text are analyzed; **block** returns HTTP 400 `MODERATION_BLOCKED` or sanitized assistant fallback.

---

## 10. Application Insights (optional local)

1. Create Application Insights + copy connection string.
2. Set `APPLICATIONINSIGHTS_CONNECTION_STRING` in Azure Function App settings.
3. For local, optional; host logging already appears in terminal.

The code includes `telemetry.ts` hooks for structured dependency/event lines.

---

## 11. HTTP API quick reference

All routes under **`/api`** (Functions default). Send **`x-user-id`** and optional **`x-correlation-id`**.

| Method | Path | Body |
|--------|------|------|
| GET | `/health` | — |
| POST | `/conversations/start` | `{ scenarioId, mode, feedbackMode }` — `feedbackMode`: `turn` \| `end` \| `after_each` \| `at_end` |
| GET | `/conversations/{threadId}` | — |
| POST | `/conversations/{threadId}/messages` | `{ text }` |
| POST | `/conversations/{threadId}/end` | — |
| GET | `/talk/continue` | — |
| POST | `/saved-words` | `{ selectedText, sourceThreadId?, sourceMessageId?, sourceScenarioId?, meaning?, sourceType? }` |

---

## 12. Troubleshooting

| Symptom | Check |
|---------|--------|
| **`0 functions found`**, **`No HTTP routes`**, log shows **`DotnetIsolatedApp: True`** | `local.settings.json` → `FUNCTIONS_WORKER_RUNTIME` must be **`node`**, not `dotnet-isolated`. This happens if `func start` prompted for a worker runtime and **dotnet** was selected. Fix the value, or use `npm start` from `/backend` (it forces Node). |
| **`Failed to decrypt settings`** | `IsEncrypted` must be **`false`** for normal plaintext local dev. If it is `true`, every value must be ciphertext from `func settings add` — plaintext values will fail decryption. Set `"IsEncrypted": false` (see `local.settings.example.json`). |
| `SQL database not configured` | `SQL_CONNECTION_STRING` in `local.settings.json` |
| `Login failed for user` | SQL credentials / firewall |
| OpenAI 401/404 | Endpoint URL, key, **deployment** name, API version |
| Content Safety errors | Endpoint must be cognitive **contentsafety** host; API version |
| `func` command not found | Install Azure Functions Core Tools v4 |
| CORS / **Failed to fetch** from Next.js (`localhost:3000` → `7071`) | Add **`Host.CORS`** in `local.settings.json` (see §3.2); restart Functions. In Azure, set CORS on the Function App. |
| ECONNREFUSED Azurite | Start Azurite; use `UseDevelopmentStorage=true` |

---

## 13. Promote local → cloud dev

1. Create **Function App** (Node 20, Windows or Linux per team standard).
2. Configure **Application settings** (same keys as `local.settings.json`, from Key Vault).
3. Deploy: **GitHub Actions**, **Azure DevOps**, or `func azure functionapp publish <appName>`.
4. Run SQL scripts against **cloud** database.
5. Restrict Function auth: enable **EasyAuth** / **API Management** / function keys as policy dictates.

---

## 14. Verify end-to-end

1. `GET http://localhost:7071/api/health` → `status` ok or degraded (SQL skipped).
2. `POST /api/conversations/start` with `x-user-id` → returns `thread`, `messages`, `scenario`, `persona`.
3. `POST /api/conversations/{id}/messages` with Dutch text → `assistantMessage`, optional `feedback`.
4. `POST /api/conversations/{id}/end` → `summary`.
5. `GET /api/talk/continue` → active thread summary.

---

## 15. Phase 2 — frontend integration

- Point Next.js to Functions base URL (`NEXT_PUBLIC_API_BASE_URL` or server-only `API_BASE_URL`).
- Replace `x-user-id` with real JWT / session.
- Align `feedbackMode` naming (`after_each` / `at_end`) with existing client stores or map at BFF.

---

## Related documents

- [backend-architecture.md](./backend-architecture.md)
- [database-migrations-and-seeding.md](./database-migrations-and-seeding.md)
- [azure-openai-conversation-orchestration.md](./azure-openai-conversation-orchestration.md)
- [backend/README.md](../../backend/README.md)
