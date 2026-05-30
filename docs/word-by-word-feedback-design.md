# Word-by-Word Feedback Design — Interaction & Evidence Model

## Purpose

This document describes how FluentCopilot generates concrete, evidence-based feedback for each word and phrase in a spoken turn, and how that feedback surfaces in the UI.

## Feedback Quality Standard

### Bad feedback (never do this)
- "Pronunciation needs work"
- "Try to improve your fluency"
- "Good effort"

### Good feedback (always this specific)
- "In 'goedemiddag', the opening vowel 'oe' was too short — sounded closer to English 'good' than Dutch 'goe'."
- "In 'Amsterdam', the stress drifted toward the end. Dutch stresses 'AM' — not 'dam'."
- "Pause less between 'de trein' and 'naar Amsterdam' — link them as one breath group."

## Evidence Sources per Feedback Type

### Word-Level Issues (pronunciation)

| Evidence Source | What It Provides | Confidence |
|----------------|-----------------|------------|
| Azure Pronunciation Assessment | Word score (0–100), error type, phoneme breakdown | High |
| Azure Word Timing | startMs / endMs for each word | High |
| LLM Coach (post-session) | Issue description, fix suggestion, phoneme-level hints | Medium |

### Phrase-Level Issues (rhythm / fluency)

| Evidence Source | What It Provides | Confidence |
|----------------|-----------------|------------|
| Azure Word Timing | Pause durations between words (derived from gaps) | High |
| Timing Analysis | WPM, pace profile, rush/drag detection | Medium |
| LLM Coach | Chunking suggestions, phrase grouping feedback | Medium |

## Word Detail Sheet Contents

When a learner taps a word chip, they see:

```
┌─────────────────────────────────────────┐
│  [Goedemiddag]          Score: 42       │
│  ● Needs work                           │
│                                         │
│  ┌─ What happened ───────────────────┐  │
│  │ Opening vowel 'oe' was too short  │  │
│  │ — sounded closer to English       │  │
│  │ 'good' than Dutch 'goe'.         │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌─ How to fix ──────────────────────┐  │
│  │ Hold the 'oe' vowel longer:      │  │
│  │ goooo-de-mid-dag. Listen to the  │  │
│  │ reference and echo slowly.        │  │
│  └───────────────────────────────────┘  │
│                                         │
│  Compare                                │
│  [🔊 Your audio]  [🔊 Reference]       │
│                                         │
│  [📌 Save "goedemiddag" for practice]   │
│                                         │
│  Source: Azure word-level assessment    │
└─────────────────────────────────────────┘
```

## Phrase Detail Sheet Contents

```
┌─────────────────────────────────────────┐
│  Phrase: "naar Amsterdam"               │
│  480 ms pause detected                  │
│                                         │
│  ┌─ What happened ───────────────────┐  │
│  │ Long pause between "naar" and     │  │
│  │ "Amsterdam" breaks the phrase.    │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌─ How to fix ──────────────────────┐  │
│  │ Link "naar Amsterdam" as one      │  │
│  │ breath group with no gap.         │  │
│  └───────────────────────────────────┘  │
│                                         │
│  [🔊 Your audio]  [🔊 Reference]       │
│  [📌 Save phrase for practice]          │
└─────────────────────────────────────────┘
```

## Save-for-Practice Model

When a learner saves a word or phrase from the detail sheet:

```typescript
{
  type: 'save_pronunciation_word' | 'save_phrase',
  title: 'Practice "goedemiddag"',
  detail: 'Isolated pronunciation drill for "goedemiddag" from this turn.',
  saveKey: 'pron-word-{turnId}-goedemiddag',
  tagCategory: 'pronunciation' | 'rhythm',
  suggestedTrainingMode: 'isolated_word' | 'chunk_practice',
}
```

This is sent through the existing `handleSave` pipeline in `SpeakLiveEvaluationPage`, which calls `conversationClient.saveTrainingItem()` with:
- Source session + turn IDs
- Learner audio URL + reference audio URL
- The original and improved sentences
- Tag category and suggested training mode

## Compare Mode

The compare mode panel appears below the word/phrase chips for every turn with audio:

| Button | Action |
|--------|--------|
| Your Take | Plays learner's recording from start |
| Reference | Plays native reference from start |
| A/B Loop | Plays learner → reference sequentially |

Active playback state is visually indicated with a ring highlight on the playing button.

## Phrase Grouping Logic

When the backend provides explicit `PhraseGroup[]`, those are used directly. Otherwise, phrase groups are derived from:

1. `fluencyIssues[].afterWordIndex` — marks phrase break points
2. Remaining words between breaks form contiguous groups
3. If no fluency issues exist, the entire transcript is one group

## Alignment Quality Handling

| Quality | Behavior |
|---------|----------|
| `full` | All word chips rendered with Azure scores |
| `partial` | Chips rendered with amber notice about approximate scores |
| `none` | No chips — compact message instead |
| No audio | Entire pronunciation breakdown hidden |

## Sample Data for Development

Four seeded turns are available in `__dev__/samplePronunciationData.ts`:

1. **Strong A2 turn** — all words ≥ 85, clean delivery, no issues
2. **Weak pronunciation** — "goedemiddag" (42) and "Amsterdam" (48) with concrete issues/fixes, plus a 480ms pause
3. **Phrase rhythm issues** — good individual words but choppy chunking across three phrase groups
4. **No audio** — transcript only, pronunciation breakdown correctly hidden

These are bundled as `SAMPLE_PRONUNCIATION_TURNS` for easy iteration in dev mode or storybook.

## Design Tokens

| Element | Color System | Purpose |
|---------|-------------|---------|
| Strong word | Emerald 50/300/500 | Positive reinforcement |
| Building word | Amber 50/300/500 | Neutral attention |
| Weak word | Rose 50/300/500 | Needs work (not punitive) |
| Phrase issue | Violet 50/300/400 | Rhythm/chunking distinction |
| Learner audio | Sky 50/200/900 | "Your" lane |
| Reference audio | Emerald 50/200/900 | "Native" lane |
| Save action | Violet 50/200/900 | Training queue |

## Accessibility

- All tap targets use `min-h-touch` (44px minimum)
- Color is accompanied by dot indicators and text labels
- Word chips wrap naturally on narrow viewports
- Audio controls are reachable one-handed (bottom-sheet pattern)
- Sheet dismissal works via backdrop tap, X button, or Escape key
