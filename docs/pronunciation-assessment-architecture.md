# Pronunciation assessment (Azure Speech, raw audio)

## Hybrid evaluation (Talk / Feature 1)

FluentCopilot uses **three separate layers** for spoken learner replies:

| Layer | Input | Responsibility |
|--------|--------|----------------|
| **1. OpenAI STT** | Raw audio (e.g. WebM) | **What** the learner said → transcript in composer |
| **2. OpenAI speaking coaching** | Transcript + scenario (after send) | Naturalness, level fit, intent vs scenario |
| **3. Azure pronunciation assessment** | **Same raw audio** + reference strategy | **How** the learner sounded: accuracy, fluency, completeness, prosody (when enabled) |

Layers are **independent**: transcription must not wait on Azure; Azure must not block the chat send path. The client calls `POST /api/speech/pronunciation-assessment` **after** Whisper returns, in parallel with the user editing text.

## Backend

| Piece | Role |
|--------|------|
| `PRONUNCIATION_MODE` | `off` \| `mock` \| `azure` — server-side switch (local-friendly). |
| `pronunciationAssessmentContracts.ts` | HTTP Zod body, normalized DTOs, `IPronunciationAssessmentService`. |
| `azurePronunciationAssessmentService.ts` | `microsoft-cognitiveservices-speech-sdk` — `SpeechRecognizer` + `PronunciationAssessmentConfig` on push audio. |
| `mockPronunciationAssessmentService.ts` | Deterministic scores for UI / integration tests. |
| `offPronunciationAssessmentService.ts` | Returns `assessment: null` with caveats. |
| `pronunciationAssessmentGateway.ts` | Selects implementation from `PRONUNCIATION_MODE`. |
| `POST /api/speech/pronunciation-assessment` | JSON body with `audioBase64`, `mimeType`, `assessmentMode`, optional `transcript` / `expectedText`. |

## Reference vs open response

- **`reference`**: `expectedText` is required. Azure compares audio to a **known target phrase** (best-supported case).
- **`open_response`**: `transcript` (e.g. Whisper) is used as the **reference proxy** — scores describe clarity/alignment **against what you said**, not against a separate gold script. The API and UI carry **caveats** so we do not oversell “exam-grade” open-ended scoring.

## Frontend

- **`NEXT_PUBLIC_SPEECH_AUDIO_ASSESSMENT`**: when not `0`, after Whisper the client requests audio assessment (server may still return `assessment: null` if mode is `off`).
- **`VoiceQualityFeedbackCard`**: shows friendly bands + expandable word list; distinct from **transcript-only** `PronunciationFeedbackCard` (browser / legacy LLM path).

## Production considerations

- **Latency**: assessment runs async in the client after STT; do not chain on message send.
- **Cost / quota**: each clip is one recognition + pronunciation call; monitor Azure Speech usage.
- **Audio format**: primary path is **WebM/Opus** from `MediaRecorder`; Azure stream format is chosen accordingly. Other codecs may need follow-up.
- **Privacy**: audio is sent to your backend → Azure; document retention in your privacy policy.

See also: [local-setup-azure-pronunciation.md](./local-setup-azure-pronunciation.md).
