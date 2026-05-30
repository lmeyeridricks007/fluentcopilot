# Post-session live evaluation (FluentCopilot Speak Live)

This document describes the **premium post-session** pipeline that runs **after** the learner ends a live voice session. It is intentionally separate from the fast live path (STT + conversation only).

## Trigger

1. Client ends the Speak Live session (thread completed, recap/summary persisted).
2. `SpeakLivePostSessionPhase` moves through `evaluating` while `buildLiveSessionEvaluationRecord` runs.
3. Client opens the evaluation route or polls `GET` / `POST` live session evaluation until `status: complete`.

## Inputs per learner turn

| Input | Source |
|--------|--------|
| Learner audio | Blob path in message metadata (`learnerAudioBlobPath`) |
| Raw transcript | `metadata.transcriptRaw` or message `content` |
| Normalized transcript | `metadata.transcriptNormalized`, else Azure recognized text, else raw |
| Scenario context | `ScenarioConfig` (title, goals) |
| CEFR level | Thread / session learner level passed into the orchestrator |
| Preceding assistant line | Next assistant message after each user message in the thread |
| Session goals | Scenario `goals[]` (also sent to the evaluation LLM on every turn payload) |

## Pipeline stages

1. **Azure pronunciation assessment** (when audio exists): pronunciation, fluency, completeness, word-level accuracy; timing analysis for pauses / hesitation / rushed ending.
2. **Audio-derived learner fields**: `AudioScores` including **`clarity`** (blend of pronunciation, accuracy, completeness), `audioFindings[]`, rhythm score from derived timing + fluency.
3. **Evaluation LLM** (`runLiveSessionEvaluationLlm`): transcript + normalized transcript, Azure JSON summary, assistant snippet, scenario recap, CEFR level. Produces per-turn language scores, scenario fit, improvement actions, **`turnLanguageEvaluation`** (grammar, construction, word order, level fit, improved Dutch, **next step beyond level**), and optional **session-level** hints (`strongestAreas`, `weakestAreas`, `mostImportantNextStep`, `savedTrainingRecommendationsSummary`).
4. **Reference TTS**: natural Dutch reference line → audio URL (and optional persisted blob for authenticated playback).
5. **Merge**: `TurnEvaluation` rows updated with coach output; each turn gets **`deepEvaluation`** (`LiveTurnDeepEvaluation`) for the UI.
6. **Session insights**: `sessionInsights` aggregates grammar/sentence and naturalness means, merges LLM session hints with deterministic fallbacks from per-turn scores.

## FE-facing model (high level)

- **`LiveSessionEvaluation`**: session summary, `overallScores`, `overallSummary`, **`sessionInsights`**, `scenarioOutcome`, `turnEvaluations[]`, `recommendedFollowUps[]`.
- **`TurnEvaluation`**: scores, transcripts, audio URLs, `languageEvaluation`, `improvementActions`, **`deepEvaluation`**.
- **`LiveTurnDeepEvaluation`**: learner-friendly merge of audio feedback arrays, grammar/structure arrays, improved Dutch, level comment, reference audio, **`actionsToTrainLater`** (from improvement actions).

See `backend/src/services/speak-live/liveVoiceEvaluationTypes.ts`, `liveSessionEvaluationOrchestrator.ts`, `liveTurnDeepEvaluationMapper.ts`.

## Example JSON (trimmed)

