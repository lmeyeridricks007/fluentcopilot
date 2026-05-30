# Live turn bottleneck report

## Instrumentation

### Client (`LiveSpeechTurnTimer` + `LiveSpeechLatencyTrace`)

Anchored at **mic release** (`turnAnchorPerf`). Tracks:

- First partial / final transcript (browser Azure STT)
- Audio prepare / server transcribe (fallback path)
- LLM request → first delta → done (`conversationClient.sendConversationMessageStream`)
- TTS start/done, playback start
- Merged **server** fields from `done.liveTurnLatencyTrace`: `serverLlmMs`, `serverStateLoadMs`, `serverBottleneckStage`, token estimates, `budgetsExceeded`

Console: `[LiveSpeechLatency]` (info), `WARNING: LIVE TURN OVER BUDGET` (warn if `totalMs > 5000`).

### Server (`LiveTurnLatencyTraceServer`)

Built in `liveTurnServerLatencyTrace.ts` from `ConversationPerf` marks:

| Stage | Marks |
|-------|--------|
| Normalize | Measured around `preprocessLiveSpeechTranscript` + `afterNormalize` |
| State load | `afterNormalize` → `beforeReplyStream` (moderation, insert, recent, prep) |
| LLM | `beforeReplyStream` → `afterReplyStream` (or `beforeReplyLlm` → `afterReplyLlm` on JSON send path) |
| Assistant moderation | `afterReplyStream` → `afterAssistantMod` |
| Persist | `afterAssistantMod` → `afterAssistantPersist` |

`bottleneckStage` is the max among: `state_load`, `llm`, `assistant_moderation`, `persist`.

### Azure Speech (browser)

`useLiveSpeakStt` logs `[SpeakLiveAzureStt]` for: `recognize_config`, `session_started`, `speech_start_detected`, `speech_end_detected`, `first_partial`, `final_recognized`, `session_stop_commit` (when `NEXT_PUBLIC_SPEAK_LIVE_STT_DEV_LOG=1` or `NODE_ENV=development`).

## Typical bottlenecks (2026-04)

1. **LLM** — model choice, prompt size, provider RTT. Mitigations: `LIVE_REPLY_MODEL`, ultra-lean prompt, smaller `LIVE_SPEECH_RECENT_MESSAGES_MAX`, caching scenario/persona.
2. **Transcript finalization** — segmentation silence; mitigations: `NEXT_PUBLIC_SPEAK_LIVE_SEGMENTATION_SILENCE_MS` (default **320** ms), browser Azure STT enabled.
3. **TTS** — separate from text on stream path; mitigations: shorter assistant lines (`AI_CONVERSATION_SPEAK_LIVE_REPLY_MAX_OUTPUT_TOKENS`), regional TTS latency.
4. **Assistant moderation** — second Content Safety call; usually smaller than LLM.

## If total still exceeds 5 s

1. Compare **client** `llmMs` vs **server** `serverLlmMs` — large gap implies network or streaming plumbing.
2. Check `serverBottleneckStage` — if `state_load`, inspect DB / moderation latency.
3. Enable `NEXT_PUBLIC_CONVERSATION_PERF=1` and backend `CONVERSATION_PERF_LOG=1` for raw `d_*` deltas on `perf`.

## Remaining product tradeoffs

- Train-station **orchestration JSON** is still required for goal fidelity; trimmed to ~960 chars.
- **Content Safety** on user + assistant remains for production safety.
