# Speak Live — real-time scenario conversation (v1)

## Product intent

Speak Live is a **single** voice-first practice mode: the learner picks a **scenario** (e.g. train station) and level, then holds a real-time Dutch conversation grounded in that scene. There is **no Guided vs Free choice** in this surface; pacing and goals are handled by backend **Speak Live FSM + scenario grounding** on a `speak_live` conversation thread.

## User flow

1. **Entry** (`/app/talk/live`) — `LiveSpeakEntryScreen`: scenario + CEFR level → **Enter live conversation**.
2. **Bootstrap** — `POST /conversations/start` with `conversationSurface: 'speak_live'` and `mode: 'free'` (API compatibility; live UX is unified).
3. **Live session** (`/app/talk/live/run`) — `LiveConversationScreen`:
   - **Listening** — default matches Talk dictation: **`MediaRecorder`** via `startMediaRecordingSession` → **`POST /speech/transcribe`** → `POST /speak-live/turn` with **transcript only**. Optional: set `NEXT_PUBLIC_SPEAK_LIVE_BROWSER_AZURE_STT=1` for browser **Azure Speech SDK** partials while holding the mic (same token route as before).
   - **Thinking** — `POST /speak-live/turn` with **transcript** (normal path) or `audioBase64` (legacy): persisted user message + assistant reply + **TTS** (Azure Neural when `SPEAK_LIVE_TTS_PROVIDER=azure` and Azure creds exist, else OpenAI TTS).
   - **Speaking** — `<audio>` plays returned `audioUrl` (typically `data:audio/mpeg;base64,...`).
4. **Controls** — mute assistant, pause, switch to **text thread** (same `threadId`), **End** (confirmation sheet).
5. **End** — **End and evaluate** → `POST /conversations/{id}/end` → **voice coach report** `/app/talk/live/session/{threadId}/evaluation` (premium evaluation UI). Text recap remains at `/app/talk/live/recap/{threadId}` (`SpeakLiveSessionRecapView`).

## Dev / mock behavior

- **No API** (`NEXT_PUBLIC_FEATURE1_CHAT_SOURCE` not `backend` or no base URL): immersive run shows **Speak Live backend required** (no fake assistant by default).
- **Optional legacy prototype**: set `NEXT_PUBLIC_SPEAK_LIVE_DEV_UI_MOCK=1` to restore the old browser-TTS canned-line call screen without the API.

## Environment variables (summary)

| Layer | Variable | Role |
|-------|-----------|------|
| Frontend | `NEXT_PUBLIC_API_BASE_URL` | Functions host |
| Frontend | `NEXT_PUBLIC_FEATURE1_CHAT_SOURCE=backend` | Real HTTP pipeline |
| Frontend | `NEXT_PUBLIC_SPEAK_LIVE_BROWSER_AZURE_STT=1` | Enable browser Azure partials while holding mic |
| Backend | `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` | Token issuance + Azure STT/TTS |
| Backend | `SPEECH_TO_TEXT_PROVIDER` | Server STT when audio path used |
| Backend | `SPEAK_LIVE_TTS_PROVIDER=azure\|openai` | Assistant playback for `/speak-live/turn` |
| Backend | `AZURE_SPEAK_LIVE_VOICE` | Dutch (NL) neural voice (default `nl-NL-FennaNeural`, female) |
| Backend | `AZURE_SPEAK_LIVE_EXPRESS_AS_ROLE` | Optional Azure SSML `express-as` role (e.g. `YoungAdultFemale`). **Unset** = plain Dutch female neural (default, natural). `none` forces off. |
| Backend | `SPEAK_LIVE_OPENAI_TTS_VOICE` | OpenAI voice when Azure TTS is off (default `nova`; native Dutch is Azure path above) |
| Backend | `OPENAI_API_KEY` | LLM + OpenAI TTS fallback |

See `docs/live-speak-architecture.md` for orchestration detail.
