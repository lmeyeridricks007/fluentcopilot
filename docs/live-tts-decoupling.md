# Live TTS decoupling (text-first, audio-second)

## Goal

Assistant **text** must return as soon as the LLM + persistence complete. **Neural TTS** must not block the HTTP response or React render of the transcript / assistant line.

## Backend: `POST /speak-live/turn`

1. **Default (non-blocking):** After `sendConversationMessage`, the handler **does not await** `generateSpeakLiveAssistantSpeech`. It returns immediately with:
   - `assistantReply`, message ids, thread, `perf` (with `ttsMs: 0` on the deferred path)
   - `audioUrl: ""` when TTS was not awaited
   - `signals.ttsDeferred: true` so the client knows to fetch audio itself.

2. **Legacy (blocking):** Set `SPEAK_LIVE_SERVER_TTS_SYNC=1` to await server TTS before responding (slower; `ttsDeferred: false`, `audioUrl` populated when successful).

3. **Backward compatibility:** `SPEAK_LIVE_SERVER_TTS_ASYNC=0` is treated like sync (same as before when async was opt-in).

Implementation: `liveSpeechServerTtsAsync()` in `liveSpeechTurnService.ts` and `speakLiveTurnService.ts`.

## Backend: NDJSON `POST …/messages/stream`

Already text-first: `delta` → `done` with assistant message **before** any server TTS. The browser calls `requestGenerateSpeech` after `done`.

## Frontend: media phase model

`LiveAssistantMediaPhase` in `liveSpeakTypes.ts`:

| Phase | Meaning |
|--------|---------|
| `idle` | No pending text/audio distinction for the badge. |
| `assistant_text_ready` | User + assistant rows are on the thread; audio not started or not required yet. |
| `assistant_audio_loading` | Client is calling `/audio/tts` (or equivalent). |
| `assistant_audio_ready` | Playable URL received; about to autoplay unless muted. |

`LiveStatusBadge` takes optional `assistantMediaPhase` and shows **Reply ready** / **Voice loading** / **Voice ready** instead of the generic `replying` label when relevant.

## Frontend: bundled turn path

When `audioUrl` is empty (typical with `ttsDeferred`), the screen **does not** show a hard error — it runs the **same client TTS** path as the NDJSON stream (`requestGenerateSpeech` → `playAssistantUrl` / replay).

When `audioUrl` is present (sync server path), it plays immediately as before.

## Fallbacks

- **TTS slow:** Text and thread stay visible; badge shows **Voice loading**; `connLine` explains background fetch.
- **TTS fails:** `lastAssistantTtsFailed` + soft warning; text remains; user can use replay on the assistant card when a URL exists later.
- **Muted:** Phase resets to `idle` after URL is ready; status returns to `idle` without autoplay; replay still works when unmuted.

## Acceptance

- [x] Bundled live-turn HTTP response does not wait for server TTS by default.
- [x] NDJSON path unchanged (already non-blocking on TTS).
- [x] UI exposes text vs audio state without blocking render.
- [x] Audio still autoplays when available and not muted.

## Related

- `docs/live-speech-fast-path.md`
- `docs/live-prompt-minification.md`
