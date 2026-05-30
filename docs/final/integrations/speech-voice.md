# Speech & Voice Integration

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

This document specifies **speech-to-text (STT)**, **text-to-speech (TTS)**, and **pronunciation analysis** for the AI Language Coach: voice conversation loop, listening content, and pronunciation feedback. It covers provider choice (Azure Speech, ElevenLabs), mobile web microphone capture, upload vs streaming, latency, and privacy of stored audio.

---

## 2. Why This Integration Is Needed

- **Voice tutor** (FD-04): User speaks in Dutch; system transcribes (STT), sends to LLM, speaks response (TTS).
- **Listening training** (FD-05): Pre-recorded or TTS-generated audio for comprehension exercises.
- **Pronunciation analysis** (FD-06): User speech is analyzed for accuracy and feedback (IS-025).

---

## 3. Product Capabilities Supported

- FD-04 (AI voice tutor), FD-05 (listening), FD-06 (pronunciation). Consent for microphone required (BFR-009). Audio retention short (Data doc, BR-4).

---

## 4. Decision Status

| Item | Status |
|------|--------|
| STT | **Required now** — Azure Speech |
| TTS | **Required now** — Azure Neural Voice (primary), ElevenLabs (optional alternative) |
| Pronunciation | **Required now** — Azure Pronunciation Assessment (or same Azure Speech) |
| Streaming vs upload | **Required now** — Define per use case below |

---

## 5. Recommended Providers

| Provider | STT | TTS | Pronunciation | EU region | Notes |
|----------|-----|-----|---------------|-----------|--------|
| **Azure Speech** | Yes | Yes (Neural) | Yes | Yes (westeurope, etc.) | Single integration; Dutch supported |
| **ElevenLabs** | No | Yes | No | Yes | High-quality voices; use as TTS alternative |

**Chosen**: **Azure Speech** for STT, TTS, and pronunciation (one subscription, one key). **ElevenLabs** optional for TTS if different voice quality desired; abstract behind TTS adapter.

---

## 6. High-Level Architecture

```mermaid
sequenceDiagram
  participant U as User
  participant C as Client
  participant API as Backend
  participant STT as Azure STT
  participant LLM as LLM
  participant TTS as Azure TTS
  participant Pron as Azure Pronunciation

  U->>C: Speaks
  C->>C: Capture audio (MediaRecorder / get_user_media)
  C->>API: POST /v1/voice/turn (audio blob or base64)
  API->>STT: Speech-to-text
  STT->>API: Transcript
  API->>LLM: Generate response (transcript)
  LLM->>API: Text
  API->>TTS: Text-to-speech (Dutch)
  TTS->>API: Audio URL or bytes
  API->>C: Transcript + audio URL
  C->>C: Play audio
  Optional: API->>Pron: Pronunciation assessment (same audio)
  Pron->>API: Score + feedback
  API->>C: (after turn or end) Pronunciation result
```

---

## 7. Frontend Responsibilities

### 7.1 Microphone Capture (Mobile Web)

- **API**: `navigator.mediaDevices.getUserMedia({ audio: true })`. Request only when user starts voice (e.g. first time in voice tutor); show in-app explanation before prompt (BFR-009).
- **Recording**: Use **MediaRecorder** with `mimeType: 'audio/webm;codecs=opus'` (Chrome) or `audio/mp4` (Safari). Fallback: check support; if no MediaRecorder, show "Voice not supported" and offer text.
- **Chunking**: Record in chunks (e.g. 5–10 s) and send to backend, or record until user stops (single blob). **Upload**: Send as multipart form or base64 in JSON; max size limit (e.g. 5 MB per request). **Streaming**: If backend supports streaming ingest, send chunks via WebSocket or chunked POST; reduces latency for long speech.
- **Never**: Send raw audio to any domain other than our API. Do not store audio in frontend beyond the current session buffer.
- **Permissions**: If user denies microphone, do not call backend; show "Voice needs microphone access" and link to Settings. Do not re-prompt repeatedly (permission fatigue).

