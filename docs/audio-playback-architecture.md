# Assistant audio playback architecture

## Goals

- **Primary:** natural Dutch via **OpenAI TTS** on the server (API key never exposed to the browser).
- **Fallback:** **Web Speech API** when the backend is unavailable, `AUDIO_PLAYBACK_MODE=browser`, or OpenAI errors.
- **Single player:** one active clip or utterance app-wide (`chatAudioManager`).
- **Fast UX:** preload after assistant text is rendered; tap should feel instant when cache hits.

## Layers

```
UI (AssistantMessageListenButton, ChatMessageBubble, GuidedConversationThread, PracticeChatThread)
    ↓ tap / lifecycle
chatAudioManager (singleton: state, HTMLAudio + SpeechSynthesis, abort, pause/resume)
    ↓ HTTP when OpenAI path enabled
POST {API_BASE}/api/audio/tts  →  Azure Function route `audio/tts` (alias: `audio/generate`)
    ↓
OpenAiTextToSpeechService  implements  ITextToSpeechService
    ↓ optional
LRU memory cache + optional disk directory (see env below)
```

## Provider selection (client)

| `NEXT_PUBLIC_AUDIO_PLAYBACK_MODE` | Behavior |
|-----------------------------------|----------|
| `openai` | Server TTS only; no browser fallback for playback. |
| `browser` | Browser `SpeechSynthesis` only. |
| `auto` | Try server TTS first; on failure or missing config, use browser if supported. |

**Defaults:** If `NEXT_PUBLIC_AUDIO_PLAYBACK_MODE` is unset, `NEXT_PUBLIC_AUDIO_TTS_MODE` is mapped (`server` → `openai`). If both unset, **`auto` when `NEXT_PUBLIC_API_BASE_URL` is set**, else **`browser`**.

Facade: `src/lib/audio/assistantAudioPlayback.ts` exposes `playMessageAudio`, `preloadMessageAudio`, `getPlaybackState`, `stop`, `pause`, `resume` — all delegate to `chatAudioManager`.

## Backend TTS

- **Interface:** `ITextToSpeechService` in `backend/src/services/audio/textToSpeechContracts.ts`.
- **Implementation:** `OpenAiTextToSpeechService` in `backend/src/services/audio/openAiTextToSpeechService.ts`.
- **HTTP:** `POST` body: `text`, optional `language`, `voice`, `speed`, `messageId`, `threadId`. Response: `mimeType`, `audioBase64`, `audioUrl` (data URL), `provider: "openai"`, `cached: boolean`.
- **Caching:** SHA-256 over normalized text + model + voice + language + speed. In-memory LRU (128). Optional disk files when `AUDIO_TTS_DISK_CACHE_DIR` is set.
- **Swap to Azure Blob later:** keep generating bytes in `OpenAiTextToSpeechService`; replace persistence layer with blob put/get keyed by the same hash (documented extension point).

## Shared UI

- **`AssistantMessageListenButton`** (`src/components/assistant-audio/AssistantMessageListenButton.tsx`): loading / playing / paused states, optional playing bars, uses global manager.
- **Talk (Feature1):** `ChatMessageBubble` embeds the button; `TrainStationChatPage` preloads AI lines and passes `playbackThreadId`.
- **Guided scenarios:** `GuidedConversationThread` uses the same button; composer “Listen / slow” calls `chatAudioManager.playOrToggle` with `slow` for client-side slower delivery (`playbackRate` or browser utterance rate).
- **Open practice:** `PracticeChatThread` preloads and shows the same control.

## Message lifecycle

1. Assistant message appears (text only — never blocked on audio).
2. `chatAudioManager.preload(messageId, text, audioUrl?, threadId?)` runs from page `useEffect` (fire-and-forget).
3. User taps Listen → `playOrToggle` → inline `audioUrl` if present, else cached data URL, else `POST /api/audio/tts`, else browser TTS (if allowed).
4. Starting a new message stops the previous source (`stop()` clears `<audio>` and `speechSynthesis`).

## Known limitations

- OpenAI TTS returns **MP3 as base64** data URLs — fine for short replies; very long audio increases payload size.
- **Browser TTS** quality and Dutch voices vary by OS.
- `speed` on OpenAI is **not** applied for `gpt-4o-mini-tts` (SDK constraint); slow mode still uses client `playbackRate` / browser rate when using cached MP3.

## Future enhancements

- Stream audio (chunked URL) instead of inline base64.
- Per-user voice preference persisted server-side.
- Azure Cognitive Services / ElevenLabs as alternate `ITextToSpeechService` implementations.
