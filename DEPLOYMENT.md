# Deployment Guide

This document is the end-to-end deployment runbook for the Language Tutor / FluentCopilot application.

The app has two deployable parts:

| Part | Location | Runtime | Recommended host |
| --- | --- | --- | --- |
| Web app | repository root | Next.js 15 / React 18 | Vercel |
| API backend | `backend/` | Azure Functions v4, Node 20 | Azure Functions |

The backend depends on Azure SQL, Azure Storage Blob, optional Azure Service Bus, OpenAI or Azure OpenAI, Azure Speech, optional Azure AI Content Safety, and optional Application Insights.

Do not commit secrets. Keep `.env.local` and `backend/local.settings.json` local only. This repo already ignores those files.

---

## 1. Prerequisites

Install the following locally:

```bash
# Node.js 20+ and npm 10+
node --version
npm --version

# Azure CLI
az --version
az login

# Azure Functions Core Tools v4
func --version

# Optional but recommended
gh --version
vercel --version
sqlcmd '-?'
```

Recommended installs on macOS:

```bash
brew install node
brew install azure-cli
brew tap azure/functions
brew install azure-functions-core-tools@4
brew install gh
npm install -g vercel
```

If `sqlcmd` is not installed, use Azure Data Studio, SQL Server Management Studio, or install Microsoft `mssql-tools18`.

---

## 2. Local Verification Before Deployment

From the repository root:

```bash
npm install
npm run build
npm run test
```

Build the backend:

```bash
cd backend
npm install
npm run build
cd ..
```

Run locally with the backend:

```bash
# terminal 1
cd backend
npm start

# terminal 2
npm run dev
```

Frontend local env:

```bash
cp .env.local.example .env.local
```

Minimum `.env.local` values:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:7071
NEXT_PUBLIC_FEATURE1_CHAT_SOURCE=backend
```

Backend local env:

```bash
cd backend
cp local.settings.example.json local.settings.json
```

Populate `backend/local.settings.json` with local or dev credentials. Never commit it.

---

## 3. GitHub Setup And Code Check-In

If this folder is not already a Git repository, initialize it:

```bash
git init
git branch -M main
git status
```

Confirm ignored secret/build files are not staged:

```bash
git status --ignored
```

Files that must not be committed:

```text
.env.local
.env*.local
backend/local.settings.json
backend/dist/
backend/azurite-data/
node_modules/
.next/
```

Create the GitHub repository:

```bash
gh auth login
gh repo create language-tutor --private --source=. --remote=origin
```

Commit the application:

```bash
git add .
git status
git commit -m "Initial application deployment baseline"
git push -u origin main
```

Before every deployment:

```bash
git status
npm run build
npm run test
npm run backend:build
git add .
git commit -m "Describe the deployable change"
git push
```

---

## 4. Deployment Environments

Use at least two environments:

| Environment | Web | API | Database | Purpose |
| --- | --- | --- | --- | --- |
| Preview / Dev | Vercel Preview | Azure Function dev app | Azure SQL dev DB | PR validation and demos |
| Production | Vercel Production | Azure Function prod app | Azure SQL prod DB | Real users |

Suggested naming:

```text
Resource group: rg-language-tutor-dev
Location: westeurope
Function App: func-language-tutor-dev
Storage account: rglanguagetutordev933b
SQL server: sql-language-tutor-dev
SQL database: LanguageTutor
Service Bus namespace: sb-language-tutor-dev
Application Insights: func-language-tutor-dev
```

Storage account names must be globally unique, lowercase, and 3-24 characters.

---

## 5. Azure Resource Setup

You can create the Azure resources either through Azure Portal or the Azure CLI. The portal steps below are written for a dev environment, but use the same pattern for production with production names, stricter networking, and Key Vault-backed secrets.

Portal starting point:

1. Open [Azure Portal](https://portal.azure.com).
2. Confirm the correct tenant and subscription in the top-right account menu.
3. Search for "Resource groups".
4. Select "Create".
5. Set "Subscription" to the target subscription.
6. Set "Resource group" to `rg-language-tutor-dev`.
7. Set "Region" to `West Europe` or your preferred region.
8. Select "Review + create".
9. Select "Create".

Set common shell variables:

```bash
export AZ_SUBSCRIPTION_ID="YOUR_SUBSCRIPTION_ID"
export AZ_LOCATION="westeurope"
export AZ_RESOURCE_GROUP="rg-language-tutor-dev"
export AZ_STORAGE_ACCOUNT="rglanguagetutordev933b"
export AZ_FUNCTION_APP="func-language-tutor-dev"
export AZ_SQL_SERVER="sql-language-tutor-dev"
export AZ_SQL_DB="LanguageTutor"
export AZ_SQL_ADMIN="sqladmin"
export AZ_SERVICEBUS_NAMESPACE="sb-language-tutor-dev"
export AZ_APP_INSIGHTS="func-language-tutor-dev"

