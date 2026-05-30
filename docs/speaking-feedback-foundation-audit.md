# Speaking feedback — current implementation audit

**Date:** 2026-04-12  
**Purpose:** Baseline for the upgraded Dutch speaking-coach stack (`docs/speaking-feedback-foundation.md`).

## End-to-end pipeline (today)

### 1. Frontend — recording & upload

| Area | Location | Behavior |
|------|-----------|----------|
| Voice capture | `src/lib/speech/useStickyVoiceInput.ts` | Server path: `MediaRecorder` → base64 → `transcribeSpeechAudio` (Whisper). Optional `prepareAudioForAzurePronunciationAssessment` for Azure-friendly MIME. |
| Pronunciation call | Same hook + `src/lib/speech/speechClient.ts` | After transcript, if `NEXT_PUBLIC_SPEECH_AUDIO_ASSESSMENT` enabled and backend URL set, calls `POST /api/speech/pronunciation-assessment` with `audioBase64`, `mimeType`, `transcript`, optional `expectedText`, `assessmentMode` (`reference` \| `open_response`). |
| Feature flags | `src/lib/api/apiConfig.ts` | `isSpeechAudioAssessmentEnabled`, speech input mode, etc. |
| Send payload | `src/lib/conversation/composerSendPayload.ts` | Optional `voiceQuality: PronunciationAssessmentApiResponse` attached when user sends from voice review. |

### 2. API endpoints (Azure Functions)

| Route | File | Role |
|-------|------|------|
| `POST /api/speech/pronunciation-assessment` | `backend/src/http/registerHttpFunctions.ts` | Validates body with `PronunciationAssessmentHttpBodySchema`, decodes audio, enforces `expectedText` for `reference` and `transcript` for `open_response`, calls `runPronunciationAssessment`. |
| `POST /api/speech/transcribe` | Same | Whisper STT; separate from pronunciation. |
| `POST /api/speech/evaluate-spoken-transcript` | Same | Transcript-only coaching path (`evaluatePronunciationFromTranscript` / OpenAI) — not Azure audio. |
| `POST /api/speech/speaking-coaching/evaluate` | Same | OpenAI speaking coaching on transcript (`openAiSpeakingCoachingService`). |

### 3. Azure pronunciation code

| Piece | Location |
|-------|-----------|
| Gateway | `backend/src/services/speech/pronunciationAssessmentGateway.ts` — selects `AzurePronunciationAssessmentService` vs `OffPronunciationAssessmentService` from `PRONUNCIATION_MODE`. |
| Azure SDK | `backend/src/services/speech/azurePronunciationAssessmentService.ts` — `SpeechRecognizer` + `PronunciationAssessmentConfig` (word granularity, prosody on), push-stream audio from WebM/OGG/PCM MIME. |
| Normalized model | `backend/src/services/speech/pronunciationAssessmentContracts.ts` — `NormalizedPronunciationAssessment` (overall, pronunciation, accuracy, fluency, completeness, prosody, words[], caveat notes). |
| Config | `backend/src/services/speech/pronunciationAssessmentConfig.ts` — `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`, `AZURE_SPEECH_LOCALE`, `PRONUNCIATION_MODE`. |

### 4. Current result model (API → UI)

| Type | Location |
|------|-----------|
| `PronunciationAssessmentApiResponse` | Backend `pronunciationAssessmentContracts.ts` + FE mirror `src/lib/speech/audioPronunciationTypes.ts` |
| Card UI | `src/features/feature1-chat/components/VoiceQualityFeedbackCard.tsx` — shows overall + dimension scores + short server `summaryFeedback` / `recommendedNextStep` + caveats. |
| Legacy / alt | `PronunciationFeedbackCard.tsx` may reference older patterns; primary “voice quality” surface is `VoiceQualityFeedbackCard`. |

### 5. Storage

| Data | Persistence |
|------|-------------|
| Pronunciation API result | **Ephemeral on client** unless merged into send payload metadata (thread message metadata can carry hints; not a dedicated pronunciation store today). |
| Thread / messages | SQL via conversation services — not a first-class “assessment run” table in this audit scope. |

### 6. Documentation (pre-existing)

- `docs/pronunciation-assessment-architecture.md` — hybrid STT + Azure + coaching layers.  
- `docs/pronunciation-feedback.md`, `docs/integrations/speech-voice.md` — product/integration notes.

## Gaps vs target coach (why foundation work)

- Single generic `PronunciationAssessmentApiResponse` — no canonical cross-layer model for word/phrase/timing/coaching/reference/retry.  
- No persisted assessment entity for debugging or `GET …/:id`.  
- No orchestrated step boundaries (timing analysis, reference audio, coaching-over-scores) with structured perf logs.  
- Azure word timings not exposed on normalized words (limits rhythm/pause analysis).

**Next:** See `docs/speaking-feedback-foundation.md` for the new stack (`POST /api/speaking/assess`, services, contracts).
