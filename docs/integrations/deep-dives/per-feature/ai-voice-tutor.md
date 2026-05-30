# AI Voice Tutor — Per-Feature Integration Specification

**Feature**: FD-04 AI Voice Tutor  
**Source**: docs/final/feature-domain-breakdown.md §6; docs/features/deep-dives/ai-voice-tutor.md

---

## 1. Purpose

This document specifies **which integrations the AI Voice Tutor feature uses** and **how**: STT, TTS, LLM, content moderation, entitlement/cache, optional pronunciation assessment, and analytics. It enables implementers to wire the voice conversation flow and operate it in local, staging, and production.

---

## 2. Feature Reference

- **Domain**: FD-04 AI Voice Tutor
- **User goal**: Have a spoken Dutch conversation with AI; get corrections and feedback.
- **Business goal**: Premium differentiation; retention; speech practice at scale.
- **Integration dependencies** (from feature-domain-breakdown): STT, TTS, LLM; Pronunciation service if feedback in-session (FD-06).

---

## 3. Integrations Used (Summary)

| Integration | Role in AI Voice Tutor | Criticality |
|-------------|-------------------------|-------------|
| **Speech (STT)** | Transcribe user audio to text for LLM input | Critical |
| **Speech (TTS)** | Synthesize AI reply text to audio for playback | Critical |
| **LLM orchestration** | Generate AI reply from transcript (and context); then TTS speaks it | Critical |
| **Content moderation** | Moderate LLM output before TTS and persist (IS-017) | Critical |
| **Cache / Entitlements** | Gate: premium/trial only (BFR-002); microphone consent | Critical |
| **Speech (Pronunciation)** | Optional: after session or turn, assess pronunciation (FD-06) | P1 |
| **Analytics** | voice_session_started, voice_turn_completed, voice_session_ended, voice_fallback_used | High |

---

## 4. Per-Integration Detail

### 4.1 Speech-to-Text (STT)

- **Why this feature needs it**: User speaks; we need text to send to LLM. STT converts audio (from client upload or stream) to transcript.
- **Data flow**: Client POST /v1/voice/turn with audio (binary or base64). Backend sends audio to STT adapter with locale (e.g. nl-NL); receives transcript; passes transcript to LLM (same request or pipeline). Transcript persisted in turn (with moderated LLM response).
- **Triggering**: Every voice turn that includes user speech (POST /v1/voice/turn with audio). If user types instead of speaks, STT not used.
- **Auth**: Backend STT credentials (Azure/ElevenLabs); request must be authenticated user with entitlement and microphone consent.
- **Failure**: STT 5xx/timeout → retry once; then 503 “Voice service temporarily unavailable”, suggest “Try typing.” See [speech-voice.md](../../speech-voice.md) § Failure Handling.
- **Local**: Mock STT adapter (fixed transcript e.g. “Mock Dutch transcript”) or Azure test key. See [speech-voice.md](../../speech-voice.md) § Local Development Setup.
- **Observability**: STT request count, latency, error rate. See main deep-dive.
- **Reference**: [speech-voice.md](../../speech-voice.md)

### 4.2 Text-to-Speech (TTS)

- **Why this feature needs it**: LLM returns text; user hears AI reply. TTS synthesizes Dutch (and optionally English) audio for playback.
- **Data flow**: After LLM response (and moderation pass), backend sends text to TTS adapter; receives audio URL or stream; returns to client in response (audio_url or stream). Client plays audio.
- **Triggering**: Every voice turn after LLM returns (and moderation pass). Same request or chained: STT → LLM → moderate → TTS → response.
- **Auth**: Backend TTS credentials. Request authenticated; entitlement and consent already checked at session start.
- **Failure**: TTS 5xx → retry once; else 503; optionally return text-only so client can show transcript. See [speech-voice.md](../../speech-voice.md).
- **Local**: Mock TTS (static audio URL or short placeholder). See [speech-voice.md](../../speech-voice.md).
- **Observability**: TTS request count, latency, error rate. See main deep-dive.
- **Reference**: [speech-voice.md](../../speech-voice.md)

### 4.3 LLM Orchestration

- **Why this feature needs it**: Generates the reply text from user transcript (and conversation history, topic, level). Same as scenario flow but for voice; response is then spoken via TTS.
- **Data flow**: Backend builds messages (system: voice tutor persona, level, topic; user: transcript). Calls LLM; receives content → moderate → then TTS. No separate “scenario” entity; voice session has topic/level only (or linked to scenario if voice-enabled scenario).
- **Triggering**: Every voice turn after STT (or after user text if hybrid). POST /v1/voice/turn.
- **Auth**: Backend API key. User auth and entitlement checked at session start.
- **Failure**: As in [llm-orchestration.md](../../llm-orchestration.md); 503 and fallback message; optional retry and fallback provider.
- **Local**: Mock LLM or test key. See [llm-orchestration.md](../../llm-orchestration.md).
- **Observability**: Token usage, latency, provider. See main deep-dive.
- **Reference**: [llm-orchestration.md](../../llm-orchestration.md)

