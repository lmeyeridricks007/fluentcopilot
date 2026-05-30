# Speak Live — V1 voice pipeline (backend)

## Flow (sequential V1)

```text
Client (short audio chunk, base64 + MIME)
    → POST /api/speak-live/turn
        1. STT — OpenAI Whisper-compatible (`openAiSpeechToTextService`)
        2. LLM reply — existing `sendConversationMessage` (persists user + assistant rows, uses thread summary + recent window)
        3. TTS — existing `generateSpeechFromText` / OpenAI TTS (`openAiTextToSpeechService`, disk/memory cache)
    ← JSON: transcript, assistantReply, audioUrl, ids, perf, signals
```

**Context reuse:** `sendConversationMessage` already loads `thread.summaryText` and `listRecentMessagesForThread` before `runAssistantReplyLlm`, so **no duplicate context assembly** in the Speak Live service.

**Enrichment:** The normal text path sets `enrichmentPending: true`. Speak Live clients can **POST `/messages/enrich` later** (optional) to avoid blocking the voice loop on coach JSON.

## Endpoint

| Method | Path | Auth |
|--------|------|------|
| `POST` | `/api/speak-live/turn` | `x-user-id` (same as other Functions) |

### Request body (JSON)

| Field | Type | Required | Notes |
|-------|------|----------|--------|
| `audioBase64` | string | yes | Raw clip; same caps as `/speech/transcribe` (`AUDIO_UPLOAD_MAX_MB`, default 12 MB). |
| `mimeType` | string | yes | e.g. `audio/webm;codecs=opus` |
| `threadId` | UUID string | yes | Active conversation thread. |
| `scenarioId` | string | no | Slug/id hint for STT telemetry only. |
| `level` | `A1` \| `A2` \| `B1` | no | Reserved for future prompt tuning. |
| `language` | string | no | STT hint, default `nl`. |

### Response (JSON)

| Field | Description |
|-------|-------------|
| `transcript` | Normalized user text from STT. |
| `assistantReply` | Full assistant message text (DB may match; TTS may truncate — see below). |
| `audioUrl` | `data:audio/mpeg;base64,...` for immediate playback. |
| `mimeType` | `audio/mpeg` |
| `userMessageId` / `assistantMessageId` | Persisted message IDs. |
| `thread` | Updated `ApiConversationThread` snapshot. |
| `enrichmentPending` | Same semantics as text send. |
| `scenarioProgress` | Structured progress from reply-only model. |
| `signals` | `ttsCached`, `sttProvider`, optional `detectLanguage`, `sttDurationSeconds`. |
| `perf` | `sttMs`, `llmMs`, `ttsMs`, `totalMs` (server-side, wall clock). |

### Errors

- `400` — empty transcript, invalid base64, clip too short/large.
- `403` / `404` / `409` — same as `sendConversationMessage` (forbidden, missing thread, thread not active).

## Performance notes (V1)

1. **Inherent serialization:** STT → LLM → TTS must run in order; **parallelism is limited** until streaming TTS or speculative execution is added.
2. **Reuse:** TTS **cache** (memory + optional disk) speeds repeated or similar phrases.
3. **Payload:** Client sends **one JSON** body; no separate round trips for STT/LLM/TTS on the hot path.
4. **TTS cap:** Assistant text is truncated to **3500 characters** before TTS to keep latency bounded on pathological long replies.
5. **Target ~3 s:** Typical breakdown (order-of-magnitude): STT 0.4–1.2 s, reply LLM 0.8–2 s, TTS 0.3–1 s — highly dependent on region, model tier, and clip length. Use `perf.*` fields to measure in your environment.

## Code references

- Service: `backend/src/services/speak-live/speakLiveTurnService.ts`
- Route registration: `backend/src/http/registerHttpFunctions.ts` (`speakLiveTurn`, route `speak-live/turn`)
- Frontend client: `conversationClient.speakLiveTurn` in `src/lib/api/conversationClient.ts`
- Types: `SpeakLiveTurnResponse` in `src/lib/api/apiTypes.ts`
