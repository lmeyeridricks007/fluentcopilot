# Audio vs Transcript Feedback

> How FluentCopilot decides what feedback to show based on evidence source.

## Two Feedback Lanes

| Lane | Source | Allowed Feedback Types | UI Label |
| ---- | ------ | --------------------- | -------- |
| **Voice-based** | Azure Speech SDK (real audio recording) | `pronunciation`, `fluency`, `rhythm`, `pacing`, `prosody` | "Voice-based feedback" / "(audio)" |
| **Text-based** | Learner transcript + LLM analysis | `grammar`, `naturalness`, `scenario_fit` | "Text-based feedback" / "(transcript)" |

## How the System Decides

```
Turn has stored audio blob?
  ├─ YES → Azure pronunciation assessment runs
  │        → Audio-backed feedback items created
  │        → Word-level pronunciation scores available
  │        → Timing/pause analysis from word timestamps
  │        → Both audio AND transcript feedback shown
  │
  └─ NO  → voiceAnalysisUnavailableMessage set
          → AudioScores remain at 0 but are NOT rendered
          → deepEvaluation.audioScores = null
          → Only transcript-based feedback generated
          → UI shows "Voice analysis unavailable" banner
          → All speech-quality copy is filtered out
```

## What Each Lane Shows

### Voice-based (audio exists)

- **Pronunciation highlights**: weak words highlighted inline with `(⚠️)`
- **Pronunciation issues**: word-level scores from Azure, with reference audio
- **Fluency issues**: pause detection between words, rushed endings
- **Rhythm scan**: quick label derived from timing analysis
- **Deep lens**: pronunciation and rhythm feedback lists
- **Focus words**: tokens flagged for drill practice

### Text-based (transcript only)

- **Grammar feedback**: article, tense, agreement issues
- **Sentence structure**: word order, completeness, clause shape
- **Naturalness**: phrasing compared to native Dutch patterns
- **Level fit**: CEFR-grounded assessment of the transcript
- **Improved version**: more natural Dutch rephrasing with explanation

## UI Rendering Rules

| Element | Audio exists | No audio |
| ------- | ------------ | -------- |
| Pronunciation score chip | Shown | Hidden |
| Rhythm score chip | Shown | Hidden |
| Fluency score chip | Shown | Hidden |
| Quick label "Pronunciation (audio)" | Shown | Hidden |
| Quick label "Rhythm (audio)" | Shown | Hidden |
| Quick label "Naturalness (transcript)" | Shown | Shown |
| "How Dutch did you sound here?" | Shown | Changed to "How natural is this Dutch (from text)?" |
| Deep lens (audio) section | Shown | Hidden |
| Voice analysis unavailable banner | Hidden | Shown |
| Grammar & construction section | Shown | Shown |
| "Overall voice score" header | Shown | Changed to "Session score (transcript-based)" |
| "How you came across" header | Shown | Changed to "Wording and grammar at a glance" |

## Session-Level Rules

| Condition | Session report behavior |
| --------- | ---------------------- |
| All turns have audio | Full voice + text summary |
| No turns have audio | Remove pronunciation/rhythm sections entirely; show "Voice analysis was not available this session" |
| Mixed | Audio-backed scores averaged from audio turns only; transcript sections always shown; `pronunciationScore`/`fluencyScore`/`rhythmScore` in `OverallScores` are `null` when no audio turns exist |
| Single turn | "You completed 1 turn. We can give more precise feedback once you complete more turns." |
