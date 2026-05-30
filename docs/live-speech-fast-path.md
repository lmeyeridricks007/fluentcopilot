# Speak Live fast path

## Goal

Live voice turns must stay on a **minimal critical path**: transcript → normalize → load thread + compact scenario state → Stage A LLM (**micro** live prompt by default) → persist turn → return text. **Post-session** pronunciation, grammar depth, recap, save-words, and drills run **only** after the session ends.

## Old vs new flow

| Phase | Before | After |
|--------|--------|--------|
| Learner audio blob | Could block LLM start when awaited with DB reads | Upload starts immediately; **not** awaited before streaming LLM |
| Scenario/persona | SQL every turn | **60s TTL** in-process cache (`scenarioPersonaCache.ts`) |
| Recent context | Up to 8 DB rows, 5 live slices | DB window unchanged; live slice default **4** (`LIVE_SPEECH_RECENT_MESSAGES_MAX`) |
| Stage A prompt | Large reply-only + train JSON | Default **micro** prompt (`liveSpeakMicroLlmPrompt.ts`); legacy ultra-lean: `SPEAK_LIVE_LEGACY_ULTRA_LEAN_PROMPT=1` — `docs/live-prompt-minification.md` |
| Assistant text vs TTS | Bundled turn often awaited server TTS | **Default:** server returns text first (`ttsDeferred`); client TTS async. NDJSON path unchanged — text first, then `requestGenerateSpeech` (`docs/live-tts-decoupling.md`) |
| Observability | Raw `perf` deltas only | Structured `liveTurnLatencyTrace` on `done` + merged client trace |

## Critical path (explicit)

1. Final transcript (browser Azure STT or server transcribe).
2. `preprocessLiveSpeechTranscript` (light normalize).
3. User moderation + **cached** scenario/persona + insert user row + recent messages.
4. `prepareAssistantTurnRequest` → `streamAssistantReplyOnly` / `runAssistantReplyLlm`.
5. Assistant moderation (Content Safety) → persist assistant + Speak Live FSM.
6. Optional: await learner blob upload for metadata only.

## Not on the live path

- Azure pronunciation assessment
- Grammar / sentence construction scoring
- Recap generation, saved-word extraction, recommendations, drills
- `enrichConversationTurn` (Speak Live sets `enrichmentPending: false` on live assistant rows)
- Post-session orchestrator (`liveSessionEvaluationOrchestrator`) — wired only from `endConversation` via **dynamic import**

See `docs/live-evaluation-boundaries.md` and `liveEvaluationBoundaries.test.ts`.

## Configuration highlights

| Variable | Role |
|----------|------|
| `LIVE_REPLY_MODEL` | Stage A live model (see `aiProviderConfig.ts`) |
| `CHAT_REPLY_MODEL` / `TEXT_CHAT_MODEL` | Non-live / fallback chat model chain |
| `EVALUATION_MODEL` / `EVAL_MODEL` | Enrichment / evaluation (never used on live NDJSON path) |
| `LIVE_SPEECH_RECENT_MESSAGES_MAX` | 2–8, default **4** |
| `NEXT_PUBLIC_SPEAK_LIVE_SEGMENTATION_SILENCE_MS` | 260–900 ms, default **320** (faster phrase end) |

## Future work

- True **streaming STT** to the server (today: browser finals or MediaRecorder + `/speech/transcribe`).
- Optional **skip assistant moderation** for ultra-low-latency lab builds (not default — safety).