az account set --subscription "$AZ_SUBSCRIPTION_ID"
az group create --name "$AZ_RESOURCE_GROUP" --location "$AZ_LOCATION"
```

### 5.1 Storage Account

Azure Functions needs a storage account. The app also uses Blob Storage for artifacts.

Portal steps:

1. In Azure Portal, search for "Storage accounts".
2. Select "Create".
3. On "Basics", choose the target subscription and resource group, for example `rg-language-tutor-dev`.
4. Enter a globally unique storage account name, for example `rglanguagetutordev933b`.
5. Select the same region as the Function App.
6. Set "Performance" to `Standard`.
7. Set "Redundancy" to `Locally-redundant storage (LRS)` for dev. For production, choose the redundancy level required by your availability policy.
8. On "Advanced", keep "Require secure transfer for REST API operations" enabled.
9. Set "Allow enabling anonymous access on individual containers" to disabled.
10. Select "Review + create", then "Create".
11. After deployment, open the storage account.
12. Go to "Data storage" > "Containers".
13. Select "+ Container".
14. Set "Name" to `fc-artifacts`.
15. Set "Anonymous access level" to `Private`.
16. Select "Create".
17. Go to "Security + networking" > "Access keys".
18. Copy the "Connection string" for `key1`; this becomes `AZURE_STORAGE_CONNECTION_STRING`.

```bash
az storage account create \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --name "$AZ_STORAGE_ACCOUNT" \
  --location "$AZ_LOCATION" \
  --sku Standard_LRS \
  --kind StorageV2 \
  --min-tls-version TLS1_2 \
  --allow-blob-public-access false
```

Create the artifacts container:

```bash
export AZ_STORAGE_CONNECTION_STRING="$(az storage account show-connection-string \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --name "$AZ_STORAGE_ACCOUNT" \
  --query connectionString \
  --output tsv)"

az storage container create \
  --name fc-artifacts \
  --connection-string "$AZ_STORAGE_CONNECTION_STRING"
```

### 5.2 Application Insights

Portal steps:

1. In Azure Portal, search for "Application Insights".
2. Select "Create".
3. Choose the subscription and resource group, for example `rg-language-tutor-dev`.
4. Enter a name, for example `ai-language-tutor-dev`.
5. Select the same region as the Function App.
6. Set "Resource mode" to `Workspace-based`.
7. Create or select a Log Analytics workspace.
8. Select "Review + create", then "Create".
9. After deployment, open the Application Insights resource.
10. Go to "Configure" > "Properties".
11. Copy "Connection String"; this becomes `APPLICATIONINSIGHTS_CONNECTION_STRING`.

```bash
az monitor app-insights component create \
  --app "$AZ_APP_INSIGHTS" \
  --location "$AZ_LOCATION" \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --application-type web

export APPINSIGHTS_CONNECTION_STRING="$(az monitor app-insights component show \
  --app "$AZ_APP_INSIGHTS" \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --query connectionString \
  --output tsv)"
```

### 5.3 Azure Functions App

Create a Node 20 Function App:

Portal steps:

1. In Azure Portal, search for "Function App".
2. Select "Create".
3. Choose "Consumption" unless you need Premium/Flex for latency or longer-running workloads.
4. On "Basics", choose the subscription and resource group, for example `rg-language-tutor-dev`.
5. Enter the Function App name, for example `func-language-tutor-dev`. This becomes part of the public URL: `https://func-language-tutor-dev.azurewebsites.net`.
6. Set "Runtime stack" to `Node.js`.
7. Set "Version" to `20 LTS`.
8. Set "Region" to the same region as the storage account.
9. Set "Operating System" to `Linux` unless your organization requires Windows.
10. On "Storage", choose the storage account created above.
11. On "Monitoring", enable Application Insights and select `ai-language-tutor-dev`.
12. Select "Review + create", then "Create".
13. After deployment, open the Function App.
14. Go to "Overview" and confirm the default domain.
15. Go to "Settings" > "Configuration" and confirm `FUNCTIONS_WORKER_RUNTIME=node` is present.

