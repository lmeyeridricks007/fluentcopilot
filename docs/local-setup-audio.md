# Local setup — assistant audio (OpenAI TTS)

## Frontend

Set in `.env.local` (or your deployment env):

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | Azure Functions base, e.g. `http://localhost:7071` |
| `NEXT_PUBLIC_FEATURE1_CHAT_SOURCE` | `backend` when exercising real APIs |
| `NEXT_PUBLIC_AUDIO_PLAYBACK_MODE` | `auto` (default when base URL set), `openai`, or `browser` |

Legacy: `NEXT_PUBLIC_AUDIO_TTS_MODE` (`server` \| `browser` \| `auto`) is still read as a fallback mapping to the new mode.

## Backend (`backend/local.settings.json` or App Settings)

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | Required for TTS (and other OpenAI features). **Server only.** |
| `OPENAI_TTS_MODEL` | Optional. Default `tts-1-hd`. Alternatives: `tts-1`, `gpt-4o-mini-tts`. |
| `OPENAI_TTS_VOICE` | Optional. Default `coral` (clear assistant tone). See OpenAI TTS voice list. |
| `AUDIO_CACHE_ENABLED` | Optional. Default on. Set `false` / `0` / `no` to skip cache. |
| `AUDIO_TTS_DISK_CACHE_DIR` | Optional. Absolute path to persist MP3s between cold starts (local dev). |

## Quick test

1. Start Functions: `cd backend && npm run start` (or your usual host).
2. Start Next with `NEXT_PUBLIC_API_BASE_URL` pointing at the host.
3. Open Talk or a guided scenario; wait for an assistant line; tap **Listen** — first play may fetch TTS; second should hit cache (`cached: true` in network response).

## Troubleshooting

- **503 `TTS_UNAVAILABLE`:** missing `OPENAI_API_KEY` on the Functions host.
- **Browser only:** `NEXT_PUBLIC_AUDIO_PLAYBACK_MODE=browser`, or no API base URL, or `openai` mode with failed server (then no fallback).
- **CORS:** ensure Functions `Host.CORS` includes your Next origin (see existing `local.settings.json`).
