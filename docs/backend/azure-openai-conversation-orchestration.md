# Azure OpenAI — conversation orchestration

## Flow (one user message)

1. **Load** thread (ownership check), scenario, persona, rolling `SummaryText`, recent messages (window = 24).
2. **Moderate** user text (`Content Safety` or `NoOp`).
3. **Persist** user `ConversationMessages` row.
4. **Build prompts** (`prompts/buildTurnMessages.ts` + partials under `prompts/partials/`).
5. **Invoke** model:
   - **LocalMock**: `mockTurnGenerator.generateMockTurn` (no network).
   - **LocalAzure / CloudDev**: `azureOpenAiRestClient.azureOpenAiChatCompletionJson` with `response_format: json_object`.
6. **Parse** JSON with Zod (`services/azureOpenAi/responseParser.ts` → `AIResponseEnvelope`).
7. **Moderate** assistant reply.
8. **Persist** assistant message; if `feedbackMode = turn` and envelope contains feedback → `FeedbackItems` row.
9. **Update** thread `SummaryText` + `CurrentStage` from envelope.
10. **Emit** optional Service Bus + Blob artifact hooks.

## JSON contract (turn)

Defined in `prompts/jsonContracts.ts` and validated by `TurnEnvelopeZ`. Fields include:

- `assistantReply` (Dutch, in persona)
- `feedback` (nullable; forced null in prompt when `feedbackMode = end`)
- `saveWordCandidates`
- `scenarioProgress` (`stage` + optional `notes`)
- `shouldConversationEnd`
- `updatedSummary` (compact English rolling summary for cost control)

## Recap (end conversation)

- **System** prompt: `buildRecapSystemMessage`
- **User** payload: full transcript + deferred coaching lines from `FeedbackItems`
- Output parsed to `ConversationSummary` (`parseRecapEnvelope`)

## Configuration

| Setting | Purpose |
|---------|---------|
| `AZURE_OPENAI_ENDPOINT` | `https://{resource}.openai.azure.com` (no trailing slash required) |
| `AZURE_OPENAI_API_KEY` | Key (Key Vault in prod) |
| `AZURE_OPENAI_API_VERSION` | e.g. `2024-08-01-preview` |
| `AZURE_OPENAI_DEPLOYMENT_CHAT` | Deployment name for chat model |

## Structured output note

We use **`json_object`** mode plus Zod validation for portability across API versions. If the team standardizes on **JSON Schema** response format for a specific API version, swap the REST body in `azureOpenAiRestClient.ts` and tighten the schema — keep **parsing** in `responseParser.ts` only.

## Prompt placement rule

**No prompt strings in HTTP handlers.** All scenario/persona/mode composition lives under `prompts/`.

## Telemetry

Use `services/telemetry/telemetry.ts` from handlers/services with `InvocationContext` for dependency timing logs; wire **Application Insights** SDK when moving to cloud.

## Related

- [Architecture](./backend-architecture.md)
- [Setup](./backend-setup-azure-local-and-cloud.md)
