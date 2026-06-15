# Azure Setup Step By Step

This guide lists the Azure resources and settings needed for FluentCopilot's backend.

It is intentionally narrower than `DEPLOYMENT.md`: use this when you are in the Azure Portal and want to know exactly what to create, what values to copy, and which app settings to configure.

## 1. What You Are Setting Up

FluentCopilot has a Next.js frontend and an Azure Functions backend.

The Azure backend needs:

| Resource | Purpose |
| --- | --- |
| Resource Group | Container for all Azure resources |
| Storage Account | Required by Azure Functions and used for app artifacts/audio |
| Application Insights | Backend logs and diagnostics |
| Azure Function App | Hosts the backend API |
| Azure SQL Database | Stores conversations, scenarios, personas, and app data |
| Azure Service Bus | Publishes app events |
| OpenAI or Azure OpenAI | AI conversation and evaluation |
| Azure AI Content Safety | Optional but recommended moderation |
| Azure Speech | Speech-to-text and pronunciation features |
| Azure AI Vision | OCR/read-aloud image features |

Recommended dev region: `westeurope`.

Example names:

```text
Resource group: rg-language-tutor-dev
Storage account: stlanguagetutordev
Function App: func-language-tutor-dev
SQL server: sql-language-tutor-dev
SQL database: LanguageTutor
Service Bus namespace: sb-language-tutor-dev
Application Insights: ai-language-tutor-dev
Azure OpenAI: aoai-language-tutor-dev
Content Safety: cs-language-tutor-dev
Speech: speech-language-tutor-dev
Vision: vision-language-tutor-dev
```

Storage account, Function App, SQL server, Service Bus namespace, and AI resource names must be globally unique.

## 2. Create The Resource Group

In Azure Portal:

