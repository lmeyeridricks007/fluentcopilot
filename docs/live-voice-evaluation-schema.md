# Speak Live evaluation — data model & scoring

## SQL tables

### `LiveSessionEvaluations`

| Column | Type | Notes |
|--------|------|--------|
| `ThreadId` | `uniqueidentifier` PK | Same as conversation thread / `sessionId`. |
| `UserId` | `uniqueidentifier` | Internal user id. |
| `Status` | `nvarchar(32)` | `pending` \| `running` \| `complete` \| `failed`. |
| `EvaluationJson` | `nvarchar(max)` | Serialized `LiveSessionEvaluation` (see below). |
| `ErrorMessage` | `nvarchar(2000)` | Populated when `failed`. |

Migration: `backend/database/migrations/005_live_voice_evaluation.sql`.

### `SavedTrainingItems`

See [live-voice-save-for-later.md](./live-voice-save-for-later.md).

## `LiveSessionEvaluation` (persisted JSON)

Top-level object (TypeScript mirror: `backend/src/services/speak-live/liveVoiceEvaluationTypes.ts`):

| Field | Description |
|-------|-------------|
| `sessionId` | Thread UUID. |
| `scenarioId` | Scenario slug. |
| `scenarioTitle` | Human title. |
| `learnerLevel` | CEFR band used for coaching tone (currently derived from scenario `difficultyBand` when recap JSON overwrites thread summary). |
| `sessionDurationSeconds` | First → last message timestamps. |
| `turnsCompleted` | Count of learner user turns. |
| `overallScores` | Session aggregates (includes per-turn `combinedScores` average for overall voice). |
| `overallSummary` | LLM coach copy + “what to try next”. |
| `scenarioOutcome` | Goals completed/missed + recap bullets. |
| `turnEvaluations[]` | Per-turn rich structure. |
| `recommendedFollowUps[]` | Session-level suggested drills / repeats. |
| `generatedAt` | ISO timestamp. |
| `status` | Mirrors row status when embedded (usually `complete`). |

### `TurnEvaluation` (per spoken turn)

| Field | Description |
|-------|-------------|
| `transcriptOriginal` | User message text as stored. |
| `transcriptNormalized` | Azure recognized text when audio assessed, else original. |
| `scenarioGoalFit` | `{ summary, alignmentScore 0–100, relevantGoals[] }` — LLM + recap context. |
| `audioScores` | `{ pronunciation, fluency, rhythm, completeness }` — Azure + timing (see below). |
| `languageScores` | `{ naturalness, contextualFit, registerFit, grammaticalStability }` — structured LLM (0–100). |
| `combinedScores` | `{ overallTurnScore, clarityScore, dutchLikenessScore }` — deterministic blend of audio + language. |
| `keyStrengths[]` / `keyProblems[]` | Coach bullets; problems also seed from `audioFindings` when present. |
| `audioFindings[]` | Learner-facing lines from Azure words + pause/rush heuristics. |
| `referenceSentence` | Dutch line for TTS. |
| `referenceSentenceReason` | Why this line fits level/scene. |
| `referenceKind` | `reference_pronunciation` \| `more_natural_dutch`. |
| `referenceAudioUrl` | `data:` or relative `speak-live/session/.../reference-audio/:messageId`. |
| `learnerAudioUrl` | Relative `speak-live/session/.../learner-audio/:messageId` or null. |
| `chunkingRhythmSuggestion` | Chunking / pacing tip (LLM; may align with timing). |
| `focusWords[]` | Tokens for drills (LLM + weak words). |
| `improvementActions[]` | `{ type, title, detail, targetPhrase?, targetWord? }` — specific save/drill intents. |
| `signalSources` | `{ audioMetrics, languageCoach, scenarioContext }` disclosure. |
| `quickLabels` | Short scan chips (pronunciation / rhythm / naturalness bands). |
| `dutchLikenessNarrative` | One learner-facing sentence (no digits): how natural / Dutch this turn sounded in context — from evaluation LLM; UI may fall back if missing. |

## Scoring rules

### Audio-backed (`audioScores`)

When learner audio is stored and Azure returns an assessment:

- **pronunciation, fluency, completeness** — from Azure normalized scores (0–100).
- **rhythm** — from `computeDerivedScores` + `analyzeSpeechTiming` (pause / rush heuristics on word timings).

### Language (`languageScores`)

