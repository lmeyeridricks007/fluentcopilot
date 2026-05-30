# Local setup — speaking input

## Backend (Azure Functions / `local.settings.json`)

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | Required for Whisper. |
| `OPENAI_STT_MODEL` | Optional. Default `whisper-1`. Other OpenAI STT models may omit `verbose_json` duration. |
| `AUDIO_UPLOAD_MAX_MB` | Optional. Max decoded audio size per request (default 12, cap 25). |

## Frontend (`.env.local`)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | Functions host, e.g. `http://localhost:7071` |
| `NEXT_PUBLIC_FEATURE1_CHAT_SOURCE` | `backend` to use real transcribe + send |
| `NEXT_PUBLIC_SPEECH_INPUT_MODE` | `server` / `auto` / `browser` — prefer `server` or `auto` for Whisper |
| `NEXT_PUBLIC_MAX_RECORDING_SECONDS` | Clip length cap (default 60, max 300) |
| `NEXT_PUBLIC_AUDIO_UPLOAD_MAX_MB` | Client-side base64 size hint (align with backend) |

## Quick test (Talk)

1. Run backend with `OPENAI_API_KEY` set.
2. Open a Talk thread with backend chat enabled.
3. Tap mic → speak Dutch → Stop → wait for transcript → edit if needed → **Send**.
4. Confirm in DevTools Network: `POST …/speech/transcribe` then `POST …/messages` with body containing `inputMeta` when sent from review.

## Troubleshooting

- **Browser-only:** no API base URL or `SPEECH_INPUT_MODE=browser`.
- **403 / STT_UNAVAILABLE:** missing API key on the host.
- **Clip too large:** shorten recording or raise `AUDIO_UPLOAD_MAX_MB` / lower quality.