```json
{
  "sessionId": "thread-uuid",
  "scenarioId": "train-station",
  "scenarioTitle": "Train station",
  "learnerLevel": "A2",
  "sessionDurationSeconds": 420,
  "turnsCompleted": 2,
  "status": "complete",
  "overallScores": {
    "overallVoiceScore": 68,
    "pronunciationScore": 71,
    "fluencyScore": 66,
    "rhythmScore": 64,
    "clarityScore": 69,
    "naturalnessScore": 62,
    "scenarioCompletionScore": 80,
    "confidenceEstimate": 65
  },
  "sessionInsights": {
    "overallGrammarSentenceScore": 61,
    "overallNaturalness": 62,
    "strongestAreas": ["Scenario goal alignment", "Pronunciation and word-level clarity"],
    "weakestAreas": ["Grammar and sentence construction"],
    "mostImportantNextStep": "Shadow one reference clip per day focusing on chunking before long words.",
    "savedTrainingRecommendationsSummary": "Save the improved lines from turns 1–2 and drill the two Azure-flagged weak words."
  },
  "turnEvaluations": [
    {
      "turnId": "msg-uuid-1",
      "turnIndex": 0,
      "transcriptOriginal": "Ik wil een kaartje naar utrecht",
      "transcriptNormalized": "Ik wil een kaartje naar Utrecht",
      "audioScores": {
        "pronunciation": 72,
        "fluency": 68,
        "rhythm": 65,
        "completeness": 70,
        "clarity": 71
      },
      "languageScores": {
        "naturalness": 60,
        "contextualFit": 74,
        "registerFit": 66,
        "grammaticalStability": 58
      },
      "combinedScores": {
        "overallTurnScore": 66,
        "clarityScore": 67,
        "dutchLikenessScore": 64
      },
      "referenceSentence": "Ik wil graag een kaartje naar Utrecht.",
      "referenceAudioUrl": "speak-live/session/thread-uuid/reference-audio/msg-uuid-1",
      "learnerAudioUrl": "speak-live/session/thread-uuid/learner-audio/msg-uuid-1",
      "languageEvaluation": {
        "grammarScore": 58,
        "sentenceConstructionScore": 62,
        "naturalnessScore": 60,
        "levelFitScore": 72,
        "whatWorked": ["Clear purchase intent", "Correct place name"],
        "grammarIssues": ["Article / politeness softener missing for service counter"],
        "sentenceStructureIssues": ["Could invert politely for a ticket window"],
        "wordOrderNotes": ["Consider \"Ik wil graag …\" at the counter"],
        "improvedVersion": "Ik wil graag een kaartje naar Utrecht.",
        "whyItIsBetter": "Sounds natural and polite for A2/B1 service Dutch.",
        "levelBasedComment": "For A2 this is understandable and goal-oriented; polish register with \"graag\".",
        "nextStepBeyondLevel": "At B1, add a short reason or time window: \"… vandaag, enkele reis alsjeblieft.\""
      },
      "deepEvaluation": {
        "turnId": "msg-uuid-1",
        "learnerTranscript": "Ik wil een kaartje naar utrecht",
        "learnerTranscriptNormalized": "Ik wil een kaartje naar Utrecht",
        "learnerAudioRef": "speak-live/session/thread-uuid/learner-audio/msg-uuid-1",
        "overallTurnScore": 66,
        "pronunciationFeedback": ["Word \"utrecht\" — try slower articulation and clear stress."],
        "rhythmFeedback": ["Try two chunks: Ik wil een kaartje | naar Utrecht"],
        "grammarFeedback": ["Article / politeness softener missing for service counter", "Word order: Consider \"Ik wil graag …\" at the counter"],
        "sentenceConstructionFeedback": ["Could invert politely for a ticket window"],
        "moreNaturalDutchVersion": "Ik wil graag een kaartje naar Utrecht.",
        "whyThisVersionIsBetter": "Sounds natural and polite for A2/B1 service Dutch.",
        "levelFitComment": "For A2 this is understandable and goal-oriented; polish register with \"graag\".",
        "nextStepBeyondLevel": "At B1, add a short reason or time window: \"… vandaag, enkele reis alsjeblieft.\"",
        "referenceAudioUrl": "speak-live/session/thread-uuid/reference-audio/msg-uuid-1",
        "actionsToTrainLater": [
          {
            "type": "save_natural_phrasing",
            "title": "Natural phrasing: \"Ik wil graag een kaartje naar Utrecht.\"",
            "detail": "Compare your line to the reference Dutch for turn 1 in \"Train station\".",
            "targetPhrase": "Ik wil graag een kaartje naar Utrecht."
          }
        ]
      }
    }
  ]
}
```

## Related docs

- [CEFR-grounded speaking evaluation](./cefr-grounded-speaking-evaluation.md) — level rules for coaches and scorers.
- [Post-session evaluation pipeline](./post-session-evaluation-pipeline.md) — DB phases and HTTP surface.
