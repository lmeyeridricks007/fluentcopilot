# Speaking input (Talk composer)

## Goals

- **Primary path:** short **MediaRecorder** clip → **OpenAI Whisper** on the server (`POST /api/speech/transcribe`).
- **No auto-send:** transcript lands in the composer in a **`review`** state; the user edits and taps **Send** like a normal message.
- **Metadata:** optional `inputMode: "speech"` and `originalTranscript` stored on the user message (`MetadataJson`) when sent from review.
- **Fallback:** when `NEXT_PUBLIC_SPEECH_INPUT_MODE` is `auto` and the mic path fails, **browser Web Speech** can still be used (legacy resilience), not the primary design.

## Lifecycle

1. **Idle** — textarea + mic.
2. **Recording** — timer, live preview (browser path only), Stop, Cancel.
3. **Processing** — “Turning speech into text…” while Whisper runs.
4. **Review** — transcript in textarea; banner with **Discard** (restore text before mic), **Re-record**; optional **Azure / mock voice-quality** card (`POST /api/speech/pronunciation-assessment`, raw audio) when `NEXT_PUBLIC_SPEECH_AUDIO_ASSESSMENT` is on; optional **transcript-only LLM** card for browser/legacy when enabled.
5. **Send** — `consumeInputMetaForSend()` attaches `{ inputMode: "speech", originalTranscript }` once; normal `POST …/messages` (or stream) with `inputMeta`.

## Frontend modules

| Piece | Role |
|--------|------|
| `mediaRecorderCapture.ts` | `startMediaRecordingSession()` — `MediaRecorder`, max duration from `getMaxRecordingDurationMs()`. |
| `useRecorder.ts` | Thin optional wrapper around the same session API. |
| `useStickyVoiceInput.ts` | State machine, Whisper + browser branches, review + `consumeInputMetaForSend`. |
| `StickyChatComposer.tsx` | Talk UI: voice strip, review banner, send wiring. |
| `speechClient.ts` | `transcribeSpeechAudio` → `/api/speech/transcribe`; `requestPronunciationAssessment` → `/api/speech/pronunciation-assessment`. |

## Backend

| Piece | Role |
|--------|------|
| `ISpeechToTextService` | `speechToTextContracts.ts` |
| `OpenAiSpeechToTextService` | `openAiSpeechToTextService.ts` — model from `OPENAI_STT_MODEL` (default `whisper-1`), `verbose_json` for duration when Whisper. |
| `whisperTranscribeService.ts` | Delegates to `OpenAiSpeechToTextService` for backward imports. |
| HTTP `speech/transcribe` | Base64 JSON body; optional `threadId`, `scenarioId`, `purpose`; max size from `AUDIO_UPLOAD_MAX_MB`. |
| HTTP `speech/pronunciation-assessment` | Raw audio + `assessmentMode` (`reference` \| `open_response`); `PRONUNCIATION_MODE=off\|mock\|azure`. See [pronunciation-assessment-architecture.md](./pronunciation-assessment-architecture.md). |
| `sendConversationMessage` | Accepts optional `inputMeta`; persisted on user row metadata. |

## Multipart uploads

Not implemented on Azure Functions in this iteration: the production contract is **JSON + base64** for simplicity and parity with existing clients. A future version can add `multipart/form-data` parsing and stream files to temp storage without changing `ISpeechToTextService` (it already takes a `Buffer`).

## Known limitations

- **Payload size:** base64 audio in JSON; keep clips short (`NEXT_PUBLIC_MAX_RECORDING_SECONDS`, `AUDIO_UPLOAD_MAX_MB`).
- **Guided / other composers** still use their own voice UX; Talk uses `StickyChatComposer` as the reference implementation.
