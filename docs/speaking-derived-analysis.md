# Speaking — deterministic derived analysis (Phase 2)

FluentCopilot augments **raw Azure pronunciation scores** with **timing-derived heuristics** and **bounded “derived” dimensions** (`rhythm`, `sentenceStress`, `intonationGuidance`, `naturalness`) plus **verdict labels** and **phrase targets**. Nothing here claims acoustic science or native-likeness; all numbers are **coarse, explainable proxies**.

**Source of truth for tunables:** `backend/src/domain/speaking-assessment/speakingDerivedHeuristicsConfig.ts` (`SPEAKING_DERIVED_THRESHOLDS`). When you change thresholds, update this document in the same PR.

---

## Data flow

1. Azure returns words (text, accuracy, optional `startMs` / `endMs`) and clip-level scores.
2. `analyzeSpeechTiming` builds `TimingAnalysis` from gaps, durations, clip length, and transcript word count.
3. `computeDerivedScores` combines raw scores + timing into `DerivedScores` (each field is a `DerivedSignal`: optional `score`, `label`, optional `explanation`).
4. `mapVerdictLabelsFromSignals` produces `topLabel`, `clarityLabel`, `naturalnessLabel` (learner-honest copy).
5. `extractPhraseTargets` lists short practice chunks with reasons/priorities.

---

## Timing heuristics (`SpeechTimingAnalysisService`)

### Pauses and silence

| Concept | Rule |
|--------|------|
| **Pause** | Gap between consecutive word boundaries > `pauseMinMs` (default **120 ms**). |
| **Hesitation moment** | Gap > `hesitationPauseMs` (**450 ms**). Stored with `afterWordIndex`. |
| **Phrase boundary candidate** | Gap > `phraseBoundaryPauseMs` (**280 ms**). |
| **Silence duration** | If `userClipDurationMs` is known and exceeds active speech span (`lastEnd - firstStart`), silence ≈ clip minus that span; else `null`. |

### Speaking rate (WPM)

- **Words spoken count** = `max(Azure word count, transcript token count)` (helps when timings are sparse).
- **Speaking duration** = span from first word start to last word end when timestamps exist; else falls back to clip/total.
- **estimatedWpm** = words / (duration in minutes). **Language-agnostic**; short Dutch replies can look “slow” or “fast” in edge cases.

### Rushed ending (`rushedEnding`)

Two independent cues (either can fire):

1. **Word-pair compression:** Last word duration < `rushedWordDurationRatio` × previous word duration (default **0.45**), with both durations > 0.
2. **Final-window density:** Requires ≥ `rushedEndingMinTimedWords` (**5**) words with `startMs`, and `totalDurationMs` > 400. Count words with `startMs` in the last **`rushedFinalWindowRatio`** (**20%**) of the clip vs earlier. If `inFinal / (before + inFinal) ≥ rushedFinalWordDensityRatio` (**0.55**) and `inFinal ≥ 2`, flag as rushed.

### Trailing compression (`trailingCompression`)

Heuristic tail “squeeze”: median word duration > 0, last word duration < **38%** of median, ≥ 3 words, and (`rushedEnding` **or** WPM > `wpmRushed`).

### Pace profile (`paceProfile`)

| Value | Approximate rule |
|-------|-------------------|
| `rushed` | `estimatedWpm > wpmRushed` (**155**) **or** `rushedEnding`. |
| `tooSlow` | WPM < `wpmTooSlow` (**70**) and `pauseCount ≤ 2`. |
| `uneven` | Pauses per word > `highPauseToWordRatio` (**0.35**) **or** (≥ 3 pauses and coefficient of variation of gap lengths > `gapCvUneven` (**0.85**)). |
| `steady` | Default if none of the above. |

### Sentence-level notes (`sentenceLevelNotes`)

Non-exhaustive examples computed in code:

- **steady opening** — early gaps exist but first gap is below phrase-boundary threshold.
- **long pause before final phrase** — longest pause is hesitation-sized and occurs near the tail.
- **ending rushed** — when `rushedEnding`.
- **pace understandable but careful** — when profile is `tooSlow`.
- **second half speeds up** — mean word duration in second half < first half × 0.88 (≥ 6 timed words).

`paceNotes` extends `sentenceLevelNotes` with a few coaching-oriented strings (e.g. several pauses, fast WPM).

---

## Derived scores (`SpeakingDerivedScoresService`)

