# Pronunciation Analysis — Deep-Dive Specification

## 1. Purpose

Pronunciation Analysis gives learners feedback on their Dutch pronunciation (phoneme accuracy, stress, fluency) after speaking. It is premium-only and requires microphone consent. Feedback is displayed in the UI and persisted per a defined standard (IS-025). This spec covers FD-06: trigger points, API, persistence, and graceful failure when the pronunciation service is unavailable.

## 2. Core Concept

- **Pronunciation service**: External API (e.g. Azure) that accepts user audio and returns scores and tips (phoneme-level, stress, fluency).
- **Trigger**: After a voice turn (FD-04) or in a dedicated “Pronunciation practice” exercise; gate by entitlement and microphone consent (FD06-FR-003).
- **Persistence**: Scores and tips stored and linked to user/level (IS-025); used for progress and feedback history (FD-11).

## 3. Why This Feature Exists

- **Premium value**: Differentiator; learning efficacy through targeted feedback.
- **Standard**: IS-025 defines a consistent scoring/feedback standard (Backend/Speech spec).

## 4. User / Business Problems Solved

- Learners know which sounds or patterns to improve.
- Business reinforces premium value; data can drive adaptive content.

## 5. Scope

### 6. In Scope

- Call pronunciation service with user audio; receive and display feedback (score, tips) (FD06-FR-001).
- Persist pronunciation results and link to user/level (FD06-FR-002).
- Gate by entitlement and microphone consent (FD06-FR-003).
- Handle service failure gracefully: no feedback; retry option (FD06-FR-004).
- Optional: replay and compare (UI); very short utterance → prompt to speak longer.

### 7. Out of Scope

- Building the pronunciation engine itself (external API); this spec integrates it.
- Voice conversation flow (FD-04); pronunciation can be invoked at end of voice session or in standalone exercise.
- Detailed phoneme taxonomy (defined in Backend/Speech spec and IS-025).

## 8. Main User Personas

- **Premium learner**: Uses voice tutor or pronunciation practice; wants actionable feedback.
- **Exam candidate**: May use pronunciation practice for speaking component prep.

## 9. Main User Journeys

| Journey | Steps |
|--------|--------|
| **After voice turn** | End voice session (FD-04) → Optional pronunciation analysis → Score + tips shown; persisted. |
| **Dedicated practice** | Pronunciation practice → Record → Submit → Feedback (score, tips); persisted. |
| **Service down** | Submit → “Feedback unavailable”; retry or skip. |
| **Very short utterance** | “Please speak for a few seconds” and retry. |

## 10. Triggering Events / Inputs

- **From voice session**: POST /voice/end can trigger pronunciation analysis (FD-04); or separate POST /pronunciation/analyze with session_id or audio from last turn.
- **Standalone**: POST /pronunciation/analyze { audio }; entitlement and consent checked.
- **Input**: User audio (blob or URL from stored voice turn); optional context (e.g. target phrase or exercise_id).

## 11. States / Lifecycle

- **Not run**: User has not requested analysis for this utterance/session.
- **Pending**: Audio sent; waiting for service (sync or async).
- **Completed**: Result (score, tips) stored and shown.
- **Failed**: Service error; user sees “Feedback unavailable” and optional retry.

## 12. Business Rules

- **BFR-002**: Premium only (FD-06).
- **BFR-009**: Microphone consent required; consent and retention for audio (BR-4).
- **IS-025**: Defined standard for score and feedback format; Backend/Speech spec.
- **Retention**: Audio and results per Data doc and BR-4; optional short retention for audio if needed for replay.

## 13. Configuration Model

- **Pronunciation API**: Endpoint, auth, timeouts; config or env.
- **Score scale**: e.g. 0–100 or 0–1; same as IS-025.
- **Min utterance length**: Reject or prompt if audio too short (e.g. < 2s); configurable.
- **Feature flag**: Optional to disable pronunciation in certain regions or for A/B.

## 14. Data Model

- **pronunciation_results**: id, user_id, source (voice_session|pronunciation_exercise), source_id (session_id or exercise_id), audio_url_or_null (if stored), score, tips (JSONB or text), level_or_phrase, created_at. Retention per BR-4.
- **Consent**: From Profile (consents.microphone); audio storage may require explicit consent or separate flag (BR-4).

## 15. Read Model / Projection Needs

- **History**: List user’s pronunciation results for progress or “Pronunciation progress” view; optional.
- **FD-11**: Feedback can aggregate pronunciation scores from sessions for summary.

## 16. APIs / Contracts

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| POST | `/v1/pronunciation/analyze` | Submit audio for analysis | { audio (blob/base64), source?, source_id?, target_phrase? } | 200 { score, tips[], result_id }; 400 too short / invalid; 403 not entitled / no consent; 503 service unavailable |
| GET | `/v1/pronunciation/results` | User’s pronunciation history (optional) | Query: limit | 200 { results[] } |

