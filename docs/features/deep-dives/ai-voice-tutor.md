# AI Voice Tutor — Deep-Dive Specification

## 1. Purpose

The AI Voice Tutor enables learners to have spoken Dutch conversations with an AI: TTS plays the AI prompt, the user speaks, STT converts to text, and the LLM generates a response played via TTS. It is premium-only and requires microphone consent. This spec covers FD-04: flow, entitlements, consent, fair-use, and integration with Speech, AI Conversation, and Pronunciation/Feedback.

## 2. Core Concept

- **Voice session**: Topic/level selected; loop of TTS → user speech → STT → LLM → TTS; optional transcript and corrections; session ends with summary and optional pronunciation/fluency feedback (FD-06, FD-11).
- **Premium only**: Gated by entitlement (BFR-002); trial treated as premium during trial period.
- **Fair use**: “Unlimited” premium subject to configurable caps (e.g. minutes or sessions per day) to control cost and abuse (FD04-FR-005).

## 3. Why This Feature Exists

- **Premium differentiation**: Core paid feature; retention and conversion.
- **Learning**: Speech practice at scale without a human partner; fluency and pronunciation (FD-06) integration.

## 4. User / Business Problems Solved

- Learners practice speaking in Dutch with immediate AI response.
- Business monetizes via premium; fair-use protects unit economics.

## 5. Scope

### 6. In Scope

- Start voice session: entitlement and microphone consent check; create session; optional topic/level/speed.
- Turn flow: TTS play → user speech (or type fallback) → STT → LLM → TTS; configurable speed; replay last utterance (FD04-FR-002).
- End session: persist; optional pronunciation analysis (FD-06); summary and feedback (FD-11); XP (Gamification).
- Fair-use limits: enforce caps (e.g. sessions per day or minutes) per user; configurable (FD04-FR-005).
- Fallback: If STT/TTS unavailable or user denies mic, offer text-based scenario (FD-03).

### 7. Out of Scope

- Pronunciation scoring detail (FD-06); voice tutor consumes pronunciation API only when configured at end of session.
- Scenario content (same as FD-03 scenarios; voice can use same scenario with voice input).
- Offline voice (not in scope; requires connectivity for STT/TTS/LLM).

## 8. Main User Personas

- **Premium learner**: Wants speaking practice; uses voice regularly within fair use.
- **Trial user**: Same access as premium during trial.
- **User without mic consent**: Sees message and text fallback.

## 9. Main User Journeys

| Journey | Steps |
|--------|--------|
| **Voice conversation** | Home “Voice conversation” → Check entitlement + consent → Select topic/level → TTS prompt → User speaks → STT → LLM → TTS (loop) → End → Summary + optional pronunciation feedback + XP. |
| **No entitlement** | User taps Voice → Upsell (FD-12). |
| **No consent** | Prompt for microphone once; if denied → message + offer text scenario. |
| **Replay / speed** | During session: replay last sentence; adjust TTS speed. |

## 10. Triggering Events / Inputs

- **Start**: POST /voice/start { topic?, level? }; entitlement + microphone consent; create session; return session_id.
- **Turn**: POST /voice/turn { session_id, audio_blob } or { session_id, text } (fallback); STT if audio; LLM; TTS; return audio URL or stream + transcript.
- **End**: POST /voice/end { session_id }; optional pronunciation analysis; persist; summary; trigger feedback and XP.
- **Replay**: Client replays last TTS from cache; or GET /voice/turn/:turn_id/audio if stored.

## 11. States / Lifecycle

- **Not started**: User has not started a voice session.
- **Active**: Session created; turns in progress; user can end or abandon.
- **Ended**: Summary and optional pronunciation/feedback; session persisted; fair-use count updated.
- **Abandoned**: User left without end; save up to last turn; optional “resume” or count for fair use.

## 12. Business Rules

- **BFR-002**: Premium or trial only; no free access (FD-04).
- **BFR-009**: Microphone consent required; gate at start.
- **IS-016**: AI indicated (e.g. “Speaking with AI” in UI).
- **Fair use**: Configurable cap (sessions/day or minutes/day); enforced at start and/or after end (FD04-FR-005).
- **Level**: A1–C1 (IS-003) for topic/difficulty.

## 13. Configuration Model

- **Topics**: List of voice topics or reuse scenario list; level filter.
- **Speed**: TTS speed option (e.g. 0.8x, 1x, 1.2x); stored in session or client preference.
- **Fair use**: Max sessions per day (e.g. 5) or max minutes per day (e.g. 30); product config.
- **Pronunciation**: On/off for end-of-session analysis (FD-06); consent and retention apply (BR-4).

## 14. Data Model

- **voice_sessions**: id, user_id, topic, level, status (active|ended|abandoned), started_at, ended_at, duration_seconds, turns_count, created_at, updated_at.
- **voice_turns**: id, session_id, role (user|assistant), input_audio_url_or_null, input_text (STT result or user text), output_text (LLM), output_audio_url, turn_index, created_at.
- **Usage**: voice_sessions_this_period or voice_minutes_this_period for fair use; in Entitlements or shared usage table.
- **Consent**: From Profile (consents.microphone); checked at start.

## 15. Read Model / Projection Needs

- **Session history**: List user’s voice sessions for “Continue” or history; optional.
- **Feedback**: FD-11 and FD-06 consume session and turns for feedback and pronunciation scores.

## 16. APIs / Contracts

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| POST | `/v1/voice/start` | Start voice session | { topic?, level?, speed? } | 201 { session_id, first_prompt_audio_url? }; 403 not entitled / no consent / fair-use cap |
| POST | `/v1/voice/turn` | Send audio or text; get AI reply (audio + transcript) | { session_id, audio? (blob/base64), text? } | 200 { reply_audio_url, transcript }; 403/404; 503 STT/TTS/LLM down |
| POST | `/v1/voice/end` | End session | { session_id } | 200 { summary, feedback_id?, pronunciation_result? }; 404 |
| GET | `/v1/voice/sessions` | List user sessions (optional) | Query: limit | 200 { sessions[] } |

