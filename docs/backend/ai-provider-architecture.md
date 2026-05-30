# AI provider architecture (FluentCopilot backend)

## Goals

- **OpenAI direct** is the default LLM path for fast iteration (`api.openai.com` + API key).
- **Azure OpenAI** is a first-class alternate provider (same prompts, same validation, REST shape).
- **Mock** supports offline / CI-style runs with no keys.
- **Domain services** (`conversationAppService`, HTTP handlers) never import OpenAI or Azure SDKs.

## Layout

```
backend/src/services/ai/
  config/aiProviderConfig.ts       # AI_PROVIDER resolution + env validation
  contracts/                       # ConversationAiProvider, request DTOs
  errors.ts                        # AiProviderError, AiValidationError, …
  factory/createConversationAiProvider.ts
  logging/aiRunLogger.ts
  orchestration/
    ScenarioPromptBuilder.ts       # scenario + persona + mode block
    FeedbackPromptBuilder.ts       # feedback policy block
    TurnPromptBuilder.ts           # full turn chat messages (uses prompts/buildTurnMessages)
    SummaryPromptBuilder.ts        # recap messages (uses prompts/buildRecapMessages)
    ResponseValidator.ts           # zod validation → domain types
    ResponseMapper.ts              # strict turn mapping; soft recap fallback
  providers/
    OpenAiConversationAiProvider.ts
    AzureOpenAiConversationAiProvider.ts
    MockConversationAiProvider.ts
    mockTurnLogic.ts
```

Shared **JSON prompt contracts** and human-readable instructions remain under `backend/src/prompts/`. `buildTurnMessages.ts` composes **Scenario** + **Feedback** builders from `orchestration/` so policy stays centralized.

## Interface

`ConversationAiProvider`:

- `generateTurn(AiConversationTurnRequest) → AIResponseEnvelope`
- `generateEndSummary(AiEndSummaryRequest) → ConversationSummary`

All providers return **domain types** from `models/contracts.ts`, not vendor JSON.

## Flow (Feature 1 send message)

1. Moderation (user) — unchanged, `createModerationProvider()`.
2. Persist user message.
3. `createConversationAiProvider().generateTurn(...)` — prompts via `TurnPromptBuilder`, JSON validated via `ResponseValidator` / `ResponseMapper`.
4. Moderation (assistant reply).
5. Persist assistant message, feedback row, thread state.

Errors from the AI layer are mapped to `ApiError` in `conversationAppService` (`LLM_ERROR`, `DEPENDENCY_UNAVAILABLE`, etc.).

## Default provider selection

See [openai-now-azure-later-strategy.md](./openai-now-azure-later-strategy.md). Short version: **`APP_PROFILE=LocalMock`** with **`AI_PROVIDER` unset** keeps the **mock** LLM (no keys required). For **OpenAI direct** in that profile, set **`AI_PROVIDER=openai`** and **`OPENAI_API_KEY`**.

## Health

`GET /api/health` includes:

- `aiProvider` — resolved id (`openai` | `azure-openai` | `mock`)
- `aiProviderConfigOk` — whether required secrets exist for that provider
- `aiProviderConfigDetail` — error message when misconfigured

## Adding a provider

1. Implement `ConversationAiProvider`.
2. Register in `createConversationAiProvider.ts`.
3. Extend `AiProviderId` + `getResolvedAiProviderId()` + `assertProviderConfigReady()`.

## Legacy shims

- `services/azureOpenAi/responseParser.ts` re-exports validators / `parseTurnEnvelope` shims.
- `services/azureOpenAi/mockTurnGenerator.ts` delegates to `mockTurnLogic.ts`.
- `services/azureOpenAi/azureOpenAiRestClient.ts` — deprecated; Azure traffic goes through `AzureOpenAiConversationAiProvider`.

See also: [openai-now-azure-later-strategy.md](./openai-now-azure-later-strategy.md).
