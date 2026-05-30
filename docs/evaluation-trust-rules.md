# Evaluation Trust Rules

> Non-negotiable product rule for FluentCopilot's Speak Live evaluation pipeline.

## Core Principle

**Every feedback item must be traceable to a real evidence source.** If no audio was captured for a turn, the system must not display, imply, or persist any voice-quality judgment.

## Rule Table

| Rule | Scope | Enforcement Point |
| ---- | ----- | ----------------- |
| Audio-only types (`pronunciation`, `fluency`, `rhythm`, `pacing`, `prosody`) require `source = "audio"` | Per-item | `validateAndFilterFeedbackItems()` |
| Every `FeedbackItem` must have a non-empty `evidence.transcriptSnippet` | Per-item | `validateAndFilterFeedbackItems()` |
| `AudioScores` are zero-filled **but never rendered** when no audio — `deepEvaluation.audioScores` is `null` | Per-turn | `liveTurnDeepEvaluationMapper.ts` |
| Session-level `pronunciationScore`, `fluencyScore`, `rhythmScore` are `null` (not `0`) when no audio-backed turns exist | Per-session | `liveSessionEvaluationOrchestrator.ts` |
| `keyProblems`, `keyStrengths`, `dutchLikenessNarrative` are sanitized to remove speech-quality language when `hasAudio = false` | Per-turn | `liveSessionEvaluationTrust.ts` filter functions |
| `improvementActions` of type `save_pronunciation_word` and `save_rhythm_drill` are stripped without audio | Per-turn | `filterImprovementActionsForAudioPresence()` |
| `recommendedFollowUps` of type `pronunciation_drill` and `rhythm_drill` are stripped at session level without audio | Per-session | `filterRecommendedFollowUpsForSessionAudio()` |
| LLM prompt bans acoustic claims (`dutchLikenessNarrative`, `chunkingRhythmSuggestion`) when `hasLearnerAudio = false` | LLM | `SYSTEM` prompt in `liveSessionEvaluationLlm.ts` |
| FE labels: "Voice-based feedback" only shown when audio exists; "Text-based feedback" when transcript-only | UI | `TurnComparisonCard.tsx`, `SpeakLiveEvaluationPage.tsx` |

## Canonical Type Guard

```typescript
import { AUDIO_ONLY_FEEDBACK_TYPES } from './liveVoiceEvaluationTypes'

// If this check fails, the item MUST NOT be rendered or persisted.
if (AUDIO_ONLY_FEEDBACK_TYPES.has(item.type) && item.source !== 'audio') {
  // REJECT
}
```

## Unavailable Messages

| Scope | Message |
| ----- | ------- |
| Turn | `"Voice analysis unavailable — no audio captured for this turn."` |
| Session | `"Voice analysis was not available this session — no learner audio was captured on any turn."` |

## Test Coverage

See `liveSessionEvaluationTrust.test.ts` — 24 tests covering:
1. No audio → no voice-quality items
2. Transcript-only → grammar allowed, pronunciation blocked
3. Fake payloads → validation + diagnostics reject
4. Mixed sessions → only valid evidence-backed items pass
5. No speech-quality text leaks without audio
6. Improvement actions are audio-gated
7. Recommended follow-ups are audio-gated
8. `AUDIO_ONLY_FEEDBACK_TYPES` canonical set correctness
