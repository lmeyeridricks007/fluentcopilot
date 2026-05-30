# Speech & Voice — Integration Deep-Dive

**Integration**: Strategy (Azure Speech Services primary; ElevenLabs for TTS option).  
**Version**: 1  
**Status**: Implementation-grade

---

## 1. Purpose

Specify **speech integration** for the AI Dutch Coach: Speech-to-Text (STT) for voice tutor (FD-04), Text-to-Speech (TTS) for Dutch (and optionally English) responses, and Pronunciation Assessment (FD-06). Covers adapter design, auth, failure handling, local/staging/production, and observability.

---

## 2. Core Concept

- **STT**: User speaks in Dutch (or other locale); backend receives audio (or stream), sends to provider, receives transcript; transcript is input to LLM for conversation/voice turn.
- **TTS**: LLM response text is sent to TTS provider; backend receives audio URL or stream and returns to client for playback.
- **Pronunciation**: User speaks a phrase; backend sends audio + reference text to pronunciation API; receives score and tips; persist and display in Pronunciation feedback UI.

---

## 3. Why This Integration Exists

- **Voice tutor (FD-04)**: Spoken Dutch practice with AI; requires STT (user speech → text) and TTS (AI text → speech).
- **Pronunciation (FD-06)**: Phoneme/stress/fluency feedback after speech; requires pronunciation assessment API (e.g. Azure).

---

## 4. Business Capabilities Enabled

- **Voice conversation**: User speaks; app transcribes, sends to LLM, synthesizes AI reply as audio.
- **Pronunciation feedback**: Score and tips after user records a phrase; stored and shown in feedback UI.

---

## 5. Scope

### 6. In Scope

- STT: Submit audio (wav/ogg/base64 or stream); return transcript; support Dutch (and optionally en) locale.
- TTS: Submit text, voice_id/locale; return audio URL or stream; Dutch voice(s).
- Pronunciation: Submit audio + reference text; return score, dimension scores, tips.
- Adapter per provider (Azure STT/TTS/Pronunciation; ElevenLabs TTS); backend only; no client-side provider keys.
- Local dev: mock adapter (return fixed transcript/audio URL) or test Azure key.

### 7. Out of Scope

- Real-time streaming STT/TTS in first phase (can be batch); client-side-only speech (no backend). Speaker diarization; custom voice cloning.

---

## 8. Triggering Flows / Usage Points

| Trigger | Flow |
|---------|------|
| POST /v1/voice/turn (audio) | Backend receives audio → STT adapter → transcript → LLM → TTS adapter → audio URL/stream → return to client. |
| POST /v1/pronunciation/analyze | Backend receives audio + reference_text → Pronunciation adapter → score, tips → persist → return. |

---

## 9. Inputs

- **STT**: audio (binary or base64), locale (e.g. nl-NL), optional format (wav, ogg).
- **TTS**: text, voice_id or locale (e.g. nl-NL), format (mp3, wav).
- **Pronunciation**: audio, reference_text, locale.

---

## 10. Outputs

