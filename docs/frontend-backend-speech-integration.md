# Frontend ↔ Backend Speech Integration

## Overview

This document describes how backend speech evaluation data flows into the frontend pronunciation UI, what guards ensure only real evidence is displayed, and how each signal type maps to specific UI sections.

## Architecture

```
Backend Orchestrator (liveSessionEvaluationOrchestrator.ts)
  ├── Azure PA → pronunciationIssues[]  (word-level scores, startMs/endMs)
  ├── Timing Analysis → fluencyIssues[] (pause/rush detection by word index)
  ├── LLM Evaluator → languageEvaluation, scenarioGoalFit
  └── Premium Scoring Engine → premiumEvaluation (6-dimension model)
       ├── pronunciation dimension (source: azure_audio)
       ├── fluency dimension (source: azure_audio + timing_analysis)
       ├── rhythm dimension (source: timing_analysis)
       ├── wording dimension (source: llm_transcript)
       ├── grammar dimension (source: llm_transcript)
       └── scenarioFit dimension (source: scenario_matcher)

      ↓  JSON over API  ↓

Frontend Bridge (speechEvaluationBridge.ts)
  ├── detectTurnSignals() → TurnSignalProfile
  ├── mapWordAssessments() → WordAssessment[] (Azure-backed ONLY)
  ├── mapPhraseGroups() → PhraseGroup[] (timing-backed ONLY)
  ├── extractTranscriptCoaching() → TranscriptCoachingSection
  └── extractAudioDimensions() → AudioDimensionSummary

      ↓  React props  ↓

Frontend Components
  ├── WordByWordBreakdown (word chips, phrase chips, compare mode)
  ├── TranscriptCoachingSection (wording, grammar, scenario fit)
  └── TurnComparisonCard (orchestrates all sections)
```

## Signal-Driven UI Guards

The bridge layer (`speechEvaluationBridge.ts`) computes a `TurnSignalProfile` that drives all UI visibility decisions:

```typescript
type TurnSignalProfile = {
  hasAudio: boolean              // azure_audio source detected
  hasAzureWordScores: boolean    // pronunciationIssues[] has items
  hasFluencyTimingData: boolean  // fluencyIssues[] has items
  hasTranscriptCoaching: boolean // wording or grammar dimension scored
  hasScenarioFit: boolean        // scenarioFit dimension scored
  alignmentQuality: 'full' | 'partial' | 'none'
}
```

### Guard Matrix

| Signal State | Word Chips | Phrase View | Compare Mode | Transcript Coaching | Pronunciation Header |
|---|---|---|---|---|---|
| Audio + Azure words + fluency | Shown (colored) | Shown (with issues) | Shown | Shown | Shown |
| Audio + Azure words, no fluency | Shown | Single group | Shown | Shown | Shown |
| Audio, no Azure words | Hidden | Hidden | Shown (full turn only) | Shown | "Alignment unavailable" |
| No audio | **Hidden entirely** | **Hidden entirely** | **Hidden entirely** | **Shown (primary)** | Hidden |
| No premium eval | Shown if Azure words exist | Derived from fluency | Shown | **Hidden** | — |

### Critical Rule: No Fake Data

The bridge mapper **never fabricates word scores**. Specifically:

- `mapWordAssessments()` returns `[]` if `hasAzureWordScores` is false — it does NOT synthesize scores from transcript tokens or dimension-level scores
- `mapPhraseGroups()` returns `[]` if `hasAudio` is false or `wordAssessments` is empty
- `extractTranscriptCoaching()` returns `null` for dimensions with `score == null`

## Data Flow: Backend → Frontend

### 1. Word Chips (Pronunciation)

**Backend source**: `TurnEvaluation.pronunciationIssues[]`

```typescript
// Backend (liveSessionEvaluationTrust.ts)
pronunciationIssues = buildPronunciationIssuesFromAzure({ words, referenceAudioUrl })

// Each issue:
{ word: "Goedemiddag", score: 42, issue: "Opening vowel...", fix: "Hold the oe...",
  referenceAudioUrl: "/ref/1", startMs: 100, endMs: 600 }
```

**Frontend mapping**: `mapWordAssessments(pronunciationIssues, signals)`

Only maps when `signals.hasAudio && signals.hasAzureWordScores`. Empty strings in `issue`/`fix` are stripped to `undefined`.

### 2. Phrase Groups (Rhythm/Fluency)

**Backend source**: `TurnEvaluation.fluencyIssues[]`