### 4.4 Content Moderation

- **Why this feature needs it**: IS-017; all AI output (here: reply text before TTS) must be moderated before persist and before speaking to user.
- **Data flow**: After LLM returns content, run ModerationService.check(content). If block: do not call TTS with that content; return fallback message (and optional fallback audio or text-only); do not persist blocked content. If pass: send to TTS, persist, return.
- **Triggering**: Same request as LLM, before TTS and before persist.
- **Auth**: Backend. See [content-safety-moderation.md](../../content-safety-moderation.md).
- **Failure**: Fail closed; treat as block. See main deep-dive.
- **Local**: Mock pass/block. See main deep-dive.
- **Reference**: [content-safety-moderation.md](../../content-safety-moderation.md)

### 4.5 Cache / Entitlements

- **Why this feature needs it**: Voice Tutor is premium/trial only (BFR-002). Also requires microphone consent. Must check before POST /v1/voice/start.
- **Data flow**: On voice/start: backend checks entitlement (tier) and consent (microphone). If free or no consent, return 403 with appropriate code; client shows upsell or consent prompt. Cache used for fast tier read.
- **Triggering**: POST /v1/voice/start; optional recheck on first turn if long-lived session.
- **Auth**: user_id from session; entitlement from DB/cache; consent from profile.
- **Failure**: Cache/DB down → 503 or fail closed (deny start). See [entitlements-subscription.md](./entitlements-subscription.md), [cache-session-store.md](../../cache-session-store.md).
- **Local**: Redis + seed premium/trial user; consent flag in test profile. See entitlements and cache deep-dives.
- **Reference**: [entitlements-subscription.md](./entitlements-subscription.md), [cache-session-store.md](../../cache-session-store.md)

### 4.6 Pronunciation (Optional)

- **Why this feature needs it**: Optional in-session or post-session pronunciation feedback (FD-06): send user audio + reference text, get score and tips.
- **Data flow**: After turn or on session end: backend sends audio (and reference text) to Pronunciation adapter; receives score and tips; persists and/or returns in summary. Can be same request or async.
- **Triggering**: POST /v1/voice/end with optional flag, or dedicated POST /v1/pronunciation/analyze.
- **Auth**: Backend speech credentials (Azure Pronunciation). User auth and consent.
- **Failure**: Pronunciation API down → skip feedback; show “Feedback unavailable.” See [speech-voice.md](../../speech-voice.md).
- **Local**: Mock pronunciation (fixed score/tips). See [speech-voice.md](../../speech-voice.md).
- **Reference**: [speech-voice.md](../../speech-voice.md)

### 4.7 Analytics

- **Why this feature needs it**: voice_session_started, voice_turn_completed, voice_session_ended, voice_fallback_used for engagement and fallback monitoring.
- **Data flow**: Backend sends events; fire-and-forget. See [analytics-provider.md](../../analytics-provider.md).
- **Triggering**: On start, on each turn (optional), on end, when fallback (text or error) used.
- **Local**: Mock or disable. See [analytics-provider.md](../../analytics-provider.md).
- **Reference**: [analytics-provider.md](../../analytics-provider.md)

---

## 5. Implementation Implications

- **Backend services**: Speech service (STT, TTS, optional Pronunciation); AI Conversation or dedicated Voice service (orchestrates STT → LLM → moderate → TTS); Entitlements for gate. All behind API.
- **Jobs/workers**: Optional: post-session pronunciation analysis or feedback generation (FD-11) in job.
- **DB tables**: voice_sessions, voice_turns (transcript, audio_url, moderated content); subscriptions, usage_counts; consent; optional pronunciation_results.
- **UI**: “Start voice”; recording state; playback of TTS; transcript display; “Voice unavailable” / “Try typing”; consent and upsell when not entitled.
- **Admin/config**: Voice topic/level options; STT/TTS locale and voice; entitlement gate; feature flag voice_tutor_enabled; fair-use cap if any.
- **Monitoring**: STT/TTS/LLM latency and errors; moderation blocks; 403 entitlement; fallback rate.
- **Seed/demo data**: Premium/trial user with consent; mock STT/TTS/LLM for E2E.
- **Testing**: Unit: mock all three (STT, LLM, TTS); assert flow and moderation. Integration: real or mock STT → LLM → TTS; entitlement 403. E2E: start voice, speak (or mock), hear reply. Mock: all speech and LLM.

---

## 6. Summary

AI Voice Tutor depends on **STT**, **TTS**, **LLM**, and **moderation** in the critical path per turn; **entitlements/cache** at session start; optional **pronunciation** for feedback; and **analytics** for events. Local dev uses mocks for speech and LLM; failure handling and observability align with the main integration deep-dives referenced above.
