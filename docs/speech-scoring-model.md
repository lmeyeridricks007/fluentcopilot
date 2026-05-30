# Speech Scoring Model

> FluentCopilot's premium six-dimension scoring system for Dutch speech evaluation.

## Six Dimensions

| # | Dimension | What it measures | Source of truth |
|---|-----------|-----------------|-----------------|
| 1 | **Pronunciation clarity** | Word/phoneme accuracy, sound substitutions, vowel/consonant issues | Azure Pronunciation Assessment (word-level scores) |
| 2 | **Fluency** | Hesitations, unnatural pauses, restarts, delivery continuity | Azure fluency + speech timing analysis |
| 3 | **Rhythm & phrasing** | Chunking, phrase grouping, sentence flow, stress/cadence | Timing segmentation + derived heuristics |
| 4 | **Natural wording** | How native-like the phrasing sounds in context | LLM over transcript + scenario context |
| 5 | **Grammar & construction** | Grammar correctness, word order, level-appropriate construction | LLM over transcript + CEFR constraints |
| 6 | **Scenario fit** | Did the learner accomplish the task for this scene | Scenario goal matcher + LLM evaluator |

### Evidence requirement

Dimensions 1–3 **require real audio evidence** (`AUDIO_REQUIRED_DIMENSIONS`). If no audio was captured, these dimensions return `score: null` and are not displayed.

Dimensions 4–6 work from transcript and scenario context. They always have scores when an LLM evaluation runs.

## Score Bands (0–100)

| Range | Band ID | Label | Short |
|-------|---------|-------|-------|
| 0–39 | `notYetWorkable` | Not yet workable | Needs work |
| 40–59 | `earlyStep` | Early step | Early step |
| 60–74 | `building` | Building | Building |
| 75–89 | `strongEnough` | Strong enough | Strong |
| 90–100 | `closeToLocal` | Close to local | Near-native |

## Reliability Indicators

Every score carries a reliability badge:

| Level | When | Visual treatment |
|-------|------|-----------------|
| **High** | Clear audio, ≥3 words, good recognition | Full confidence display |
| **Medium** | Short utterance, or partial audio, or LLM-only | Softened display with reason |
| **Low** | No audio, <3 words, or very short clip | Muted, with explanation |

Session-level reliability factors in turn count, audio coverage, and average word count.

## Composite Score

The `overallTurnScore` is a **weighted average** of all scored dimensions, computed per mode:

```
overall = Σ (adjusted_dimension_score × weight) / Σ weights_of_scored_dimensions
```

Missing dimensions (null) are excluded from the weighting — they don't drag the composite down.

## UI Display Rules

1. **Headline**: One summary sentence (e.g., "Building at A2 — understandable, with clear areas to tighten.")
2. **Priority cards**: 2–3 lowest-scoring dimensions expanded by default
3. **Expandable detail**: Remaining dimensions behind "Show all 6 dimensions"
4. **Evidence inline**: Each dimension shows its source label ("Voice-based" / "Text-based" / "Scenario coaching")
5. **Drills**: Every score below 75 maps to at least one concrete practice action

## Data Flow

```
Azure PA → RawScores → DerivedScores ─┐
                                       ├─→ speechScoringEngine.evaluateTurn() → SpeechTurnEvaluation
LLM → LanguageScores + Grammar ───────┘
                                              │
                                              ▼
                              speechScoringEngine.evaluateSession() → SpeechSessionEvaluation
```

## Key Files

| File | Role |
|------|------|
| `backend/src/domain/speaking-assessment/speechScoringModel.ts` | Types, bands, policies, weights, composites |
| `backend/src/services/speaking-assessment/speechScoringEngine.ts` | Turn + session evaluation logic |
| `backend/src/services/speaking-assessment/speechFeedbackMapper.ts` | Low score → drill mapping |
| `src/features/speak-live/evaluation/PremiumScoreCard.tsx` | FE dimension cards, reliability badges, drill cards |
