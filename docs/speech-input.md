# Speech input (Dutch dictation in chat)

Learners can **speak instead of typing** in the train-station composer. Capture is **short** (≤30s), **non-blocking**, and merges into the same textarea so the user can **edit before Send** — the send pipeline is unchanged.

## UX flow

1. Tap **mic** → recording starts (red pulse + timer).
2. **Browser mode:** live interim transcript appears under the controls. **Whisper mode:** audio only until stop.
3. Tap **stop** (square) → **processing** spinner → transcript is merged into the composer.
4. User edits text → **Send** as usual.

**Cancel** discards the session without changing the composer. **Re-record** (shown on errors) clears the error state and starts again.

## STT abstraction

| Layer | Role |
|--------|------|
| `SpeechService` (interface) | Contract in `speechInputTypes.ts` — document swap-in engines. |
| `BrowserSpeechSttSession` | Web Speech API, `nl-NL`, interim + final text. |
| `startMediaRecordingSession` | `MediaRecorder` + `getUserMedia` (echo/noise flags), auto-stop at 30s. |
| `transcribeSpeechAudio` | `POST /api/speech/transcribe` JSON body with base64 audio. |
| `useStickyVoiceInput` | Phase machine + merge into composer + edge-case handling. |

## Modes (`NEXT_PUBLIC_SPEECH_INPUT_MODE`)

| Value | When | Capture |
|-------|------|---------|
| `browser` (default) | Always if unset | Web Speech only (no mic file upload). |
| `server` | Backend + API URL | `MediaRecorder` → Whisper. Mic permission required. |
| `auto` | Backend + API URL | Prefer Whisper; on **mic permission denied**, fall back to browser captions. On Whisper **API failure**, show error with hint to re-record (no silent cross-network fallback). |

`server` / `auto` STT only runs when **Feature 1 chat** is on the backend (`NEXT_PUBLIC_FEATURE1_CHAT_SOURCE=backend` or API base URL default), same guard as TTS.

## Backend: `POST /api/speech/transcribe`

- **Body:** `{ audioBase64, mimeType, language? }` — base64 capped (~4.5 MiB binary) for JSON limits.
- **Implementation:** OpenAI **`whisper-1`** via `toFile` buffer upload (`backend/src/services/speech/whisperTranscribeService.ts`).
- **Errors:** `503` + `STT_UNAVAILABLE` without `OPENAI_API_KEY`.

## Latency & quality

- **Chunks:** `MediaRecorder` `timeslice` 250ms for progressive blob parts (single blob on stop).
- **MIME:** Prefers `audio/webm;codecs=opus`, then `audio/webm`, then `audio/mp4`.
- **Whisper:** Short clips keep API time predictable; empty transcript surfaces a friendly **re-record** message.

## Edge cases

| Case | Behavior |
|------|-----------|
| Permission denied | Error row; `auto` tries browser STT if supported. |
| No microphone / `NotFoundError` | Error message; re-record / dismiss. |
| Silence / empty transcript | Error + re-record (no empty send). |
| Stop during processing | AbortController cancels the HTTP transcribe call. |
| Navigate away | `useStickyVoiceInput` cleanup calls `cancelVoice()` (stops recorder / aborts recognition). |

## Frontend files

- `StickyChatComposer.tsx` — mic, status strip, wiring.
- `useStickyVoiceInput.ts` — orchestration.
- `browserSpeechStt.ts`, `mediaRecorderCapture.ts`, `speechClient.ts`, `speechInputTypes.ts`.
- `src/types/webkitSpeechRecognition.d.ts` — minimal typings.
- `apiConfig.ts` — `getSpeechInputMode()`.

## Acceptance checklist

- [ ] User can record and see transcript (live or after stop).
- [ ] Composer text is editable before send.
- [ ] Send uses existing `onSend` path.
- [ ] Works without backend (`browser`).
- [ ] Works with backend + key (`server` / `auto` + Whisper).
