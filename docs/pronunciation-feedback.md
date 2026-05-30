# Pronunciation feedback (spoken Dutch)

## Evaluation architecture

1. **Client** records audio (Whisper path) or uses browser Web Speech (fallback).
2. **Transcription**
   - **Whisper**: `POST …/speech/transcribe` sends `audioBase64`, optional `evaluatePronunciation`, `cefrLevel`, `scenarioHint`. Backend runs Whisper, then optionally runs the pronunciation evaluator on the transcript.
   - **Browser STT**: transcript is produced locally; if the chat backend is enabled and pronunciation eval is on, the client calls `POST …/speech/evaluate-transcript` with the same level/hint fields.
3. **Pronunciation judge (LLM)**  
   The model **does not receive raw learner audio** for scoring. It receives the **ASR transcript** (and metadata). The system prompt states this explicitly so scores are framed as *likely* pronunciation/clarity/fluency inferred from text, not acoustic phonetic analysis.
4. **Response** is validated with Zod (`PronunciationFeedbackSchema`). On parse failure or empty model output, a **gentle fallback** object is returned so the UI never breaks.
5. **UI** (`PronunciationFeedbackCard`) shows tone headline, 1–5 chips, summary, highlighted transcript tokens, issues, suggested Dutch, example line, encouragement, optional `<audio>` for the user clip (Whisper path only), and “Hear example” via **browser TTS** for the example/correction Dutch.

**Feature flag (frontend):** `NEXT_PUBLIC_SPEECH_PRONUNCIATION_EVAL` — default on; set to `0`, `false`, or `no` to disable LLM feedback (transcribe-only).

**Level alignment:** `cefrLevel` is `A2` or `B1` (scenario `A1` is mapped to `A2` for voice). The LLM system prompt asks for simpler coaching at A2 and slightly richer detail at B1, always supportive.

---

## Prompt (authoritative copy lives in code)

**File:** `backend/src/services/speech/pronunciationEvaluationService.ts`

- **System:** `EVAL_SYSTEM` — supportive Dutch coach; transcript-only; gentle tone; A2 vs B1 rules; integer scores 1–5 for pronunciation, fluency, clarity; `overallTone` `sounds_good` vs `improve`; JSON only.
- **User:** `buildUserPrompt` — includes `Learner CEFR level`, Dutch transcript in triple quotes, optional scenario line, and a JSON skeleton listing all required keys.

---

## Response schema (JSON)

Aligned with `PronunciationFeedbackSchema` / frontend `PronunciationFeedback`:

| Field | Type | Notes |
|--------|------|--------|
| `pronunciationScore` | integer 1–5 | Inferred from transcript / wording |
| `fluencyScore` | integer 1–5 | Flow and naturalness |
| `clarityScore` | integer 1–5 | Ease of following the message |
| `overallTone` | `"sounds_good"` \| `"improve"` | Drives card headline |
| `shortSummary` | string, max 600 | One friendly line (English) |
| `keyIssues` | string[], max 4 × 280 chars | Short bullets (English) |
| `suggestedCorrection` | string, max 900 | Natural Dutch rewrite; may be empty |
| `exampleBetterSentence` | string, max 900 | On-topic Dutch example |
| `highlightWords` | string[], max 12 × 80 | Substrings of transcript for UI emphasis |
| `encouragement` | string, max 500 | Warm closing (English), level-suited |

**HTTP:** Transcribe responses may include `{ text, pronunciation? }`. Dedicated endpoint returns `{ pronunciation }`.