### 7.2 Playback (TTS)

- **Backend returns**: Audio URL (signed or public) or base64 audio. **Client**: Use `<audio src={url}>` or AudioContext for playback. Show loading state until first byte; handle play failure (e.g. "Couldn't play response. Try again.").
- **Replay**: If "Replay" button, play same URL again (no new TTS call). **Speed**: If backend supports SSML or provider supports speed parameter, request 0.9x/1.1x from backend; or client-side playback rate if supported.

### 7.3 Browser Compatibility

| Browser | getUserMedia | MediaRecorder (webm/opus) | Notes |
|---------|--------------|---------------------------|--------|
| Chrome (Android) | Yes | Yes | Preferred |
| Safari (iOS) | Yes (HTTPS, user gesture) | Limited (mp4/aac) | Check mimeType support |
| Firefox | Yes | Yes | — |
| Edge | Yes | Yes | — |

**Fallback**: If MediaRecorder unsupported, show "Voice is not supported in this browser. Try Chrome or Edge."

---

## 8. Backend Responsibilities

- **STT**: Call Azure Speech REST or SDK with audio (binary). **Language**: `nl-NL` (Dutch). Return transcript and confidence if available. **Format**: Prefer webm/opus or wav; Azure accepts various formats (see Azure docs). Convert if needed (e.g. ffmpeg) or send as-is if supported.
- **TTS**: Call Azure Neural TTS or ElevenLabs with text and voice id (e.g. Dutch voice). **Output**: Save to temporary storage (or stream) and return URL to client; or return bytes. **Caching**: Cache TTS by (text, voice, speed) hash with TTL (e.g. 24 h) to reduce cost and latency for repeated phrases.
- **Pronunciation**: Call Azure Pronunciation Assessment with same audio; get score and word/phoneme-level feedback. Persist **result** (score, tips) in DB; do **not** persist raw audio beyond temporary processing (e.g. delete after 24 h or immediately after assessment). Return feedback to client (FD-06).
- **Sessions**: Create voice session on start; associate turns (transcript, audio ref) with session; on end, optionally run pronunciation on last N seconds of user audio; return session summary.

---

## 9. Upload vs Streaming Tradeoffs

| Approach | Latency | Complexity | Use case |
|----------|--------|------------|----------|
| **Upload full utterance** | User waits until stop; then STT+LLM+TTS | Lower | Simple; good for short turns (one sentence) |
| **Streaming upload** | Send chunks as user speaks; start STT when chunk ready | Lower perceived latency | Better UX for long speech; requires backend streaming ingest |
| **Streaming TTS** | Backend streams TTS bytes to client; client plays as received | First-byte faster | Preferred for TTS; implement if provider supports |

**Recommendation**: Phase 1: **upload full utterance** (record until user taps "Stop" or 30 s max). **Streaming TTS** if Azure supports it (stream response to client). Phase 2: Consider streaming STT (send chunks) for faster feedback.

---

## 10. Audio File Formats

| Direction | Format | Notes |
|-----------|--------|--------|
| Client → Backend (user speech) | webm/opus or wav | Azure accepts both; opus smaller. If Safari sends mp4, accept or convert. |
| Backend → Client (TTS) | mp3 or webm | Azure can return mp3; client plays in all browsers. |
| Pronunciation (input) | Same as STT input | Azure Pronunciation Assessment accepts same formats as STT. |

**Max size**: 5 MB per upload (e.g. ~30 s at 128 kbps). Reject with 413 if larger; ask user to speak shorter.

---

## 11. Required Credentials

| Credential | Purpose | Where | Frontend-safe? |
|------------|---------|--------|----------------|
| `INTEGRATION_AZURE_SPEECH_KEY` | Azure Speech (STT, TTS, Pronunciation) | Backend | No |
| `INTEGRATION_AZURE_SPEECH_REGION` | e.g. westeurope | Backend | No |
| `INTEGRATION_ELEVENLABS_API_KEY` | ElevenLabs TTS (if used) | Backend | No |