- Produced by the **evaluation LLM** from transcript + assistant context + optional Azure JSON summary.
- Must not copy Azure numerics into these fields; they describe *how Dutch reads in context*.

### Combined (`combinedScores`)

- **overallTurnScore** — weighted blend of mean(audioScores) and mean(languageScores); more weight on audio when Azure audio exists.
- **clarityScore** — blend of pronunciation, fluency, grammaticalStability.
- **dutchLikenessScore** — blend of naturalness, contextualFit, registerFit, plus partial pronunciation.

### Transcript-only turns

If no stored learner audio:

- Azure block is skipped; `audioScores` use conservative placeholders; `signalSources.audioMetrics = unavailable`.
- `audioFindings` explains the limitation.

### Scenario completion

`scenarioCompletionScore` = `(# goalsCompleted) / max(1, #scenarioGoals) * 100` using recap `goalsCompleted` / scenario goal list length.

## Source-of-truth disclosure

Each turn’s `signalSources` records:

- `audioMetrics`: `azure_audio` \| `unavailable`
- `languageCoach`: `transcript_language` (LLM)
- `scenarioContext`: `scenario_context` (recap + goals)

The UI repeats this near each turn so we never imply transcript inference came from spectral audio analysis.

## LLM contract

`liveSessionEvaluationLlm.ts` defines the JSON schema for the **session coach model** output (turns + follow-ups). The orchestrator merges this with Azure/timing facts before TTS.

## Example `TurnEvaluation` JSON (one turn)

```json
{
  "turnId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "turnIndex": 0,
  "transcriptOriginal": "Welk perron is de trein?",
  "transcriptNormalized": "Welk perron is de trein?",
  "scenarioGoalFit": {
    "summary": "You asked about the platform — fits the station information goal.",
    "alignmentScore": 78,
    "relevantGoals": ["Find correct platform / departure information"]
  },
  "audioScores": {
    "pronunciation": 71,
    "fluency": 68,
    "rhythm": 64,
    "completeness": 82
  },
  "languageScores": {
    "naturalness": 62,
    "contextualFit": 74,
    "registerFit": 80,
    "grammaticalStability": 70
  },
  "combinedScores": {
    "overallTurnScore": 69,
    "clarityScore": 70,
    "dutchLikenessScore": 67
  },
  "keyStrengths": [
    "Question shape is clear for a station desk.",
    "Key content words are understandable on first listen."
  ],
  "keyProblems": [
    "Word “perron” scored lower on clarity (64) — try slower articulation and clear stress.",
    "Ending sounds compressed vs earlier syllables — give the last phrase a bit more airtime."
  ],
  "referenceSentence": "Van welk perron vertrekt de trein?",
  "referenceSentenceReason": "More natural question order in Dutch for a station desk; same intent, clearer information-seeking shape.",
  "referenceKind": "more_natural_dutch",
  "referenceAudioUrl": "speak-live/session/{threadId}/reference-audio/{turnId}",
  "learnerAudioUrl": "speak-live/session/{threadId}/learner-audio/{turnId}",
  "chunkingRhythmSuggestion": "Chunk as: “Van welk perron / vertrekt de trein?” — pause lightly after perron.",
  "focusWords": ["perron", "vertrekt", "trein"],
  "improvementActions": [
    {
      "type": "save_pronunciation_word",
      "title": "Drill pronunciation: “perron”",
      "detail": "Azure word score flagged “perron” on turn 1 — isolate it in slow reps, then replace it in the full line.",
      "targetWord": "perron",
      "targetPhrase": "Welk perron is de trein?"
    },
    {
      "type": "save_natural_phrasing",
      "title": "Natural phrasing: “Van welk perron vertrekt de trein?”",
      "detail": "Compare your line to the reference Dutch for turn 1 in “Train station”.",
      "targetPhrase": "Van welk perron vertrekt de trein?"
    }
  ],
  "assistantContext": "Goedemorgen, waarmee kan ik u helpen?",
  "quickLabels": {
    "pronunciation": "shaky",
    "rhythm": "often rushed",
    "naturalness": "clear learner Dutch"
  },
  "signalSources": {
    "audioMetrics": "azure_audio",
    "languageCoach": "transcript_language",
    "scenarioContext": "scenario_context"
  },
  "audioFindings": [
    "Word “perron” scored lower on clarity (64) — try slower articulation and clear stress.",
    "Ending sounds compressed vs earlier syllables — give the last phrase a bit more airtime."
  ]
}
```