All outputs are **clamped 0–100** when numeric, except `score: null` when timing is too weak for a rhythm number (`hasTimingSignal` false).

| Dimension | Numeric idea | Labels (examples) |
|-----------|----------------|---------------------|
| **rhythm** | Starts from `fluency`, subtracts pause/hesitation/uneven/rush penalties; `score` null if no timing signal. | e.g. “often rushed”, “steady but careful”, “uneven pacing”. |
| **sentenceStress** | Blend of pronunciation + accuracy; slightly reduced if rhythm is low but pronunciation high (“clear words, weaker flow”). | e.g. “key stress not always landing”. |
| **intonationGuidance** | If Azure **prosody** exists: uses it with caveats. Else, if phrase pauses suggest boundaries: **label-only style** (`score: null`). Else `null`. | Explicitly marked as proxy / timing hint. |
| **naturalness** | Blend of pronunciation, fluency, completeness minus unevenness; minus small penalty for `trailingCompression`. | Special cases: high fluency + low naturalness → “clear learner Dutch”; high completeness + uneven pace → “understandable but not smooth”. |

These are **stricter / different** from raw Azure: e.g. many pauses pull rhythm down even when Azure fluency is middling.

---

## Verdict labels (`speakingVerdictLabels.ts`)

`topLabel`, `clarityLabel`, `naturalnessLabel` are **short UX strings**. They **never** claim native production. Examples: “good learner Dutch overall”, “words fairly clear — flow less natural yet” (high pronunciation, low derived rhythm).

---

## Phrase targets (`phraseTargetExtraction.ts`)

| Source | Priority / reason |
|--------|-------------------|
| Weak words (`isWeak`) | `high` — lower word-level confidence. |
| Phrase boundary candidates | `high` if pause > hesitation threshold else `medium`. |
| Rushed tail | Joins up to last four words; reason `ending rushed`; `high`. |
| English-leaning tokens in transcript not in expected text | Regex list (`the`, `please`, `sorry`, …); **text-only** heuristic; `medium`. |

Deduped by normalized text; max **10** targets.

---

## Limitations (honest)

- **No F0 / intonation tracing** — “intonation” is prosody score or pause-based hints.
- **WPM** is sensitive to clip padding, missing timestamps, and short utterances.
- **Cross-language transfer** (English insertions) is **lexical**, not phonetic alignment.
- **Azure errors** (wrong words/timings) propagate into all derived fields.
- Thresholds are **tunable**, not calibrated on a labeled speech corpus.

---

## Example payload (truncated)

```json
{
  "timingAnalysis": {
    "totalDurationMs": 4200,
    "speakingDurationMs": 3900,
    "silenceDurationMs": 300,
    "pauseCount": 3,
    "avgPauseMs": 210,
    "longestPauseMs": 520,
    "wordsSpokenCount": 6,
    "estimatedWpm": 92,
    "phraseBoundaryCandidates": [{ "afterWordIndex": 2, "pauseMs": 310 }],
    "rushedEnding": true,
    "trailingCompression": false,
    "hesitationMoments": [{ "afterWordIndex": 4, "pauseMs": 520 }],
    "paceProfile": "uneven",
    "sentenceLevelNotes": ["ending rushed", "long pause before final phrase"],
    "paceNotes": ["ending rushed", "long pause before final phrase"]
  },
  "derivedScores": {
    "rhythm": { "score": 58, "label": "uneven pacing", "explanation": "Pauses or chunk lengths vary a lot across the clip." },
    "sentenceStress": { "score": 71, "label": "reasonable word-level clarity" },
    "intonationGuidance": { "score": null, "label": "timing-based hint only", "explanation": "No reliable prosody score — phrase pauses suggest where melody may need work." },
    "naturalness": { "score": 64, "label": "good learner Dutch" }
  },
  "verdicts": {
    "topLabel": "understandable — ending feels rushed",
    "clarityLabel": "mostly clear with rough edges",
    "naturalnessLabel": "clear but still English-leaning rhythm"
  },
  "phraseTargets": [
    { "text": "melk, graag", "reason": "ending rushed", "priority": "high" }
  ]
}
```

---

## Tests

Core heuristics are covered in `backend/src/services/speaking-assessment/speakingDerivedHeuristics.test.ts` (rushed ending, hesitation, WPM/pace, naturalness branches, verdict mapping, phrase targets).
