# Pronunciation Breakdown UI — Architecture & Design

## Overview

The pronunciation breakdown is FluentCopilot's flagship per-turn analysis feature. For every spoken turn that has audio, the learner can see exactly which words were strong or weak, tap any word for details, compare their audio against a native reference, understand what went wrong, and save problem items for later drills.

## Component Structure

```
TurnComparisonCard (existing — augmented)
└── WordByWordBreakdown (new — top of expanded section)
    ├── View toggle: Words | Phrases
    ├── WordChip[] (interactive tokens, color-coded by band)
    ├── PhraseChip[] (grouped tokens, violet accent on issues)
    ├── Legend (band indicator dots + "tap for details" hint)
    ├── CompareMode (A/B playback: your take / reference / loop)
    ├── WordDetailSheet (bottom sheet on word tap)
    │   ├── Score + band + dot indicator
    │   ├── "What happened" (rose)
    │   ├── "How to fix" (emerald)
    │   ├── Compare buttons: Your audio / Reference
    │   └── "Save for practice" action
    └── PhraseDetailSheet (bottom sheet on phrase tap)
        ├── Phrase text + pause duration
        ├── "What happened" / "How to fix"
        ├── Compare buttons
        └── "Save phrase for practice" action
```

## Data Flow

```
Backend TurnEvaluation
  ├── pronunciationIssues[]  →  WordAssessment[]
  ├── fluencyIssues[]        →  PhraseGroup[] (auto-derived or explicit)
  ├── learnerAudioUrl        →  resolved blob URL
  └── referenceAudioUrl      →  resolved blob URL

SpeakLiveEvaluationPage
  → extracts pronunciationIssues, fluencyIssues from each turn
  → passes to TurnComparisonCard

TurnComparisonCard
  → maps pronunciationIssues to WordAssessment[]
  → derives PhraseGroup[] from fluencyIssues break points
  → renders WordByWordBreakdown at top of expanded section
```

## Key Types

### WordAssessment

| Field     | Type             | Source                         |
|-----------|------------------|--------------------------------|
| word      | string           | Transcript token               |
| score     | number           | Azure word-level score (0–100) |
| errorType | string?          | Azure error classification     |
| startMs   | number?          | Word start in audio clip       |
| endMs     | number?          | Word end in audio clip         |
| issue     | string?          | Human-readable issue text      |
| fix       | string?          | Concrete fix suggestion        |

### PhraseGroup

| Field      | Type     | Source                              |
|------------|----------|-------------------------------------|
| words      | string[] | Grouped word tokens                 |
| startIndex | number   | Index into WordAssessment[]         |
| endIndex   | number   | Index into WordAssessment[]         |
| issue      | string?  | Phrase-level issue (chunking, rush) |
| fix        | string?  | Concrete fix suggestion             |
| pauseMs    | number?  | Detected pause duration             |

## Score Bands (Word Level)

| Band        | Score Range | Color    | Dot     |
|-------------|-------------|----------|---------|
| Strong      | 85–100      | Emerald  | Green   |
| Building    | 65–84       | Amber    | Yellow  |
| Weak        | 0–64        | Rose     | Red     |
| Unavailable | null        | Slate    | Gray    |

## States

### 1. Audio + Valid Word Scores (full alignment)
Full word-by-word breakdown with interactive chips, compare mode, and save actions.

### 2. Audio + Weak Alignment (partial)
Breakdown shown with an amber notice: "Audio alignment was partial — some word scores may be approximate."

### 3. Audio + No Alignment (none)
Compact notice: "Detailed word alignment unavailable for this turn. Using phrase-level guidance above."

### 4. No Audio
Pronunciation breakdown is hidden entirely. Transcript coaching (grammar, wording, scenario fit) is shown instead.

## Interactions

1. **Tap a word chip** → Opens `WordDetailSheet` as a bottom sheet (mobile) or centered modal (desktop)
2. **Tap a phrase chip** → Opens `PhraseDetailSheet`
3. **Toggle Words / Phrases** → Switches between word-level and phrase-level views
4. **Play Your Take / Reference / A/B Loop** → Audio playback in compare mode
5. **Save for practice** → Fires save action through the existing `handleSave` pipeline with type `save_pronunciation_word` or `save_phrase`

## Design Principles

- **Evidence-first**: Every issue shown is backed by Azure word-level data or timing analysis
- **Concrete feedback**: "What happened" + "How to fix" — never vague statements
- **Premium feel**: Clean spacing, calm palette with meaningful accents, smooth sheet transitions
- **Accessibility**: Color is never the sole indicator (dots have labels), tap targets are ≥44px (`min-h-touch`), tokens wrap well on mobile
- **No fake data**: When audio is missing or alignment is weak, UI degrades gracefully with honest messaging

## Files

| File | Purpose |
|------|---------|
| `src/features/speak-live/evaluation/WordByWordBreakdown.tsx` | All new components (chips, sheets, compare, legend) |
| `src/features/speak-live/evaluation/TurnComparisonCard.tsx` | Integration point — breakdown sits at top of expanded section |
| `src/features/speak-live/SpeakLiveEvaluationPage.tsx` | Extracts and passes pronunciation/fluency data |
| `src/features/speak-live/evaluation/__dev__/samplePronunciationData.ts` | Seeded dev test data (4 turn types) |
