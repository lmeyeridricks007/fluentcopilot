# Speech Score Weighting by Mode

> How dimension weights change across different speaking contexts.

## Four Scoring Modes

| Mode | Context | Key priority |
|------|---------|-------------|
| `live_speak` | Guided real-life scenario conversation | Balanced — pronunciation slightly emphasized |
| `read_aloud` | Reading a fixed Dutch text | Pronunciation and fluency dominate |
| `exam_speaking` | Exam-style structured response | Grammar and fluency equally weighted |
| `chat_voice` | Open-ended voice chat | Wording and grammar matter most |

## Weight Tables

### `live_speak` (default for Speak Live sessions)

| Dimension | Weight |
|-----------|--------|
| Pronunciation clarity | **25%** |
| Fluency | 15% |
| Rhythm & phrasing | 15% |
| Natural wording | 15% |
| Grammar & construction | 15% |
| Scenario fit | 15% |

### `read_aloud`

| Dimension | Weight |
|-----------|--------|
| Pronunciation clarity | **35%** |
| Fluency | **25%** |
| Rhythm & phrasing | **20%** |
| Natural wording | 5% |
| Grammar & construction | 5% |
| Scenario fit | 10% |

### `exam_speaking`

| Dimension | Weight |
|-----------|--------|
| Pronunciation clarity | 20% |
| Fluency | **20%** |
| Rhythm & phrasing | 15% |
| Natural wording | 10% |
| Grammar & construction | **20%** |
| Scenario fit | 15% |

### `chat_voice`

| Dimension | Weight |
|-----------|--------|
| Pronunciation clarity | 20% |
| Fluency | 15% |
| Rhythm & phrasing | 10% |
| Natural wording | **20%** |
| Grammar & construction | **20%** |
| Scenario fit | 15% |

## Composite Calculation

```
overall = Σ (adjusted_score_i × weight_i) / Σ (weight_i for scored dimensions)
```

- Dimensions with `score: null` (e.g., pronunciation when no audio) are excluded from both numerator and denominator
- The composite is clamped to 0–100 and mapped to a band
- Level encouragement floor is applied before weighting

## Rationale

**Live Speak** balances all dimensions because the learner is performing in a realistic scenario where pronunciation, grammar, and scene fitness all matter.

**Read Aloud** heavily weights pronunciation and fluency because the text is fixed — grammar and wording aren't the learner's choice.

**Exam Speaking** mirrors common exam rubrics (CEFR, Inburgering) where grammar and fluency carry equal weight alongside pronunciation.

**Chat Voice** weights wording and grammar higher because open conversation reveals language skills more than pronunciation precision.

## Configuration

Weights are defined in `WEIGHTS_BY_MODE` in `speechScoringModel.ts`. All weight sets sum to exactly 1.0 (verified by tests). To add a new mode, add an entry and the system picks it up automatically.

## When Dimensions Are Missing

If no audio exists, pronunciation/fluency/rhythm are `null`. The composite recalculates using only the remaining dimensions' weights. This means a transcript-only session's composite is based on wording + grammar + scenario fit, with their weights normalized to sum to 1.0.

Example for `live_speak` with no audio:
- Wording: 15/45 ≈ 33%
- Grammar: 15/45 ≈ 33%  
- Scenario fit: 15/45 ≈ 33%