```typescript
// Backend (liveSessionEvaluationTrust.ts)
fluencyIssues = buildFluencyIssuesFromTiming({ words, timing })

// Each issue:
{ segment: "trein naar", issue: "480ms pause...", fix: "Link as one breath",
  pauseMs: 480, afterWordIndex: 3 }
```

**Frontend mapping**: `mapPhraseGroups(fluencyIssues, wordAssessments, signals)`

Uses `afterWordIndex` as break points between phrase groups. If no fluency issues, all words form one group.

### 3. Transcript Coaching (Wording/Grammar/Scenario)

**Backend source**: `TurnEvaluation.premiumEvaluation.dimensions[]`

The premium scoring engine's `wording`, `grammar`, and `scenarioFit` dimensions are extracted with their feedback items.

**Frontend mapping**: `extractTranscriptCoaching(premiumEvaluation)`

Returns structured `TranscriptCoachingSection` with per-dimension score, band label, evidence summary, and feedback items. Rendered by `TranscriptCoachingSection` component.

### 4. Reference Audio

**Backend source**: `TurnEvaluation.referenceAudioUrl` (turn-level TTS) and `premiumEvaluation.recommendedDrills[].referenceAudioUrl` (drill-specific)

**Frontend resolution**:
- The turn-level `referenceAudioUrl` is resolved to a blob URL by `SpeakLiveEvaluationPage` (same as learner audio)
- `resolveReferenceAudioForDrill()` checks drill-specific URLs first, falls back to turn reference
- Both word detail sheets and phrase detail sheets receive the resolved URL

## Component Integration

### TurnComparisonCard (orchestrator)

The card uses the bridge in this order:

1. `detectTurnSignals()` — determines what's available
2. `mapWordAssessments()` — Azure-backed word data only
3. `mapPhraseGroups()` — timing-backed phrase data only
4. `extractTranscriptCoaching()` — LLM-backed text coaching

Then renders:
1. `WordByWordBreakdown` — only if `signals.hasAudio` (internal guards handle partial/none alignment)
2. `TranscriptCoachingSection` — always rendered (component self-hides when coaching is null)
3. Existing sections (comparison, audio players, improvement list, saves)

### Save Actions

- Word saves: only wired when `signals.hasAzureWordScores` (prevents saving items without evidence)
- Phrase saves: only wired when `signals.hasFluencyTimingData`
- Save payload includes `tagCategory` and `suggestedTrainingMode` for the training queue

## Testing

27 integration tests in `src/features/speak-live/evaluation/__tests__/speechEvaluationBridge.test.ts`:

- `detectTurnSignals`: 4 tests (full, partial, no-audio, no-premium)
- `mapWordAssessments`: 4 tests (maps Azure, empty on no-audio, empty on no-words, strips empty strings)
- `mapPhraseGroups`: 4 tests (from fluency, single group, empty on no-audio, empty on no-words)
- `extractTranscriptCoaching`: 3 tests (extracts dims, null on null eval, null-score dims)
- `extractAudioDimensions`: 3 tests (extracts, null on no-audio, null on null eval)
- `resolveReferenceAudioForDrill`: 4 tests (drill-specific, fallback, null eval, both null)
- Integration guards: 5 tests (full flow, partial, no-audio, no-premium, no-fabrication)

## Files

| File | Role |
|------|------|
| `src/features/speak-live/evaluation/speechEvaluationBridge.ts` | Bridge layer: signal detection, mappers, guards |
| `src/features/speak-live/evaluation/TranscriptCoachingSection.tsx` | Transcript-based coaching UI (wording, grammar, scenario) |
| `src/features/speak-live/evaluation/WordByWordBreakdown.tsx` | Word chips, phrase chips, compare mode, detail sheets |
| `src/features/speak-live/evaluation/TurnComparisonCard.tsx` | Turn card (integrates all sections via bridge) |
| `src/features/speak-live/SpeakLiveEvaluationPage.tsx` | Page-level data extraction and prop passing |
| `src/features/speak-live/evaluation/__tests__/speechEvaluationBridge.test.ts` | 27 integration tests |
| `backend/src/services/speak-live/liveSessionEvaluationOrchestrator.ts` | Backend: builds pronunciation/fluency issues + premium eval |
| `backend/src/services/speaking-assessment/speechScoringEngine.ts` | Backend: 6-dimension premium scoring engine |
| `backend/src/domain/speaking-assessment/speechScoringModel.ts` | Backend: scoring model types, bands, policies |