**Obtain**: Azure key from Azure Portal (Speech resource); ElevenLabs from dashboard. **Region**: Use EU (e.g. westeurope) for latency and data residency.

---

## 12. Environment Variables

| Variable | Example | Required |
|----------|---------|----------|
| `INTEGRATION_AZURE_SPEECH_KEY` | ... | Yes |
| `INTEGRATION_AZURE_SPEECH_REGION` | westeurope | Yes |
| `INTEGRATION_ELEVENLABS_API_KEY` | ... | If using ElevenLabs |
| `INTEGRATION_ELEVENLABS_VOICE_ID` | Dutch voice id | If using ElevenLabs |

---

## 13. Latency and UX Expectations

- **STT**: Target < 2 s after upload for short utterance (e.g. 5 s audio). Use regional endpoint.
- **TTS**: Target first byte < 2 s after LLM response; streaming preferred. If non-streaming, full audio in < 5 s for one sentence.
- **Pronunciation**: Can be async after turn; do not block next turn. Return result when ready (e.g. with session end or next request).
- **User-visible**: Show "Listening..." then "Thinking..." then "Speaking...". If timeout, "Something went wrong. Try again or use text."

---

## 14. When to Persist Audio vs Metadata Only

| Data | Persist? | Retention | Rationale |
|------|----------|-----------|-----------|
| **User speech (raw audio)** | No (or temp only) | Delete after STT + optional pronunciation (e.g. 24 h) | Privacy (BR-4); minimize storage |
| **TTS output** | Optional (cache by text hash) | 24 h cache | Reduce cost; no PII |
| **Transcript** | Yes | Per session; session retention per Data doc | For feedback and history |
| **Pronunciation result** | Yes (score, tips) | Per user progress | IS-025; no raw audio |
| **Session metadata** | Yes | Per Data doc | Analytics and support |

---

## 15. Failure Modes and Retries

- **Microphone denied**: Frontend does not call backend; show message and Settings link.
- **STT timeout/failure**: Retry once; if still fail, return 503 "Voice input failed. Try again or type your response."
- **TTS failure**: Retry once; if fail, return transcript only (degraded: "Voice unavailable; here’s the text.").
- **Pronunciation failure**: Do not block session; return "Pronunciation feedback unavailable this time." Log for monitoring.
- **Azure 429**: Retry after Retry-After; circuit breaker if sustained.

---

## 16. Security and Privacy

- **TLS**: All audio in transit over HTTPS. Backend → Azure over HTTPS.
- **Audio in logs**: Never log raw audio or transcript in plain text in production logs (PII). Log only duration, success/failure, provider.
- **GDPR**: Audio is personal data; lawful basis consent (BFR-009). Short retention; user can withdraw consent (then voice feature disabled). Document in privacy policy.

---

## 17. Testing

- **Unit**: Mock Azure responses; test adapter parsing.
- **Integration**: Send test audio file to STT/TTS in test env; verify transcript and audio output. Use Azure test resource.
- **Browser**: Test getUserMedia and MediaRecorder on Chrome and Safari (real or BrowserStack); test permission deny path.
- **Pronunciation**: Send sample Dutch audio; verify score and feedback shape.

---

## 18. Rollout

- Launch with Azure only; add ElevenLabs as optional TTS later if needed. Feature-flag voice tutor (FD-04) and pronunciation (FD-06) for gradual rollout.
- Monitor latency and error rate; set alerts for Azure downtime.

---

## 19. Risks and Open Questions

| Risk | Mitigation |
|------|------------|
| Safari MediaRecorder quirks | Test; document supported mimeTypes; fallback message |
| Azure outage | Circuit breaker; fallback to text-only for scenario |
| Cost (TTS per character) | Cache TTS; limit response length; fair-use cap |
| Stored audio leak | Do not persist raw user audio; temp only; lifecycle delete |

**Open questions**: (1) Streaming STT in Phase 2. (2) Multiple Dutch TTS voices (Azure offers several). (3) Pronunciation for non-Dutch (future multi-language).