```bash
az functionapp create \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --consumption-plan-location "$AZ_LOCATION" \
  --runtime node \
  --runtime-version 20 \
  --functions-version 4 \
  --name "$AZ_FUNCTION_APP" \
  --storage-account "$AZ_STORAGE_ACCOUNT"
```

If you expect long-running evaluation workloads or more predictable latency, use Premium/Flex Consumption instead of classic Consumption.

### 5.4 Azure SQL Database

Create the SQL server. Use a strong password and store it in a password manager:

Portal steps:

1. In Azure Portal, search for "SQL databases".
2. Select "Create".
3. Choose the target subscription and resource group.
4. Set "Database name" to `LanguageTutor`.
5. Under "Server", select "Create new".
6. Set "Server name" to a globally unique value, for example `sql-language-tutor-dev`.
7. Set "Location" to the same Azure region.
8. Set "Authentication method" to `Use SQL authentication` for the simplest dev setup.
9. Enter an admin login, for example `sqladmin`.
10. Enter and store a strong password.
11. Select "OK" to create the server definition.
12. Under "Compute + storage", select "Configure database".
13. For dev, choose a low-cost option such as `Basic` or an appropriate serverless tier.
14. Select "Apply".
15. On "Networking", set "Connectivity method" according to your environment:
    - For dev, public endpoint with a narrow firewall rule is simplest.
    - For production, prefer private endpoint or tightly controlled networking.
16. If using public endpoint for dev, set "Allow Azure services and resources to access this server" according to your security policy. The Function App may need access unless you configure private networking.
17. Select "Review + create", then "Create".
18. After deployment, open the SQL server resource.
19. Go to "Security" > "Networking".
20. Add a firewall rule for your current client IP so you can run migrations.
21. Save the networking changes.
22. Open the SQL database resource.
23. Go to "Settings" > "Connection strings".
24. Copy the ADO.NET connection string and replace placeholders with your admin username and password; this becomes `SQL_CONNECTION_STRING`.

```bash
read -s AZ_SQL_PASSWORD

az sql server create \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --name "$AZ_SQL_SERVER" \
  --location "$AZ_LOCATION" \
  --admin-user "$AZ_SQL_ADMIN" \
  --admin-password "$AZ_SQL_PASSWORD"
```

Create the database:

```bash
az sql db create \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --server "$AZ_SQL_SERVER" \
  --name "$AZ_SQL_DB" \
  --service-objective Basic
```

Allow your current public IP while you apply migrations:

```bash
export MY_IP="$(curl -s https://api.ipify.org)"

az sql server firewall-rule create \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --server "$AZ_SQL_SERVER" \
  --name AllowLocalDeployIp \
  --start-ip-address "$MY_IP" \
  --end-ip-address "$MY_IP"
```

For production, prefer private networking or a tightly scoped firewall rule instead of broad public access.

Build the app connection string:

```bash
export SQL_CONNECTION_STRING="Server=tcp:${AZ_SQL_SERVER}.database.windows.net,1433;Database=${AZ_SQL_DB};User ID=${AZ_SQL_ADMIN};Password=${AZ_SQL_PASSWORD};Encrypt=True;TrustServerCertificate=False;"
```

### 5.5 Azure Service Bus

Service Bus is used for app events. Some code paths no-op if a placeholder/missing connection string is used, but provision it for deployed environments.

Portal steps:

1. In Azure Portal, search for "Service Bus".
2. Select "Create".
3. Choose the subscription and resource group.
4. Enter a globally unique namespace name, for example `sb-language-tutor-dev`.
5. Select the same region as the Function App.
6. Set "Pricing tier" to `Standard`; topics require Standard or Premium.
7. Select "Review + create", then "Create".
8. After deployment, open the Service Bus namespace.
9. Go to "Entities" > "Topics".
10. Select "+ Topic".
11. Set "Name" to `fc-app-events`.
12. Keep default settings for dev, then select "Create".
13. Go to "Settings" > "Shared access policies".
14. Open `RootManageSharedAccessKey`, or create a narrower policy with Send permissions for production.
15. Copy "Primary Connection String"; this becomes `SERVICE_BUS_CONNECTION_STRING`.

```bash
az servicebus namespace create \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --name "$AZ_SERVICEBUS_NAMESPACE" \
  --location "$AZ_LOCATION" \
  --sku Standard

az servicebus topic create \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --namespace-name "$AZ_SERVICEBUS_NAMESPACE" \
  --name fc-app-events

export SERVICE_BUS_CONNECTION_STRING="$(az servicebus namespace authorization-rule keys list \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --namespace-name "$AZ_SERVICEBUS_NAMESPACE" \
  --name RootManageSharedAccessKey \
  --query primaryConnectionString \
  --output tsv)"
```

