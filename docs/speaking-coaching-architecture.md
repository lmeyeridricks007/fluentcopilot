# Speaking coaching (transcript-based)

## Purpose

FluentCopilot evaluates **spoken user turns** after ASR transcription. This stage answers: *Did the learner meet the scenario intent with natural, level-appropriate Dutch wording?* It returns **short coaching**, optional **better phrasing**, **CEFR fit**, **save-phrase candidates**, and **structured signals** for future personalization.

It does **not** replace **Azure Pronunciation Assessment** (or similar audio-based scoring). Transcript-only coaching cannot observe accent, rhythm, or phoneme-level accuracy; the product must keep that boundary explicit in UI copy and API metadata (`evaluationScope: "transcript_only"`).

## Components

| Layer | Responsibility |
|--------|----------------|
| `POST /api/speech/speaking-coaching` | Validates body, calls `OpenAiSpeakingCoachingService`, returns `{ coaching }`. |
| `speakingCoachingContracts.ts` | Request DTO, Zod body schema, response schema, `ISpeakingCoachingService`. |
| `openAiSpeakingCoachingService.ts` | OpenAI JSON call, parse/validate, safe fallback on model/parse failure. |
| `speechClient.evaluateSpeakingCoaching` | Frontend fetch helper. |
| `TrainStationChatPage` | After a successful send with `inputMeta.inputMode === "speech"`, runs coaching **asynchronously** (does not block the assistant reply). |
| `SpeakingCoachingCard` | Compact coach card under the user bubble (`feedbackMode === after_each`). |
| `ConversationRecapView` | When `feedbackMode === at_end`, deferred rows from React Query are merged into recap at **End conversation**. |

## Feedback modes

- **`after_each`**: Client sets a loading state on the user message, then renders `SpeakingCoachingCard` when the API returns.
- **`at_end`**: Client appends `{ userMessageId, coaching }` to `['speakingCoachingDeferred', threadId]`. On end, items are copied into `ConversationRecapViewModel.speakingCoachingRecap` and the deferred query is cleared. **Note:** Deferred rows are held in memory until end; a full page reload before ending drops them (acceptable for v1).

## Output schema (summary)

See Zod `SpeakingCoachingEvaluateResponseSchema` in `backend/src/services/speech/speakingCoachingContracts.ts`. Highlights:

- **Ranks** (`intentMatch`, `naturalness`, `clarity`, `levelFit`): `strong` | `ok` | `needs_work`
- **CEFR appropriateness**: `below_level` | `on_level` | `above_level`
- **`savePhraseCandidates`**: `{ phrase, contextNote? }[]`
- **`coachingSignals`**: string tags (e.g. `unnatural_question_form`, `over_literal_english_transfer`) for Coach tab / weakness patterns / recommendations.

## Async vs sync

**Recommended:** **Async** after message send (current implementation). The main conversation path stays fast; coaching is additive.

A **sync** variant (blocking send response) would increase latency and is not required for good UX unless the client must guarantee coaching before showing the thread.

## Related docs

- Full system + user prompts: [prompts/speaking-coaching.md](./prompts/speaking-coaching.md)
- Transcript-only pronunciation heuristic (separate feature): [pronunciation-feedback.md](./pronunciation-feedback.md)
