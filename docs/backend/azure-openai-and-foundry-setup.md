# Azure OpenAI & Azure AI Foundry — setup for FluentCopilot backend

Step-by-step guide to provision models and wire them to **`backend/local.settings.json`**. This matches what the code expects today: **Azure OpenAI chat completions** (JSON mode) and optional **Azure AI Content Safety** (text analyze).

**Related:** [backend-setup-azure-local-and-cloud.md](./backend-setup-azure-local-and-cloud.md) (Functions, SQL, Azurite, profiles).

---

## What this project uses

| Capability | Azure product | Env vars (see below) |
|------------|---------------|----------------------|
| Conversation turns + recap LLM | **Azure OpenAI** (chat completions) | `AZURE_OPENAI_*` |
| Moderation (user + assistant text) | **Azure AI Content Safety** | `AZURE_CONTENT_SAFETY_*` |

The HTTP client calls:

- OpenAI: `{ENDPOINT}/openai/deployments/{DEPLOYMENT}/chat/completions?api-version=...` with header **`api-key`**
- Content Safety: `{ENDPOINT}/contentsafety/text:analyze?api-version=...` with header **`Ocp-Apim-Subscription-Key`**

So you need the **classic Azure OpenAI resource endpoint + key** (not an unrelated “inference” URL unless it matches that path pattern). Keys come from the **Azure OpenAI** resource in Azure Portal.

**LLM provider:** Conversation turns use **`AI_PROVIDER`** (`openai` \| `azure-openai` \| `mock`) — see [ai-provider-architecture.md](./ai-provider-architecture.md). For Azure-hosted models, set **`AI_PROVIDER=azure-openai`** and the Azure variables below.

**Moderation:** With **`APP_PROFILE=LocalMock`**, Content Safety is a no-op. Set **`APP_PROFILE=LocalAzure`** (or `CloudDev`) for real Content Safety. This is separate from which LLM provider you use.

---

## Prerequisites