### 5.6 Azure OpenAI Or OpenAI

The backend supports `AI_PROVIDER=openai`, `AI_PROVIDER=azure-openai`, or `AI_PROVIDER=mock`.

For production, use one of:

```text
AI_PROVIDER=openai
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o-mini
```

or:

```text
AI_PROVIDER=azure-openai
AZURE_OPENAI_ENDPOINT=https://YOUR_RESOURCE.openai.azure.com
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_API_VERSION=2024-08-01-preview
AZURE_OPENAI_DEPLOYMENT_CHAT=gpt-4o-mini
```

For Azure OpenAI:

1. Create an Azure OpenAI resource in Azure Portal or Azure AI Foundry.
2. Deploy a chat model that supports JSON mode, such as `gpt-4o-mini`.
3. Copy the resource endpoint, key, API version, and deployment name.
4. Use the deployment name, not only the model name, for `AZURE_OPENAI_DEPLOYMENT_CHAT`.

Azure Portal / Azure AI Foundry steps:

1. In Azure Portal, search for "Azure OpenAI".
2. Select "Create".
3. Choose the subscription and resource group.
4. Enter a resource name, for example `aoai-language-tutor-dev`.
5. Select a supported region for your subscription.
6. Select the pricing tier available to your subscription.
7. Select "Review + create", then "Create".
8. After deployment, open the Azure OpenAI resource.
9. Go to "Resource Management" > "Keys and Endpoint".
10. Copy "Endpoint"; this becomes `AZURE_OPENAI_ENDPOINT`.
11. Copy `KEY 1`; this becomes `AZURE_OPENAI_API_KEY`.
12. Open [Azure AI Foundry](https://ai.azure.com).
13. Select or create a project connected to the Azure OpenAI resource.
14. Go to "Deployments" or "Models + endpoints".
15. Select "Deploy model".
16. Choose a chat model that supports JSON mode, for example `gpt-4o-mini`.
17. Set a deployment name, for example `gpt-4o-mini`.
18. Copy the deployment name exactly; this becomes `AZURE_OPENAI_DEPLOYMENT_CHAT`.
19. Use `2024-08-01-preview` for `AZURE_OPENAI_API_VERSION` unless you intentionally validate a newer compatible version.

### 5.7 Azure AI Content Safety

Recommended for real LLM environments:

```text
AZURE_CONTENT_SAFETY_ENDPOINT=https://YOUR_CONTENT_SAFETY_RESOURCE.cognitiveservices.azure.com
AZURE_CONTENT_SAFETY_KEY=...
AZURE_CONTENT_SAFETY_API_VERSION=2023-10-01
```

Create the resource in Azure Portal, then copy the endpoint and key from "Keys and Endpoint".

Portal steps:

1. In Azure Portal, search for "Content Safety".
2. Select "Create".
3. Choose the subscription and resource group.
4. Enter a resource name, for example `cs-language-tutor-dev`.
5. Select the same region if available, or another approved region.
6. Select the pricing tier appropriate for dev or production.
7. Select "Review + create", then "Create".
8. After deployment, open the Content Safety resource.
9. Go to "Resource Management" > "Keys and Endpoint".
10. Copy "Endpoint"; this becomes `AZURE_CONTENT_SAFETY_ENDPOINT`.
11. Copy `KEY 1`; this becomes `AZURE_CONTENT_SAFETY_KEY`.
12. Set `AZURE_CONTENT_SAFETY_API_VERSION=2023-10-01`.

### 5.8 Azure Speech And Vision

The app uses Azure Speech for pronunciation/speech flows and Azure Vision for read-aloud OCR flows.

Set:

```text
PRONUNCIATION_MODE=azure
SPEECH_TO_TEXT_PROVIDER=azure
AZURE_SPEECH_KEY=...
AZURE_SPEECH_REGION=westeurope
AZURE_SPEECH_LOCALE=nl-NL
AZURE_VISION_ENDPOINT=https://YOUR_VISION_RESOURCE.cognitiveservices.azure.com
AZURE_VISION_KEY=...
```

Use the Azure Portal to create Speech and Computer Vision / AI Vision resources, then copy keys from each resource's "Keys and Endpoint" page.

Azure Speech portal steps:

1. In Azure Portal, search for "Speech services".
2. Select "Create".
3. Choose the subscription and resource group.
4. Enter a resource name, for example `speech-language-tutor-dev`.
5. Select the same region you plan to set in `AZURE_SPEECH_REGION`, for example `westeurope`.
6. Select a pricing tier.
7. Select "Review + create", then "Create".
8. After deployment, open the Speech resource.
9. Go to "Resource Management" > "Keys and Endpoint".
10. Copy `KEY 1`; this becomes `AZURE_SPEECH_KEY`.
11. Copy the "Location/Region" value; this becomes `AZURE_SPEECH_REGION`.
12. Set `AZURE_SPEECH_LOCALE=nl-NL`.

Azure AI Vision portal steps:

1. In Azure Portal, search for "Computer vision" or "Azure AI services".
2. Create a Computer Vision / Azure AI Vision resource.
3. Choose the subscription and resource group.
4. Enter a resource name, for example `vision-language-tutor-dev`.
5. Select an approved region and pricing tier.
6. Select "Review + create", then "Create".
7. After deployment, open the Vision resource.
8. Go to "Resource Management" > "Keys and Endpoint".
9. Copy "Endpoint"; this becomes `AZURE_VISION_ENDPOINT`.
10. Copy `KEY 1`; this becomes `AZURE_VISION_KEY`.

---

## 6. Database Setup And Migration Scripts

This repo uses version-controlled SQL scripts under `backend/database/`.

Clean Azure SQL bootstrap:

```text
backend/database/azure_clean_create_and_seed.sql
```

Seeds:

```text
backend/database/seed/001_seed_reference_data.sql
backend/database/seed/002_seed_mock_scenarios.sql
backend/database/seed/003_seed_personas.sql
backend/database/seed/004_seed_sample_thread_optional.sql
```

Migrations:

```text
backend/database/migrations/*.sql
```

Apply schema, seeds, and all forward migrations to a clean Azure SQL database:

```bash
export SQL_SERVER_FQDN="${AZ_SQL_SERVER}.database.windows.net"

sqlcmd -S "$SQL_SERVER_FQDN,1433" \
  -d "$AZ_SQL_DB" \
  -U "$AZ_SQL_ADMIN" \
  -P "$AZ_SQL_PASSWORD" \
  -N -C \
  -i backend/database/azure_clean_create_and_seed.sql
```

Important migration rules:

1. Run rollback scripts only when intentionally rolling back.
2. Use `backend/database/azure_clean_create_and_seed.sql` for clean environments; for existing environments, apply only new forward migrations in numeric order.
3. Back up production before schema changes.
4. Track applied migrations in release notes until the project has a formal migration history table.

Verification queries:

```sql
SELECT Slug, Title FROM dbo.ScenarioDefinitions;
SELECT Slug, DisplayName FROM dbo.PersonaDefinitions;
SELECT TOP 5 Id, Status, Mode, FeedbackMode
FROM dbo.ConversationThreads
ORDER BY UpdatedAt DESC;
```

---

## 7. Configure Azure Function App Settings

Set backend application settings after the Function App and dependent Azure resources exist.

Portal steps:

1. In Azure Portal, open the Function App, for example `func-language-tutor-dev`.
2. Go to "Settings" > "Environment variables". In some portal views this appears as "Configuration".
3. Open the "App settings" tab.
4. Select "+ Add" for each setting below.
5. Enter the setting name exactly as shown.
6. Enter the value copied from the resource setup steps.
7. Select "Apply" or "Save".
8. When prompted, allow the Function App to restart.

Minimum backend app settings:

```text
APP_PROFILE=CloudDev
FUNCTIONS_WORKER_RUNTIME=node
SQL_CONNECTION_STRING=Server=tcp:sql-language-tutor-dev.database.windows.net,1433;Database=LanguageTutor;User ID=sqladmin;Password=...;Encrypt=True;TrustServerCertificate=False;
AI_PROVIDER=openai
OPENAI_API_KEY=YOUR_OPENAI_KEY
OPENAI_MODEL=gpt-4o-mini
AZURE_STORAGE_CONNECTION_STRING=YOUR_RGLANGUAGETUTORDEV933B_CONNECTION_STRING
AZURE_STORAGE_CONTAINER_ARTIFACTS=fc-artifacts
SERVICE_BUS_CONNECTION_STRING=Endpoint=sb://sb-language-tutor-dev.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=...
SERVICE_BUS_TOPIC_EVENTS=fc-app-events
APPLICATIONINSIGHTS_CONNECTION_STRING=YOUR_APPLICATION_INSIGHTS_CONNECTION_STRING
CORS_ALLOWED_ORIGINS=https://YOUR_VERCEL_DOMAIN.vercel.app
```

If using Azure OpenAI instead of OpenAI direct, set:

```text
AI_PROVIDER=azure-openai
AZURE_OPENAI_ENDPOINT=https://YOUR_RESOURCE.openai.azure.com
AZURE_OPENAI_API_KEY=YOUR_AZURE_OPENAI_KEY
AZURE_OPENAI_API_VERSION=2024-08-01-preview
AZURE_OPENAI_DEPLOYMENT_CHAT=YOUR_DEPLOYMENT_NAME
```

Speech, vision, and moderation settings:

```text
PRONUNCIATION_MODE=azure
SPEECH_TO_TEXT_PROVIDER=azure
AZURE_SPEECH_KEY=YOUR_SPEECH_KEY
AZURE_SPEECH_REGION=westeurope
AZURE_SPEECH_LOCALE=nl-NL
AZURE_VISION_ENDPOINT=https://YOUR_VISION_RESOURCE.cognitiveservices.azure.com
AZURE_VISION_KEY=YOUR_VISION_KEY
AZURE_CONTENT_SAFETY_ENDPOINT=https://YOUR_CONTENT_SAFETY_RESOURCE.cognitiveservices.azure.com
AZURE_CONTENT_SAFETY_KEY=YOUR_CONTENT_SAFETY_KEY
AZURE_CONTENT_SAFETY_API_VERSION=2023-10-01
```

Portal CORS steps:

1. In the Function App, go to "API" > "CORS".
2. Add the Vercel production origin, for example `https://YOUR_VERCEL_DOMAIN.vercel.app`.
3. Add any Vercel preview domains you intentionally use.
4. Do not use `*` for production.
5. Select "Save".
6. Keep `CORS_ALLOWED_ORIGINS` in app settings aligned with the portal CORS list.

CLI equivalent:

```bash
az functionapp config appsettings set \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --name "$AZ_FUNCTION_APP" \
  --settings \
    APP_PROFILE="CloudDev" \
    FUNCTIONS_WORKER_RUNTIME="node" \
    SQL_CONNECTION_STRING="$SQL_CONNECTION_STRING" \
    AI_PROVIDER="openai" \
    OPENAI_API_KEY="YOUR_OPENAI_KEY" \
    OPENAI_MODEL="gpt-4o-mini" \
    AZURE_STORAGE_CONNECTION_STRING="$AZ_STORAGE_CONNECTION_STRING" \
    AZURE_STORAGE_CONTAINER_ARTIFACTS="fc-artifacts" \
    SERVICE_BUS_CONNECTION_STRING="$SERVICE_BUS_CONNECTION_STRING" \
    SERVICE_BUS_TOPIC_EVENTS="fc-app-events" \
    APPLICATIONINSIGHTS_CONNECTION_STRING="$APPINSIGHTS_CONNECTION_STRING" \
    CORS_ALLOWED_ORIGINS="https://YOUR_VERCEL_DOMAIN.vercel.app"
```

If using Azure OpenAI instead of OpenAI direct:

```bash
az functionapp config appsettings set \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --name "$AZ_FUNCTION_APP" \
  --settings \
    AI_PROVIDER="azure-openai" \
    AZURE_OPENAI_ENDPOINT="https://YOUR_RESOURCE.openai.azure.com" \
    AZURE_OPENAI_API_KEY="YOUR_AZURE_OPENAI_KEY" \
    AZURE_OPENAI_API_VERSION="2024-08-01-preview" \
    AZURE_OPENAI_DEPLOYMENT_CHAT="YOUR_DEPLOYMENT_NAME"
```

Set speech, vision, and moderation values:

```bash
az functionapp config appsettings set \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --name "$AZ_FUNCTION_APP" \
  --settings \
    PRONUNCIATION_MODE="azure" \
    SPEECH_TO_TEXT_PROVIDER="azure" \
    AZURE_SPEECH_KEY="YOUR_SPEECH_KEY" \
    AZURE_SPEECH_REGION="westeurope" \
    AZURE_SPEECH_LOCALE="nl-NL" \
    AZURE_VISION_ENDPOINT="https://YOUR_VISION_RESOURCE.cognitiveservices.azure.com" \
    AZURE_VISION_KEY="YOUR_VISION_KEY" \
    AZURE_CONTENT_SAFETY_ENDPOINT="https://YOUR_CONTENT_SAFETY_RESOURCE.cognitiveservices.azure.com" \
    AZURE_CONTENT_SAFETY_KEY="YOUR_CONTENT_SAFETY_KEY" \
    AZURE_CONTENT_SAFETY_API_VERSION="2023-10-01"
```

For production, store secrets in Azure Key Vault and use Key Vault references in Function App settings where possible.

Configure platform CORS as well:

```bash
az functionapp cors add \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --name "$AZ_FUNCTION_APP" \
  --allowed-origins "https://YOUR_VERCEL_DOMAIN.vercel.app"
```

---

## 8. Deploy The Azure Functions Backend

From the repository root:

```bash
npm run backend:build
```

Publish from `backend/`:

```bash
# recommended — from repo root
npm run backend:deploy

# or
./scripts/deploy-backend.sh
```

Manual equivalent:

```bash
cd backend
npm install
npm run build
npm prune --production
func azure functionapp publish func-language-tutor-dev
npm install   # restore devDependencies locally
```

Flex Consumption does not run Oryx `npm install` on deploy, so the package must include prebuilt `dist/` and production `node_modules`. Deploy from macOS bundles macOS-native optional binaries; if pronunciation assessment fails with ffmpeg errors after deploy, install the Linux ffmpeg package on the Function App (Kudu: `npm install @ffmpeg-installer/linux-x64@4.1.0 --no-save --force` in `/home/site/wwwroot`) or deploy from a Linux CI runner.

`backend/.funcignore` excludes source, local settings, database scripts, and local build artifacts that should not be published.

Verify the backend:

```bash
export API_BASE_URL="https://${AZ_FUNCTION_APP}.azurewebsites.net"

curl -i "$API_BASE_URL/api/health"
```

Expected result: HTTP 200 and a JSON health payload. If SQL is missing or inaccessible, health may report degraded/failing dependencies.

Exercise a conversation endpoint:

```bash
curl -sS -X POST "$API_BASE_URL/api/conversations/start" \
  -H "Content-Type: application/json" \
  -H "x-user-id: local-demo-user" \
  -d '{"scenarioId":"train-station","mode":"guided","feedbackMode":"turn"}'
```

Backend logs:

```bash
az functionapp log tail \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --name "$AZ_FUNCTION_APP"
```

---

## 9. Vercel Setup And Web Deployment

### 9.1 Connect GitHub To Vercel

1. Push the repo to GitHub.
2. Go to Vercel and select "Add New Project".
3. Import the GitHub repository.
4. Use these settings:

```text
Framework Preset: Next.js
Root Directory: .
Build Command: npm run build
Install Command: npm install
Output Directory: .next
Node.js Version: 20.x
```

### 9.2 Vercel Environment Variables

Set these in Vercel Project Settings > Environment Variables:

```text
NEXT_PUBLIC_API_BASE_URL=https://func-language-tutor-dev-cqd6fkgdb2hmcnah.westeurope-01.azurewebsites.net
NEXT_PUBLIC_FEATURE1_CHAT_SOURCE=backend
```

Optional frontend feature flags:

```text
NEXT_PUBLIC_DEV_TOOLS=false
NEXT_PUBLIC_CONVERSATION_STREAM=1
NEXT_PUBLIC_SPEAK_LIVE_BROWSER_AZURE_STT=0
NEXT_PUBLIC_AUDIO_PLAYBACK_MODE=auto
NEXT_PUBLIC_SPEECH_INPUT_MODE=server
NEXT_PUBLIC_SPEECH_AUDIO_ASSESSMENT=1
NEXT_PUBLIC_CURRICULUM_PATH_UI=true
NEXT_PUBLIC_CURRICULUM_PATH_MODULE_GATING=true
```

Do not put server-side API keys in Vercel unless a specific Next.js server route needs them. Most secrets belong in Azure Function App settings.

### 9.3 Deploy

Deploy via Git:

```bash
git push origin main
```

Or via CLI:

```bash
vercel link
vercel pull
vercel build
vercel deploy --prebuilt

# production
vercel deploy --prebuilt --prod
```

After Vercel gives you the production domain, update Azure Functions CORS:

```bash
export VERCEL_PROD_ORIGIN="https://YOUR_PRODUCTION_DOMAIN"

az functionapp config appsettings set \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --name "$AZ_FUNCTION_APP" \
  --settings CORS_ALLOWED_ORIGINS="$VERCEL_PROD_ORIGIN"

az functionapp cors add \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --name "$AZ_FUNCTION_APP" \
  --allowed-origins "$VERCEL_PROD_ORIGIN"
```

Redeploy/restart the Function App if needed:

```bash
az functionapp restart \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --name "$AZ_FUNCTION_APP"
```

---

## 10. Suggested GitHub Actions

Add CI before relying on GitHub as the deployment source.

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  build-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - run: npm run test
      - run: npm ci
        working-directory: backend
      - run: npm run build
        working-directory: backend
```

Optional backend deployment workflow:

```yaml
name: Deploy Backend

on:
  workflow_dispatch:
  push:
    branches: [main]
    paths:
      - "backend/**"

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: backend/package-lock.json
      - run: npm ci
        working-directory: backend
      - run: npm run build
        working-directory: backend
      - uses: Azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
      - uses: Azure/functions-action@v1
        with:
          app-name: YOUR_FUNCTION_APP_NAME
          package: backend
```

For GitHub Actions Azure login, create a federated identity credential for the repo in Microsoft Entra ID and store only non-secret IDs as GitHub secrets.

---

## 11. Release Checklist

Before release:

1. `git status` is clean.
2. `.env.local` and `backend/local.settings.json` are not staged.
3. `npm run build` passes.
4. `npm run test` passes.
5. `npm run backend:build` passes.
6. Azure SQL migrations have been applied to the target environment.
7. Azure Function App settings are present and correct.
8. Azure Function `/api/health` returns healthy or expected dependency status.
9. Vercel environment variables point to the correct Function App URL.
10. Azure CORS allows the Vercel production and preview origins.
11. A smoke test starts a conversation using the deployed web UI.
12. Application Insights receives backend logs.

Smoke test commands:

```bash
curl -i "https://YOUR_FUNCTION_APP.azurewebsites.net/api/health"

curl -sS -X POST "https://YOUR_FUNCTION_APP.azurewebsites.net/api/conversations/start" \
  -H "Content-Type: application/json" \
  -H "x-user-id: local-demo-user" \
  -d '{"scenarioId":"train-station","mode":"guided","feedbackMode":"turn"}'
```

---

## 12. Rollback Plan

Frontend rollback:

1. Open Vercel project > Deployments.
2. Select the previous healthy deployment.
3. Promote it to production.

Backend code rollback:

```bash
git checkout PREVIOUS_GOOD_COMMIT
cd backend
npm install
npm run build
func azure functionapp publish "$AZ_FUNCTION_APP"
cd ..
git checkout main
```

Database rollback:

1. Prefer restore from Azure SQL point-in-time backup for destructive changes.
2. Use `*_rollback.sql` scripts only when they match the migration that was just applied and the data-loss implications are understood.
3. Confirm app and database versions are compatible before sending traffic back.

---

## 13. Troubleshooting

| Symptom | Check |
| --- | --- |
| Vercel app says API config is missing | `NEXT_PUBLIC_API_BASE_URL` is not set in Vercel or was set after the build without redeploying. |
| Browser CORS error | Set `CORS_ALLOWED_ORIGINS` in Function App settings and add the Vercel origin under Function App CORS. |
| Function `/api/health` fails SQL | Check `SQL_CONNECTION_STRING`, SQL firewall/private endpoint, and migration status. |
| Chat uses mock behavior | Check `AI_PROVIDER`, `OPENAI_API_KEY`, Azure OpenAI settings, and `APP_PROFILE`. |
| Azure OpenAI returns 404 | Endpoint or deployment name is wrong. `AZURE_OPENAI_DEPLOYMENT_CHAT` must match the deployment name. |
| Azure OpenAI returns 401 | API key is from the wrong resource or has been rotated. |
| Speech features fail | Check `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`, `AZURE_SPEECH_LOCALE`, and `PRONUNCIATION_MODE=azure`. |
| Blob uploads fail | Check `AZURE_STORAGE_CONNECTION_STRING`, container `fc-artifacts`, and storage firewall settings. |
| Service Bus publish fails | Check namespace, topic `fc-app-events`, and `SERVICE_BUS_CONNECTION_STRING`. |

---

## 14. Reference Docs In This Repo

More detailed backend-specific notes:

```text
docs/backend/backend-setup-azure-local-and-cloud.md
docs/backend/database-migrations-and-seeding.md
docs/backend/azure-openai-and-foundry-setup.md
docs/backend/openai-now-azure-later-strategy.md
docs/frontend/feature-1-chat-backend-integration.md
```