**Streaming**: Optional: stream TTS audio chunks for lower latency; same contract with streamed response.

## 17. Events / Async Flows

- **voice_session_started**: session_id, user_id (analytics).
- **voice_turn_completed**: session_id, turn_index (analytics).
- **voice_session_ended**: session_id, duration, turns_count; triggers Gamification (XP), optional FD-06 (pronunciation), FD-11 (feedback).
- **voice_fallback_used**: User used text instead of speech (analytics).
- **Async**: Pronunciation analysis (FD-06) may be async; return summary first, pronunciation result when ready (poll or webhook).

## 18. UI / UX Design

- **Start**: “Start voice conversation”; topic/level picker; speed; mic permission prompt if not yet granted.
- **During**: Waveform or “Listening…” when user speaks; “AI is speaking” + optional transcript; Replay button; End button.
- **Fallback**: “Microphone unavailable” or “Speak didn’t work” → “Type instead” (text turn).
- **End**: Summary screen; optional pronunciation tips (FD-06); feedback (FD-11); XP.
- **High latency**: Loading indicator; consider streaming TTS for faster first byte.

## 19. Main Screens / Components

- **VoiceStartScreen**: Topic/level/speed; entitlement and consent check; start button.
- **VoiceConversationScreen**: Audio in/out; transcript; replay; end.
- **VoiceSummaryScreen**: Summary + feedback + pronunciation + XP.

## 20. Permissions / Security Rules

- **Entitlement**: Premium or trial only; 403 if free user.
- **Consent**: Microphone consent required; 403 if not granted (with message to enable in Settings).
- **User scope**: Only own sessions; session_id validated to user_id.

## 21. Notifications / Alerts / Side Effects

- **Gamification**: XP on session end.
- **FD-06**: Pronunciation result if enabled and consent/retention allow.
- **FD-11**: Feedback generated and linked.
- **Fair use**: Increment usage on end; next start may be blocked if at cap.

## 22. Integrations / Dependencies

- **Speech APIs**: STT, TTS (Integrations doc); Azure, ElevenLabs, or equivalent.
- **AI Conversation**: LLM for response generation; same or similar prompt pattern as FD-03.
- **Entitlements**: Premium/trial check; fair-use count and cap.
- **Profile**: Microphone consent (consents.microphone).
- **FD-06 (Pronunciation)**: Optional call at session end with last user audio or selected turns.
- **FD-11 (Feedback)**: Session and turns for fluency/feedback.

## 23. Edge Cases / Failure Cases

- **Microphone denied**: Show message; offer text scenario (FD-03).
- **STT/TTS failure**: Retry once; then “Something went wrong” and option to end or try again.
- **High latency**: Loading state; consider streaming TTS; timeout and retry.
- **Fair-use cap**: On start, 403 with reason; “You’ve reached your daily voice limit. Try again tomorrow.”
- **Session already ended**: POST /voice/turn → 403 or 404.
- **Audio too short**: STT may fail; prompt “Please speak longer” or allow text fallback.

## 24. Non-Functional Requirements

- **Latency**: TTS start < 2s after LLM response; STT result < 2s after speech end (FD-04). Fallback when speech services unavailable.
- **Rate limit**: Stricter on /voice/turn (e.g. 20/min) to control cost.
- **Availability**: Depends on STT, TTS, LLM; degrade with message and retry.

## 25. Analytics / Auditability Requirements

- **Events**: voice_session_started, voice_turn_completed, voice_session_ended, voice_fallback_used. Include session_id, user_id, duration, turns_count; no raw audio in events.
- **Retention**: Audio retention per Data doc (BR-4); optional for pronunciation; user consent and policy.

## 26. Testing Requirements

- Unit: Entitlement and consent check; fair-use cap logic.
- Integration: Start; turn (mock STT/TTS/LLM); end; 403 when not entitled or no consent; pronunciation and feedback triggered.
- E2E: Full voice flow (with mock or test STT/TTS); fallback to text; end and summary.

## 27. Recommended Architecture

- **Speech service**: Orchestrates STT, TTS, LLM; persists voice_sessions and voice_turns; calls Entitlements (start), Gamification (end), FD-06 and FD-11 (end). Uses Redis for session state if needed during turn handling.
- **APIs**: REST; optional WebSocket or chunked transfer for streaming TTS.

## 28. Recommended Technical Design

- **Audio**: Client sends audio as base64 or multipart; or record and send chunked. TTS response as URL (pre-signed) or stream. Prefer streaming for lower latency.
- **Idempotency**: End session idempotent.
- **Cost**: Meter by turn or minute; feed to fair-use and operations.

## 29. Suggested Implementation Phasing

- **Phase 1**: Start/turn/end with text-only turn (no STT) for testing; entitlement and consent; persist session.
- **Phase 2**: STT and TTS integration; audio turn; replay and speed; fair-use cap.
- **Phase 3**: Pronunciation (FD-06) and feedback (FD-11) at end; streaming TTS; analytics.

## 30. Summary

The AI Voice Tutor provides premium-only spoken Dutch practice with AI. Flow: TTS → user speech → STT → LLM → TTS, with optional replay and speed. Microphone consent and entitlement are required; fair-use caps limit sessions or minutes per day. Session and turns are persisted; on end, summary, optional pronunciation (FD-06), and feedback (FD-11) are produced and XP awarded. Implementation must enforce gating and consent server-side and handle STT/TTS/LLM failures and fallback to text gracefully.
