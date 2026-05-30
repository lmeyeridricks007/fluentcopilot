# OpenAI now, Azure OpenAI later — product strategy

## Why OpenAI direct first

- Fastest path for **model choice**, **JSON mode**, and **iteration** without Azure subscription coupling during early product work.
- Single **API key** developer experience for local Functions + cloud dev.
- Same **prompt + validation** stack applies when you switch to Azure.

## Why keep Azure OpenAI in the codebase

- Many teams deploy **only** inside Azure for compliance, private networking, or spend consolidation.
- `AzureOpenAiConversationAiProvider` uses the same **chat completions + JSON** contract as today’s OpenAI path, so switching is **configuration + testing**, not a rewrite.

## How to switch

1. Set in `local.settings.json` (or App Settings):

   - `AI_PROVIDER=azure-openai`
   - `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_DEPLOYMENT_CHAT` (or `AZURE_OPENAI_DEPLOYMENT`)

2. Optional: unset or ignore `OPENAI_API_KEY` for that environment.

3. Restart Functions. Health should show `aiProvider: "azure-openai"` and `aiProviderConfigOk: true`.

## Default resolution rules

If `AI_PROVIDER` is **omitted**:

- **`APP_PROFILE=LocalMock`** → **`mock`** (same as before: no external LLM unless you opt in).
- **`LocalAzure` / `CloudDev`:** `openai` if `OPENAI_API_KEY` is set; else `azure-openai` if Azure endpoint + key are set; else `mock`.

To call **OpenAI direct** while keeping **`APP_PROFILE=LocalMock`** (no-op Content Safety), set explicitly:

`AI_PROVIDER=openai` and `OPENAI_API_KEY=...`.

Explicit `AI_PROVIDER` values: `openai` | `azure-openai` | `mock`.

## Environment variables

| Variable | Used when |
|----------|-----------|
| `AI_PROVIDER` | Explicit selection |
| `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_BASE_URL`, `OPENAI_ORG`, `OPENAI_PROJECT` | `openai` |
| `AZURE_OPENAI_*` | `azure-openai` |
| `AI_REQUEST_TIMEOUT_MS`, `AI_MAX_RETRIES`, `AI_LOG_VERBOSE` | All network providers |

`APP_PROFILE` still controls **moderation** (`LocalMock` → no-op Content Safety). It does **not** select the LLM provider anymore; use `AI_PROVIDER` for that.

## Testing

- **Mock:** no keys, `APP_PROFILE=LocalMock`, omit `AI_PROVIDER` or set `AI_PROVIDER=mock`.
- **OpenAI:** `AI_PROVIDER=openai` + `OPENAI_API_KEY`.
- **Azure:** `AI_PROVIDER=azure-openai` + endpoint/key/deployment.

## Full Azure adoption checklist (later)

- [ ] Private endpoints / managed identity (replace `api-key` with token auth in provider).
- [ ] Deployment-specific rate limits and monitoring.
- [ ] Content filter settings aligned with product policy.
- [ ] Load/staging tests on recap + turn JSON schemas.

See [azure-openai-and-foundry-setup.md](./azure-openai-and-foundry-setup.md) for Azure resource provisioning.