- **STT**: { transcript: string, confidence? }
- **TTS**: { audio_url: string } or stream (Content-Type audio/*).
- **Pronunciation**: { score: number, dimensions?: {}, tips: string[] }

---

## 11. Data Domains Involved

- **Voice sessions**: session_id, user_id, turns (transcript, audio_url); audio may be stored in object storage or temporary URL.
- **Pronunciation results**: user_id, reference_text, score, tips, created_at; linked to activity.

---

## 12. Source of Truth Rules

- **Transcripts**: We persist STT output (and LLM response) for conversation history and feedback; audio may be ephemeral or retained per policy (BR-4, retention).
- **Pronunciation**: We persist scores and tips; audio retention per policy.

---

## 13. Authentication Model

- **Azure**: Subscription key or token (OAuth). Stored in env (AZURE_SPEECH_KEY, AZURE_SPEECH_REGION). Backend only.
- **ElevenLabs**: API key in header. Stored in env (ELEVENLABS_API_KEY, VOICE_ID). Backend only.
- **Our API**: Voice and pronunciation endpoints require auth and entitlement/consent (microphone).

---

## 14. Authorization / Consent Model

- **Microphone**: Consent required (FD-04, FD-06); check consent before STT or pronunciation. Entitlement: voice tutor and pronunciation may be premium/trial only.

---

## 15. Configuration Model

| Key | Type | Description |
|-----|------|-------------|
| AZURE_SPEECH_KEY | string | Azure Speech subscription key |
| AZURE_SPEECH_REGION | string | e.g. westeurope |
| ELEVENLABS_API_KEY | string | Optional TTS alternative |
| ELEVENLABS_VOICE_ID | string | Dutch voice id |
| TTS_PROVIDER | string | azure \| elevenlabs |
| SPEECH_LOCALE_DEFAULT | string | nl-NL |

---

## 16. Environment Strategy

| Env | Setup |
|-----|--------|
| **Local** | Mock adapter (fixed transcript, static audio URL) or Azure free-tier key. No real audio in CI. |
| **Staging** | Azure test key; optional ElevenLabs test. |
| **Production** | Azure (EU region if available); live keys. |

---

## 17. Data Flow Design

- **Voice turn**: Client uploads audio → Backend validates size/format → STT → LLM (with transcript) → TTS (with LLM response) → Store transcript and audio URL in session → Return transcript + audio URL to client.
- **Pronunciation**: Client uploads audio + reference_text → Backend → Pronunciation API → Persist result → Return score and tips.

---

## 18. Sync / Polling / Webhook Design

- **Sync**: STT, TTS, and Pronunciation are request/response. No webhooks from speech providers for these flows.
- **Async**: Optional: queue long TTS or large audio; return job id and poll for result. Phase 1 can be sync only.

---

## 19. Failure Handling

| Failure | Handling |
|---------|----------|
| STT/TTS/Pronunciation 5xx or timeout | Retry once (2s backoff); return 503 to client with “Voice service temporarily unavailable.” |
| Invalid audio format | Return 400. |
| Quota exceeded (429) | Return 429 “Too many requests”; client can retry later. |
| Unsupported locale | Return 400 or use default locale. |

---

## 20. Retry Strategy

- One retry with 2s backoff for 5xx and timeouts. No retry for 4xx (except 429 with Retry-After).

---

## 21. Rate Limiting / Quota Considerations

- **Provider**: Azure and ElevenLabs have per-key limits. Apply per-user rate limits (e.g. N voice turns per minute) to avoid exhaustion and cost.
- **Our API**: Rate limit POST /voice/turn and POST /pronunciation/analyze per user (e.g. 10/min for premium).

---

## 22. Security / Compliance Requirements

- **Secrets**: Keys in env/vault; never in client. Audio in transit over HTTPS.
- **Audio**: Minimize retention if not needed; comply with BR-4 and privacy policy. Do not log raw audio.

---

## 23. Auditability / Logging Requirements

- Log: Request (user_id hashed, locale, duration/length); success/error; latency; provider. Do not log audio content or full transcript in production (or redact).

---

## 24. Observability / Monitoring

- **Metrics**: Request count by endpoint (STT, TTS, pronunciation); latency; error rate; provider usage.
- **Alerts**: Error rate > threshold; provider 5xx.

---

## 25. UI / UX Implications

- **Voice**: Show “Listening…” and “Processing…” states; on error “Voice unavailable. Try again or type.” Accessible controls (IS-011).
- **Pronunciation**: Show score and tips clearly; optional replay of user audio.

---

## 26. Admin / Operations Implications

- **Config**: Switch TTS provider or voice via config. Monitor quota usage in provider dashboards.

---

## 27. API / Adapter Design

- **Interfaces**: `STTAdapter.transcribe(audio, locale) → { transcript }`; `TTSAdapter.synthesize(text, voice/locale) → { audio_url }`; `PronunciationAdapter.assess(audio, reference_text, locale) → { score, tips }`.
- **Implementations**: AzureSpeechAdapter (STT, TTS, Pronunciation); ElevenLabsTTSAdapter. Backend selects by config.

---

## 28. Event / Async Flow Design

- Sync request/response. Optional async job for heavy TTS (long text) with poll or webhook for completion.

---

## 29. Data Persistence Requirements

- **Voice turns**: transcript, audio_url (or reference to object storage), role, created_at in conversation/session.
- **Pronunciation**: user_id, reference_text, score, tips, created_at; audio optional (retention policy).

---

## 30. Local Development Setup

- **Mock adapter**: Return fixed transcript (“Mock Dutch transcript”) and static audio URL (e.g. placeholder mp3). No provider key. Env: SPEECH_MOCK=true.
- **Real**: Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION (Azure free tier); use real STT/TTS for dev. Stripe CLI not applicable; use small audio samples to stay within quota.

---

## 31. Testing Requirements

- **Unit**: Adapter parses provider response; mock returns expected shape.
- **Integration**: With mock: voice turn returns transcript + URL; pronunciation returns score. With real key: send short audio, assert transcript and audio URL present.
- **E2E**: User records → sees transcript and hears TTS reply (or mock playback).

---

## 32. Rollout / Feature Flag Strategy

- **Feature flag**: “voice_tutor_enabled”, “pronunciation_enabled” per region or cohort. TTS provider switch via config.

---

## 33. Example Scenarios

**Voice turn**: User sends 5s Dutch audio “Mag ik een koffie?” → STT returns “Mag ik een koffie?” → LLM returns “Natuurlijk! Wilt u hem hier of meenemen?” → TTS returns audio URL → Client plays audio and shows transcript.

**Pronunciation**: User sends audio + reference “Goedemorgen” → Pronunciation API returns score 85, tips ["Stress on 'goede'"] → Persist and show in UI.

---

## 34. Edge Cases

- **Silent or very short audio**: STT may return empty; validate minimum duration (e.g. 1s); return 400 or prompt “Please speak again.”
- **Very long audio**: Limit upload size (e.g. 30s); reject larger with 400.
- **Unsupported language**: Return 400 or use default locale and warn.

---

## 35. Recommended Technical Design

- **Backend**: SpeechService with STT, TTS, Pronunciation methods; adapter interface; Azure and ElevenLabs implementations. Validate audio format and size at API layer.
- **Storage**: TTS output can be temporary URL (provider-hosted) or uploaded to our object storage for retention; document policy.

---

## 36. Suggested Implementation Phasing

- **Phase 1**: Azure STT + TTS for voice tutor; mock for local; sync only.
- **Phase 2**: Pronunciation (Azure); ElevenLabs TTS option; rate limits and cost tracking.
- **Phase 3**: Streaming if needed; multiple voices.

---

## 37. Summary

**Speech & voice** is **strategy-based** (Azure primary; ElevenLabs for TTS option). STT, TTS, and Pronunciation run **backend-only** with provider keys in env. **Mock adapter** for local dev; failure handling and rate limits applied. Consent and entitlement required for voice and pronunciation endpoints. Observability and security (no keys in client, minimal logging of audio) are required.
