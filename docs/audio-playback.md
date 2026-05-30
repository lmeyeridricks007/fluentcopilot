# Assistant message audio playback

FluentCopilot lets learners **listen to any assistant (AI) reply** in Dutch with a single tap. Playback is **exclusive** (one message at a time), **non-blocking** (UI never waits on TTS), and works **offline** via browser speech when the API is unavailable.

## Architecture

```
┌─────────────────────┐     ┌──────────────────────┐
│ ChatMessageBubble   │────▶│ AssistantMessagePlay │
│ (per message UI)    │     │ Button               │
└─────────────────────┘     └──────────┬───────────┘
                                       │ tap
                                       ▼
                            ┌──────────────────────┐
                            │ chatAudioManager     │  ◀── singleton (module scope)
                            │ - activeMessageId    │
                            │ - uiState              │
                            │ - LRU data URL cache   │
                            └──────────┬───────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    ▼                  ▼                  ▼
           ┌──────────────┐   ┌──────────────┐   ┌────────────────┐
           │ Inline       │   │ POST         │   │ Web Speech     │
           │ metadata     │   │ /audio/      │   │ (nl-NL voice)  │
           │ .audioUrl    │   │ generate     │   │                │
           └──────────────┘   └──────────────┘   └────────────────┘
```

- **`chatAudioManager`** (`src/lib/audio/chatAudioManager.ts`): orchestrates play / pause / resume / stop, `AbortController` for in-flight server fetches, and an in-memory **LRU cache** (last 10 messages) of generated `data:` URLs.
- **`useChatAudioPlaybackSnapshot`**: `useSyncExternalStore` bridge so bubbles and buttons re-render on state changes.
- **`browserSpeechPlayback`**: `SpeechSynthesisUtterance` with Dutch voice selection (`nl-NL` / `nl` preferred).
- **`audioClient`**: JSON `POST /api/audio/generate` when using server TTS.

## Browser vs LLM (OpenAI) TTS

| Mode | Env | Behavior |
|------|-----|----------|
| **Browser** (default) | `NEXT_PUBLIC_AUDIO_TTS_MODE` unset or `browser` | No server calls for audio. Uses Web Speech API only (after optional `audioUrl` from API). |
| **Server** | `NEXT_PUBLIC_AUDIO_TTS_MODE=server` | Requires `NEXT_PUBLIC_API_BASE_URL` + backend with `OPENAI_API_KEY`. Play / preload call `POST /audio/generate`. |
| **Auto** | `NEXT_PUBLIC_AUDIO_TTS_MODE=auto` | Same as server when backend chat is enabled; still falls back to Web Speech if generation fails or key missing. |

Server path also requires **`NEXT_PUBLIC_FEATURE1_CHAT_SOURCE=backend`** (or API base URL so chat is backend) so we do not call Azure from a mock-only FE build by mistake.

## Fallback strategy

1. If `message.metadata.audioUrl` is present → **HTMLAudioElement** (inline `data:` or `https:` URL).
2. Else if server TTS is allowed and succeeds → play returned **MP3 data URL** (cached per `messageId`).
3. Else if **Web Speech** is available → **SpeechSynthesis** with Dutch voice.
4. Else → control stays disabled (“Audio not available”).

## Backend: `POST /api/audio/generate`

- **Route:** `audio/generate` (Azure Functions v4).
- **Body:** `{ text, language?, voice? }` — `voice` must be one of OpenAI TTS voices (`alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`); defaults to `nova`.
- **Response:** `{ mimeType, audioBase64, audioUrl }` where `audioUrl` is a ready-to-use `data:audio/mpeg;base64,...` URL.
- **Errors:** `503` + `TTS_UNAVAILABLE` when `OPENAI_API_KEY` is missing.

Caching on the server is **not** implemented yet; the client LRU reduces repeat OpenAI calls for the same message in-session.

## Preload

When the conversation session loads or updates, **`TrainStationChatPage`** iterates assistant messages and calls **`chatAudioManager.preload`**, which starts a background **`requestGenerateSpeech`** per message (deduped by `messageId`). This does **not** block rendering or sending messages.

## Performance & UX

- **Single active player** — starting a new message stops the previous (`HTMLAudioElement` + `speechSynthesis.cancel()`).
- **Navigation** — unmounting the thread page calls **`chatAudioManager.stop()`**.
- **Rapid taps** — second tap while **loading** cancels the in-flight request; while **playing** pauses; while **paused** resumes.
- **Long text** — server truncates to **4096** characters; browser speech uses full string within engine limits.
- **Reduced motion** — spinner / ring use `motion-safe:` where applicable in surrounding UI; audio has no mandatory animation.

## Files (reference)

| Area | Path |
|------|------|
| Manager + hook | `src/lib/audio/chatAudioManager.ts` |
| Browser TTS | `src/lib/audio/browserSpeechPlayback.ts` |
| API client | `src/lib/audio/audioClient.ts` |
| Types | `src/lib/audio/audioTypes.ts` |
| Config | `src/lib/api/apiConfig.ts` — `getAudioTtsMode` |
| UI | `AssistantMessagePlayButton.tsx`, `ChatMessageBubble.tsx` |
| Lifecycle | `TrainStationChatPage.tsx` — stop on unmount, preload |
| Mapper | `conversationMappers.ts` — `metadata.audioUrl` |
| Backend | `backend/src/services/audio/openAiSpeechService.ts`, `registerHttpFunctions.ts` |

## Switching between browser and LLM TTS

1. **Local / no key:** omit `NEXT_PUBLIC_AUDIO_TTS_MODE` or set `browser`.
2. **High-quality OpenAI speech:** set `NEXT_PUBLIC_AUDIO_TTS_MODE=server` or `auto`, configure **`NEXT_PUBLIC_API_BASE_URL`**, run backend with **`OPENAI_API_KEY`** (same key as chat is fine).
3. **Optional future:** populate `metadata.audioUrl` on assistant rows from storage/CDN to skip generation entirely.