1. **Microsoft Azure subscription** with permission to create resources (e.g. *Contributor* on a resource group).
2. **Access to Azure OpenAI** in your subscription.  
   - If the OpenAI service is gated, complete Microsoft’s **access request** for Azure OpenAI in your region (see [Azure OpenAI documentation](https://learn.microsoft.com/azure/ai-services/openai/)).
3. **Azure CLI** optional but useful: `az login`.

---

## Part A — Azure OpenAI (required for real LLM)

You can create and deploy models in either **Azure AI Foundry** (portal *ai.azure.com*) or the **Azure Portal** (*portal.azure.com*). Both can result in an **Azure OpenAI** resource with keys and deployments.

### Option 1 — Azure AI Foundry (recommended UI for new projects)

These steps follow the current Foundry experience; menu names may shift slightly in the portal.

1. **Open Azure AI Foundry**  
   Go to [https://ai.azure.com](https://ai.azure.com) and sign in.

2. **Create or select a hub / project**  
   - If prompted, create an **AI hub** (pick subscription, resource group, region).  
   - Create or open a **project** inside that hub.

3. **Ensure an Azure OpenAI dependency exists**  
   Foundry projects are backed by Azure resources. In the portal, confirm you have an **Azure OpenAI** account linked (often created as part of hub setup).  
   - If you only see “deploy model” wizards, complete a **model deployment**; that usually provisions or selects an OpenAI resource.

4. **Deploy a chat model**  
   - Open **Deployments** (or **Models + endpoints** → deploy).  
   - Deploy a model that supports **chat completions** and **JSON mode**, for example **`gpt-4o-mini`** (good default for dev cost/latency).  
   - Note the **deployment name** you choose (e.g. `gpt-4o-mini`). This string must match **`AZURE_OPENAI_DEPLOYMENT_CHAT`** in `local.settings.json`.

5. **Get endpoint and API key (classic OpenAI resource)**  
   The backend expects the **Azure OpenAI resource** endpoint, not a random preview URL.

   - Open **Azure Portal** → search for **Azure OpenAI** (or your resource name from the Foundry “Open resource in Azure” link).  
   - Open the resource → **Keys and Endpoint**.  
   - Copy:  
     - **Endpoint** — e.g. `https://your-resource-name.openai.azure.com` (no trailing slash required; the app trims it).  
     - **KEY 1** (or KEY 2).

   If you only see keys inside Foundry, use the **“View in Azure Portal”** / **Open in Azure** link for the underlying OpenAI resource and copy from there.

### Option 2 — Azure Portal only (no Foundry)

1. In [Azure Portal](https://portal.azure.com), **Create a resource** → search **Azure OpenAI** → **Create**.
2. Choose **subscription**, **resource group**, **region** (pick a region where OpenAI is available for your subscription), **name**, pricing tier.
3. After deployment, open the resource → **Model deployments** → **Manage deployments** → **Create** deployment.
4. Select a model (e.g. **gpt-4o-mini**), set **deployment name** (e.g. `gpt-4o-mini`).
5. **Keys and Endpoint** → copy **Endpoint** and **KEY 1**.

### Map to `local.settings.json` (OpenAI)

In **`backend/local.settings.json`** (never commit this file):

```json
"APP_PROFILE": "LocalAzure",
"AZURE_OPENAI_ENDPOINT": "https://YOUR_RESOURCE.openai.azure.com",
"AZURE_OPENAI_API_KEY": "YOUR_KEY_1",
"AZURE_OPENAI_API_VERSION": "2024-08-01-preview",
"AZURE_OPENAI_DEPLOYMENT_CHAT": "YOUR_DEPLOYMENT_NAME"
```

- **`AZURE_OPENAI_DEPLOYMENT_CHAT`** must equal the **deployment name** in Azure, not only the model name (unless you named them the same).
- **`AZURE_OPENAI_API_VERSION`** default in code is `2024-08-01-preview`; change only if Microsoft documents a newer compatible version for your deployment.

### Verify OpenAI (optional)

With key and endpoint, you can test from a terminal (replace placeholders):

```bash
curl -sS "${AZURE_OPENAI_ENDPOINT}/openai/deployments/${DEPLOYMENT}/chat/completions?api-version=2024-08-01-preview" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AZURE_OPENAI_API_KEY}" \
  -d '{"messages":[{"role":"user","content":"Say hello in JSON as {\"greeting\":\"...\"}"}],"response_format":{"type":"json_object"},"max_tokens":100}'
```

You should get HTTP 200 and a JSON body with `choices`.

---

## Part B — Azure AI Content Safety (optional but recommended with real LLM)

Content Safety is a **separate** Cognitive Services–style resource. The app calls the **Text Analyze** API.

### Steps

1. In **Azure Portal** → **Create a resource** → search **Content Safety** → **Create**.
2. Choose **subscription**, **resource group**, **region**, **name**, pricing (there is often a free/low-cost tier for dev).
3. After deployment, open the resource → **Keys and Endpoint**.
4. Copy:  
   - **Endpoint** — typically `https://YOUR_NAME.cognitiveservices.azure.com` (or regional variant shown in the portal).  
   - **KEY 1**.

The code builds: `{ENDPOINT}/contentsafety/text:analyze?api-version=...`  
So the endpoint value should be the **resource base URL** without a path suffix.

### Map to `local.settings.json` (Content Safety)

```json
"AZURE_CONTENT_SAFETY_ENDPOINT": "https://YOUR_CONTENT_SAFETY_NAME.cognitiveservices.azure.com",
"AZURE_CONTENT_SAFETY_KEY": "YOUR_KEY_1",
"AZURE_CONTENT_SAFETY_API_VERSION": "2023-10-01"
```

If endpoint or key is missing, the moderation layer **falls back to “safe”** in some code paths; with **`LocalAzure`**, you should set real values so moderation matches production behavior.

---

## Part C — Turn it on locally

1. Set **`APP_PROFILE`** to **`LocalAzure`** in `local.settings.json`.
2. Ensure **`SQL_CONNECTION_STRING`** is valid (conversation APIs require SQL in this backend).
3. From **`backend/`**:

   ```bash
   npm run build
   npm start
   ```

4. Exercise a conversation (e.g. via the FluentCopilot app with `NEXT_PUBLIC_API_BASE_URL` pointing at Functions, or call `POST /api/conversations/...` directly).

5. If something fails, check the Function host logs for `OpenAI` or `Content Safety` HTTP errors (401 = wrong key; 404 = wrong deployment name or endpoint).

---

## Part D — Cloud / Azure Functions (CloudDev)

For deployed Functions, add the **same** application setting names in **Configuration** → **Application settings** (or Key Vault references). Use **`APP_PROFILE=CloudDev`** (or `LocalAzure` if you reuse that name in code paths—see `backend/src/config/env.ts`).

Do **not** commit secrets; use Azure Key Vault references in production where possible.

---

## Troubleshooting

| Symptom | Things to check |
|--------|------------------|
| `401` / `PermissionDenied` | Wrong API key, or key from wrong resource (Foundry project key vs OpenAI resource key). |
| `404` on chat completions | Wrong **`AZURE_OPENAI_ENDPOINT`**, or deployment name mismatch (**`AZURE_OPENAI_DEPLOYMENT_CHAT`**). |
| `400` on JSON / response_format | Model deployment must support **JSON mode**; try **gpt-4o** / **gpt-4o-mini** class models. |
| Content Safety errors | Endpoint must be the **Content Safety** resource base URL; header is **Ocp-Apim-Subscription-Key**. |
| Still using mock LLM | **`APP_PROFILE`** still **`LocalMock`**; set **`LocalAzure`**. |
| Empty or generic errors | Enable detailed logging on the Function host; confirm outbound internet from your machine (local) or VNet rules (cloud). |

---

## Official references (keep bookmarks)

- [Azure OpenAI Service documentation](https://learn.microsoft.com/azure/ai-services/openai/)
- [Azure AI Foundry portal](https://ai.azure.com) (project/hub UI)
- [Azure AI Content Safety](https://learn.microsoft.com/azure/ai-services/content-safety/)
- [Chat completions REST API (Azure OpenAI)](https://learn.microsoft.com/azure/ai-services/openai/reference#chat-completions)

---

## Summary checklist

- [ ] Azure OpenAI resource exists; **deployment** created for a chat model (e.g. gpt-4o-mini).  
- [ ] **`AZURE_OPENAI_ENDPOINT`**, **`AZURE_OPENAI_API_KEY`**, **`AZURE_OPENAI_DEPLOYMENT_CHAT`** set.  
- [ ] **`AZURE_OPENAI_API_VERSION`** set (or rely on default in code).  
- [ ] Content Safety resource created; **`AZURE_CONTENT_SAFETY_ENDPOINT`** + **`AZURE_CONTENT_SAFETY_KEY`** set.  
- [ ] **`APP_PROFILE=LocalAzure`** for local real-LLM runs.  
- [ ] SQL and Functions running; frontend **`NEXT_PUBLIC_API_BASE_URL`** aimed at local Functions if testing end-to-end.
