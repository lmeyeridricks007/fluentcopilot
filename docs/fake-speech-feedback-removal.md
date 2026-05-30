# Fake Speech Feedback Removal

> Inventory of misleading feedback patterns that were removed or guarded, and what replaced them.

## What Was Wrong

FluentCopilot's evaluation pipeline had several patterns that generated speech-quality claims without real audio evidence:

1. **Zero-fill scores rendered as data**: `AudioScores` defaulted to `{ pronunciation: 0, fluency: 0, rhythm: 0, completeness: 0, clarity: 0 }` even without audio. The UI rendered these zeros as real scores.
2. **LLM guessing speech quality**: The LLM could generate `dutchLikenessNarrative` with phrases like "you sounded hesitant" based purely on transcript.
3. **Template copy implying voice analysis**: Copy like "you mumbled", "rhythm is off", "Natural Dutch sounding" appeared even on transcript-only turns.
4. **Blended scores hiding missing data**: `overallVoiceScore` blended audio and transcript scores, masking that no audio existed.
5. **Deep evaluation always emitting audio arrays**: `pronunciationFeedback` and `rhythmFeedback` could contain heuristic-derived content without audio.
6. **Session summaries aggregating phantom scores**: `pronunciationSummary` and `fluencyRhythmSummary` were always displayed even with no audio turns.

## What Was Removed / Changed

### Backend (Orchestrator)

| Before | After |
| ------ | ----- |
| `audioScores` rendered as `{pronunciation: 0, ...}` and displayed | Still stored as zeros for schema compat, but `deepEvaluation.audioScores = null` when no audio |
| `overallScores.pronunciationScore/fluencyScore/rhythmScore` always numeric | Now `number \| null` — `null` when no audio-backed turns |
| `keyProblems` included "pause detected", "hesitation" without audio | `filterKeyProblemsWhenNoAudio()` strips speech-quality strings |
| `keyStrengths` could include "good pronunciation" without audio | `filterStrengthsWhenNoAudio()` strips audio claims |
| `dutchLikenessNarrative` could say "you sounded..." without audio | `sanitizeDutchLikenessForTranscriptOnly()` replaces with transcript-only text |
| `chunkingRhythmSuggestion` filled from LLM without audio | Cleared to `""` when `hasAudio = false` |
| `focusWords` set from LLM without audio | Cleared to `[]` when `hasAudio = false` |
| `improvementActions` included `save_pronunciation_word` / `save_rhythm_drill` without audio | `filterImprovementActionsForAudioPresence()` strips them |
| Session `pronunciationSummary` / `fluencyRhythmSummary` always shown | Set to `SESSION_VOICE_ANALYSIS_UNAVAILABLE_MESSAGE` when no audio |

### Backend (LLM Prompt)

| Before | After |
| ------ | ----- |
| No constraint on `dutchLikenessNarrative` | "If hasLearnerAudio is false: write ONLY about transcript readability... never mention rhythm, pauses, pronunciation, mumbling" |
| No constraint on `chunkingRhythmSuggestion` | "MUST be an empty string when hasLearnerAudio is false" |
| No constraint on `improvementActions` types | "do NOT emit save_rhythm_drill or save_pronunciation_word when hasLearnerAudio is false" |

### Backend (Deep Evaluation Mapper)

| Before | After |
| ------ | ----- |
| `audioScores` always populated from turn | `null` when no Azure audio |
| `pronunciationFeedback` / `rhythmFeedback` could have content | Empty arrays when no Azure audio |

### Frontend

| Before | After |
| ------ | ----- |
| "Overall voice score" always shown | "Session score (transcript-based)" when no audio |
| "How you came across" always shown | "Wording and grammar at a glance" when no audio |
| "How Dutch did you sound here?" always shown | "How natural is this Dutch (from text)?" when no audio |
| "Natural Dutch sounding" metric title | "More natural wording (text)" when no audio |
| "Clear enough to be understood" copy references listeners hearing you | Separate text-only copy: "Well-structured sentence — a reader grasps it effortlessly." |
| Pronunciation / rhythm score chips always visible | Hidden when `audioMetricsAvailable = false` |
| Quick labels always shown for pronunciation/rhythm | Hidden when no audio |
| Deep lens (audio) section always rendered | Only when `hasLearnerAudio = true` |
| "Compare your clip" fallback text | "Compare your wording with the more natural Dutch version" when no audio |

### Validation Layer

| Component | Behavior |
| --------- | -------- |
| `AUDIO_ONLY_FEEDBACK_TYPES` | Canonical `Set` of types requiring `source = "audio"` |
| `validateAndFilterFeedbackItems()` | Drops items where audio-only type has non-audio source, or evidence is missing |
| `diagnoseFeedbackViolations()` | Returns diagnostic strings for logging/monitoring without throwing |

## Before vs After Examples

### Example: Transcript-Only Turn

**BEFORE** (misleading):
```
Turn 1
Your sentence: "Goedemiddag is de trein naar Amsterdam op tijd"
Pronunciation: 0  Fluency: 0  Rhythm: 0
How Dutch did you sound here?
"Your rhythm was a bit off and pronunciation needs work."
Pronunciation scan: needs work
Rhythm scan: needs work
```

**AFTER** (evidence-based):
```
Turn 1
Your sentence: "Goedemiddag is de trein naar Amsterdam op tijd"
Voice analysis unavailable — no audio captured for this turn.
How natural is this Dutch (from text)?
"We only have your transcript for this line — coaching below reflects wording and grammar."
Naturalness (transcript): solid
Grammar & sentence construction (transcript — not audio):
  Grammar 72 · Construction 68 · Naturalness 65 · Level fit 70
```

### Example: Audio-Backed Turn

**BEFORE** and **AFTER** (mostly the same when audio exists):
```
Turn 2
Your sentence: "Goedemiddag (⚠️) is de trein naar Amsterdam op tijd"
Pronunciation (audio): shaky  ·  Rhythm (audio): solid  ·  Naturalness (transcript): solid
How Dutch did you sound here?
"Understandable Dutch with room to sound more local — focus on the 'oe' in goedemiddag."
Evidence-based feedback:
  pronunciation (audio) — Word "goedemiddag" scored 52: stretch the 'oe' sound
```

### Example: Session With No Audio

**BEFORE**:
```
Overall voice score: 58
Pronunciation: 0  Fluency: 0  Rhythm: 0
Fluency & rhythm: "Your rhythm was uneven across turns."
Pronunciation: "Several words need clearer articulation."
```

**AFTER**:
```
Session score (transcript-based): 58
pronunciation — · fluency — · rhythm — (no audio)
Voice analysis:
"Voice analysis was not available this session — no learner audio was captured on any turn."
```