**From voice end**: If pronunciation is part of voice session end, POST /voice/end can return pronunciation_result in response when analysis runs (sync or async); if async, return result_id and client polls or gets on next load.

## 17. Events / Async Flows

- **pronunciation_completed**: result_id, user_id, score (analytics).
- **pronunciation_skipped_failure**: user_id (analytics when service down).
- **Async**: Analysis can be async; client polls GET /pronunciation/results/:id or receives in webhook/push (optional).

## 18. UI / UX Design

- **Feedback display**: Score (e.g. 0–100 or “Good / Needs practice”); list of tips (e.g. “Focus on ‘g’ sound”); optional replay and compare.
- **Error**: “Feedback unavailable. Please try again.” and Retry button.
- **Short utterance**: “Please speak for a few seconds so we can analyze.” before sending to service.
- **Consent**: If consent missing, same as FD-04: message and redirect to Settings.

## 19. Main Screens / Components

- **PronunciationFeedbackCard**: Score, tips, replay (if audio stored and allowed).
- **PronunciationPracticeScreen**: Record → Submit → Feedback card or error.
- **VoiceSummaryScreen**: Can embed PronunciationFeedbackCard when pronunciation run at session end (FD-04).

## 20. Permissions / Security Rules

- **Entitlement**: Premium only; 403 if free user.
- **Consent**: Microphone (and optional audio storage); 403 if not granted.
- **User scope**: Only own results; no access to other users’ audio or results.

## 21. Notifications / Alerts / Side Effects

- **FD-11**: Pronunciation score and tips can be part of post-activity feedback.
- **Progress**: Stored for history; optional “Pronunciation progress” in profile or dashboard.

## 22. Integrations / Dependencies

- **Pronunciation API**: External service (Integrations doc); e.g. Azure Speech.
- **Entitlements**: Premium check.
- **Profile**: Microphone (and optional storage) consent.
- **FD-04 (Voice)**: Can trigger pronunciation at session end; pass audio or session reference.
- **FD-11 (Feedback)**: Consumes pronunciation result for aggregated feedback.
- **Data/BR-4**: Retention and consent for audio.

## 23. Edge Cases / Failure Cases

- **Service unavailable**: Return 503; “Feedback unavailable”; allow retry (FD06-FR-004).
- **Very short utterance**: 400 or client-side check; prompt to speak longer.
- **Audio format unsupported**: 400 with clear message.
- **Timeout**: Pronunciation API slow; timeout and return 503; retry.
- **No consent**: 403; do not send audio; message to enable in Settings.

## 24. Non-Functional Requirements

- **Latency**: Feedback within 5s of speech end (FD-06). Fallback when service down.
- **Availability**: Depends on external API; degrade gracefully (no feedback, retry option).

## 25. Analytics / Auditability Requirements

- **Events**: pronunciation_completed, pronunciation_skipped_failure. Include result_id, user_id, score; no raw audio in events.
- **Audit**: Results stored per retention; optional audit log for access.

## 26. Testing Requirements

- Unit: Entitlement and consent check; min length validation.
- Integration: POST analyze with mock audio; 200 with score/tips; 403 when not entitled; 503 when service mock fails.
- E2E: Pronunciation practice flow; error and retry.

## 27. Recommended Architecture

- **Speech service or dedicated Pronunciation module**: Calls external Pronunciation API; persists results; checks Entitlements and consent. Invoked from Voice service (FD-04) on session end or from standalone endpoint.
- **Async option**: Queue audio and process async; return result_id; client polls or gets result later.

## 28. Recommended Technical Design

- **API contract with provider**: Per Integrations doc; handle timeouts and retries (e.g. 1 retry); do not block voice end flow if pronunciation fails (return summary without pronunciation).
- **Persistence**: Store only result (score, tips); audio optional and subject to retention (BR-4).

## 29. Suggested Implementation Phasing

- **Phase 1**: POST /pronunciation/analyze; sync call to provider; display score and tips; entitlement and consent; persist result; handle 503.
- **Phase 2**: Integrate with voice session end (FD-04); optional pronunciation exercise type; history endpoint.
- **Phase 3**: Async analysis; replay and compare if audio stored; IS-025 full alignment and reporting.

## 30. Summary

Pronunciation Analysis provides premium-only, consent-gated feedback on user speech via an external API. Scores and tips are displayed and persisted (IS-025). Service failure is handled gracefully with “Feedback unavailable” and retry. Implementation must enforce entitlement and consent, respect retention (BR-4), and not block the main flow (e.g. voice end) when pronunciation fails.