1. Open [Azure Portal](https://portal.azure.com).
2. Confirm the correct tenant and subscription.
3. Search for `Resource groups`.
4. Select `Create`.
5. Set the resource group name, for example `rg-language-tutor-dev`.
6. Set region, for example `West Europe`.
7. Select `Review + create`, then `Create`.

Optional CLI:

```bash
export AZ_LOCATION="westeurope"
export AZ_RESOURCE_GROUP="rg-language-tutor-dev"

az group create \
  --name "$AZ_RESOURCE_GROUP" \
  --location "$AZ_LOCATION"
```

## 3. Create The Storage Account

The Function App needs storage, and FluentCopilot also uses blob storage for artifacts/audio.

In Azure Portal:

1. Search for `Storage accounts`.
2. Select `Create`.
3. Choose your subscription and `rg-language-tutor-dev`.
4. Enter a globally unique name, for example `stlanguagetutordev`.
5. Region: same as the resource group.
6. Performance: `Standard`.
7. Redundancy for dev: `Locally-redundant storage (LRS)`.
8. Keep `Require secure transfer for REST API operations` enabled.
9. Disable anonymous blob access.
10. Select `Review + create`, then `Create`.

After it is created:

1. Open the storage account.
2. Go to `Data storage` > `Containers`.
3. Select `+ Container`.
4. Name it `fc-artifacts`.
5. Set anonymous access level to `Private`.
6. Create it.
7. Go to `Security + networking` > `Access keys`.
8. Copy the connection string for `key1`.

Save this value for later:

```text
AZURE_STORAGE_CONNECTION_STRING=<storage account connection string>
AZURE_STORAGE_CONTAINER_ARTIFACTS=fc-artifacts
```

## 4. Create Application Insights

In Azure Portal:

1. Search for `Application Insights`.
2. Select `Create`.
3. Choose the same resource group.
4. Name it, for example `ai-language-tutor-dev`.
5. Choose the same region.
6. Use workspace-based mode.
7. Create or select a Log Analytics workspace.
8. Select `Review + create`, then `Create`.

After it is created:

1. Open the Application Insights resource.
2. Go to `Configure` > `Properties`.
3. Copy the connection string.

Save:

```text
APPLICATIONINSIGHTS_CONNECTION_STRING=<app insights connection string>
```

## 5. Create The Azure Function App

This hosts the backend API.

In Azure Portal:

1. Search for `Function App`.
2. Select `Create`.
3. Choose the same subscription and resource group.
4. Function App name: for example `func-language-tutor-dev`.
5. Runtime stack: `Node.js`.
6. Version: `20 LTS`.
7. Region: same as storage.
8. Operating system: `Linux`.
9. Hosting plan:
   - Dev/simple setup: Consumption is acceptable.
   - More predictable performance: Flex Consumption or Premium.
10. Storage: select the storage account you created.
11. Monitoring: enable Application Insights and select `ai-language-tutor-dev`.
12. Select `Review + create`, then `Create`.

After it is created:

1. Open the Function App.
2. Go to `Overview`.
3. Copy the default domain, for example:

```text
https://func-language-tutor-dev.azurewebsites.net
```

You will use this as the frontend API base URL later.

## 6. Create Azure SQL

The backend uses Azure SQL for persisted app data.

In Azure Portal:

1. Search for `SQL databases`.
2. Select `Create`.
3. Choose the same subscription and resource group.
4. Database name: `LanguageTutor`.
5. Under `Server`, select `Create new`.
6. Server name: for example `sql-language-tutor-dev`.
7. Location: same region.
8. Authentication method for dev: `Use SQL authentication`.
9. Admin login: for example `sqladminuser`.
10. Enter a strong password and store it in a password manager.
11. Select `OK`.
12. Under `Compute + storage`, choose a low-cost dev tier such as `Basic` or serverless.
13. Under `Networking`, for dev choose public endpoint with a restricted firewall rule.
14. Select `Review + create`, then `Create`.

After it is created:

1. Open the SQL server resource.
2. Go to `Security` > `Networking`.
3. Add a firewall rule for your current IP so you can run migrations.
4. If your Function App needs public access to SQL, allow Azure services or add the right networking rule. For production, prefer private networking.
5. Open the SQL database.
6. Go to `Settings` > `Connection strings`.
7. Copy the ADO.NET connection string and replace placeholders.

Save:

```text
SQL_CONNECTION_STRING=Server=tcp:YOUR_SQL_SERVER.database.windows.net,1433;Database=LanguageTutor;User ID=YOUR_SQL_ADMIN;Password=YOUR_PASSWORD;Encrypt=True;TrustServerCertificate=False;
```

## 7. Create Azure Service Bus

Service Bus is used for app events. Some local/dev paths can no-op without it, but cloud environments should provision it.

In Azure Portal:

1. Search for `Service Bus`.
2. Select `Create`.
3. Choose the same subscription and resource group.
4. Namespace name: for example `sb-language-tutor-dev`.
5. Region: same region.
6. Pricing tier: `Standard` because topics require Standard or Premium.
7. Select `Review + create`, then `Create`.

After it is created:

1. Open the Service Bus namespace.
2. Go to `Entities` > `Topics`.
3. Select `+ Topic`.
4. Name it `fc-app-events`.
5. Create it.
6. Go to `Settings` > `Shared access policies`.
7. Open `RootManageSharedAccessKey`, or create a narrower Send policy for production.
8. Copy the primary connection string.

Save:

```text
SERVICE_BUS_CONNECTION_STRING=<service bus connection string>
SERVICE_BUS_TOPIC_EVENTS=fc-app-events
```

## 8. Set Up OpenAI Or Azure OpenAI

The backend supports both OpenAI direct and Azure OpenAI.

### Option A: OpenAI Direct

Use this if you have a normal OpenAI API key.

Save:

```text
AI_PROVIDER=openai
OPENAI_API_KEY=<openai api key>
OPENAI_MODEL=gpt-4o-mini
```

### Option B: Azure OpenAI

In Azure Portal:

1. Search for `Azure OpenAI`.
2. Select `Create`.
3. Choose the same subscription and resource group.
4. Name it, for example `aoai-language-tutor-dev`.
5. Choose an approved region for your subscription.
6. Select pricing tier.
7. Create the resource.

After it is created:

1. Open the Azure OpenAI resource.
2. Go to `Resource Management` > `Keys and Endpoint`.
3. Copy the endpoint.
4. Copy one API key.
5. Open [Azure AI Foundry](https://ai.azure.com).
6. Create or open a project connected to the Azure OpenAI resource.
7. Go to `Deployments` or `Models + endpoints`.
8. Deploy a chat model that supports JSON mode, for example `gpt-4o-mini`.
9. Copy the deployment name exactly.

Save:

```text
AI_PROVIDER=azure-openai
AZURE_OPENAI_ENDPOINT=https://YOUR_RESOURCE.openai.azure.com
AZURE_OPENAI_API_KEY=<azure openai key>
AZURE_OPENAI_API_VERSION=2024-08-01-preview
AZURE_OPENAI_DEPLOYMENT_CHAT=<deployment name>
```

Important: `AZURE_OPENAI_DEPLOYMENT_CHAT` is the deployment name, not just the model name.

## 9. Create Azure AI Content Safety

Recommended for real AI environments.

In Azure Portal:

1. Search for `Content Safety`.
2. Select `Create`.
3. Choose the same subscription and resource group.
4. Name it, for example `cs-language-tutor-dev`.
5. Choose an approved region.
6. Select pricing tier.
7. Select `Review + create`, then `Create`.

After it is created:

1. Open the Content Safety resource.
2. Go to `Resource Management` > `Keys and Endpoint`.
3. Copy endpoint and key.

Save:

```text
AZURE_CONTENT_SAFETY_ENDPOINT=https://YOUR_CONTENT_SAFETY_RESOURCE.cognitiveservices.azure.com
AZURE_CONTENT_SAFETY_KEY=<content safety key>
AZURE_CONTENT_SAFETY_API_VERSION=2023-10-01
```

## 10. Create Azure Speech

Speech is used for pronunciation, speech-to-text, and Speak Live flows.

In Azure Portal:

1. Search for `Speech services`.
2. Select `Create`.
3. Choose the same subscription and resource group.
4. Name it, for example `speech-language-tutor-dev`.
5. Region: choose the same region you will set in `AZURE_SPEECH_REGION`, for example `westeurope`.
6. Select pricing tier.
7. Select `Review + create`, then `Create`.

After it is created:

1. Open the Speech resource.
2. Go to `Resource Management` > `Keys and Endpoint`.
3. Copy `KEY 1`.
4. Copy the location/region value.

Save:

```text
PRONUNCIATION_MODE=azure
SPEECH_TO_TEXT_PROVIDER=azure
AZURE_SPEECH_KEY=<speech key>
AZURE_SPEECH_REGION=westeurope
AZURE_SPEECH_LOCALE=nl-NL
```

## 11. Create Azure AI Vision

Vision is used for read-aloud OCR/image flows.

In Azure Portal:

1. Search for `Computer Vision` or `Azure AI services`.
2. Create a Computer Vision / Azure AI Vision resource.
3. Choose the same subscription and resource group.
4. Name it, for example `vision-language-tutor-dev`.
5. Choose an approved region and pricing tier.
6. Select `Review + create`, then `Create`.

After it is created:

1. Open the Vision resource.
2. Go to `Resource Management` > `Keys and Endpoint`.
3. Copy endpoint and key.

Save:

```text
AZURE_VISION_ENDPOINT=https://YOUR_VISION_RESOURCE.cognitiveservices.azure.com
AZURE_VISION_KEY=<vision key>
```

## 12. Configure Function App Environment Variables

After all resources exist, configure the Function App.

In Azure Portal:

1. Open your Function App, for example `func-language-tutor-dev`.
2. Go to `Settings` > `Environment variables`.
3. Open the `App settings` tab.
4. Add the values below.
5. Select `Apply` or `Save`.
6. Let the Function App restart when prompted.

Minimum settings:

```text
APP_PROFILE=CloudDev
FUNCTIONS_WORKER_RUNTIME=node
SQL_CONNECTION_STRING=Server=tcp:YOUR_SQL_SERVER.database.windows.net,1433;Database=LanguageTutor;User ID=...;Password=...;Encrypt=True;TrustServerCertificate=False;
AZURE_STORAGE_CONNECTION_STRING=<storage account connection string>
AZURE_STORAGE_CONTAINER_ARTIFACTS=fc-artifacts
SERVICE_BUS_CONNECTION_STRING=<service bus connection string>
SERVICE_BUS_TOPIC_EVENTS=fc-app-events
APPLICATIONINSIGHTS_CONNECTION_STRING=<app insights connection string>
CORS_ALLOWED_ORIGINS=https://YOUR_FRONTEND_DOMAIN
```

Add one AI provider block.

OpenAI direct:

```text
AI_PROVIDER=openai
OPENAI_API_KEY=<openai api key>
OPENAI_MODEL=gpt-4o-mini
```

Azure OpenAI:

```text
AI_PROVIDER=azure-openai
AZURE_OPENAI_ENDPOINT=https://YOUR_RESOURCE.openai.azure.com
AZURE_OPENAI_API_KEY=<azure openai key>
AZURE_OPENAI_API_VERSION=2024-08-01-preview
AZURE_OPENAI_DEPLOYMENT_CHAT=<deployment name>
```

Add speech, vision, and moderation settings:

```text
PRONUNCIATION_MODE=azure
SPEECH_TO_TEXT_PROVIDER=azure
AZURE_SPEECH_KEY=<speech key>
AZURE_SPEECH_REGION=westeurope
AZURE_SPEECH_LOCALE=nl-NL
AZURE_VISION_ENDPOINT=https://YOUR_VISION_RESOURCE.cognitiveservices.azure.com
AZURE_VISION_KEY=<vision key>
AZURE_CONTENT_SAFETY_ENDPOINT=https://YOUR_CONTENT_SAFETY_RESOURCE.cognitiveservices.azure.com
AZURE_CONTENT_SAFETY_KEY=<content safety key>
AZURE_CONTENT_SAFETY_API_VERSION=2023-10-01
```

For production, store secrets in Azure Key Vault and use Key Vault references instead of raw secret values.

## 13. Configure Function App CORS

The browser frontend must be allowed to call the Function App.

In Azure Portal:

1. Open the Function App.
2. Go to `API` > `CORS`.
3. Add the frontend origin, for example:

```text
https://YOUR_VERCEL_DOMAIN.vercel.app
```

4. Add any Vercel preview domains you intentionally use.
5. Do not use `*` for production.
6. Save.

Keep this aligned with:

```text
CORS_ALLOWED_ORIGINS=https://YOUR_FRONTEND_DOMAIN
```

## 14. Apply Database Schema And Seeds

After Azure SQL is ready and your IP is allowed, run the SQL scripts from the repository root.

Required baseline:

```text
backend/database/schema/001_initial_schema.sql
```

Required seeds:

```text
backend/database/seed/001_seed_reference_data.sql
backend/database/seed/002_seed_mock_scenarios.sql
backend/database/seed/003_seed_personas.sql
```

Optional sample seed:

```text
backend/database/seed/004_seed_sample_thread_optional.sql
```

Example with `sqlcmd`:

```bash
export SQL_SERVER_FQDN="YOUR_SQL_SERVER.database.windows.net"
export AZ_SQL_DB="LanguageTutor"
export AZ_SQL_ADMIN="sqladminuser"
read -s AZ_SQL_PASSWORD

sqlcmd -S "$SQL_SERVER_FQDN,1433" \
  -d "$AZ_SQL_DB" \
  -U "$AZ_SQL_ADMIN" \
  -P "$AZ_SQL_PASSWORD" \
  -N -C \
  -i backend/database/schema/001_initial_schema.sql

sqlcmd -S "$SQL_SERVER_FQDN,1433" -d "$AZ_SQL_DB" -U "$AZ_SQL_ADMIN" -P "$AZ_SQL_PASSWORD" -N -C -i backend/database/seed/001_seed_reference_data.sql
sqlcmd -S "$SQL_SERVER_FQDN,1433" -d "$AZ_SQL_DB" -U "$AZ_SQL_ADMIN" -P "$AZ_SQL_PASSWORD" -N -C -i backend/database/seed/002_seed_mock_scenarios.sql
sqlcmd -S "$SQL_SERVER_FQDN,1433" -d "$AZ_SQL_DB" -U "$AZ_SQL_ADMIN" -P "$AZ_SQL_PASSWORD" -N -C -i backend/database/seed/003_seed_personas.sql
```

Apply migrations in numeric order:

```bash
for file in backend/database/migrations/[0-9][0-9][0-9]_*.sql; do
  case "$file" in
    *_rollback.sql) continue ;;
  esac

  echo "Applying $file"
  sqlcmd -S "$SQL_SERVER_FQDN,1433" \
    -d "$AZ_SQL_DB" \
    -U "$AZ_SQL_ADMIN" \
    -P "$AZ_SQL_PASSWORD" \
    -N -C \
    -i "$file"
done
```

Do not run rollback scripts unless you are intentionally rolling back.

## 15. Deploy The Backend

From the repository root:

```bash
npm run backend:build
```

Then publish from `backend/`:

```bash
cd backend
npm install
npm run build
func azure functionapp publish "func-language-tutor-dev"
cd ..
```

Replace `func-language-tutor-dev` with your Function App name.

## 16. Configure The Frontend

Wherever the frontend is hosted, set:

```text
NEXT_PUBLIC_API_BASE_URL=https://YOUR_FUNCTION_APP.azurewebsites.net
NEXT_PUBLIC_FEATURE1_CHAT_SOURCE=backend
```

If using Vercel:

1. Open Vercel project settings.
2. Go to `Environment Variables`.
3. Add the variables above for Preview and Production as needed.
4. Redeploy after changing them.

## 17. Verify The Setup

Check backend health:

```bash
export API_BASE_URL="https://YOUR_FUNCTION_APP.azurewebsites.net"

curl -i "$API_BASE_URL/api/health"
```

Expected: HTTP 200 with a JSON health payload. If SQL is missing or blocked, the health response may show degraded dependencies.

Smoke test conversation start:

```bash
curl -sS -X POST "$API_BASE_URL/api/conversations/start" \
  -H "Content-Type: application/json" \
  -H "x-user-id: local-demo-user" \
  -d '{"scenarioId":"train-station","mode":"guided","feedbackMode":"turn"}'
```

Check logs:

```bash
az functionapp log tail \
  --resource-group "rg-language-tutor-dev" \
  --name "func-language-tutor-dev"
```

## 18. Final Checklist

Before using the environment:

1. Function App exists and runs Node 20.
2. Function App app settings are complete.
3. Storage account connection string is set.
4. Blob container `fc-artifacts` exists.
5. Azure SQL schema and seeds are applied.
6. Service Bus topic `fc-app-events` exists.
7. AI provider is configured (`openai` or `azure-openai`).
8. Speech key and region are configured.
9. Vision endpoint/key are configured if OCR/read-aloud is needed.
10. Content Safety is configured for real AI environments.
11. Application Insights connection string is set.
12. Function App CORS allows the frontend domain.
13. Frontend points `NEXT_PUBLIC_API_BASE_URL` to the Function App URL.
14. `/api/health` works.
15. Starting a conversation works.

## Related Docs

- `DEPLOYMENT.md`
- `docs/backend/backend-setup-azure-local-and-cloud.md`
- `docs/backend/database-migrations-and-seeding.md`
- `docs/backend/azure-openai-and-foundry-setup.md`
- `docs/backend/openai-now-azure-later-strategy.md`
