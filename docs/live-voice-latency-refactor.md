# Live Voice Latency Refactor

## Overview

This refactor transforms the Speak Live voice pipeline from batch-style turn processing (~23s first audio) to a streaming-first architecture targeting **<2.5s from turn end to first audio playback**.

## Before / After Pipeline

### Before (batch-style)

```
Mic stop ──5.3s──▶ Final transcript ──1.6s──▶ Server transcribe ──16.2s──▶ LLM done ──1.4s──▶ TTS done ──0.4s──▶ Playback
                                                                                                                  Total: ~22.9s
```

Key issues:
- Turn end is user-driven (hold-to-speak, manual release)
- LLM response goes through full DB lookups, moderation, state computation
- TTS waits for complete LLM text before starting
- No clause-level audio streaming

### After (streaming-first)

```
Auto-commit ──<1s──▶ Transcript ──<0.5s──▶ Fast endpoint ──<1s──▶ First LLM token
                                                                        │
                                                              ◀──<0.5s──┤ First TTS chunk
                                                                        │
                                                              ◀──<0.5s──┤ Playback start
                                                                  Target total: <2.5s
```

## Architecture Changes

### 1. Chunked TTS (`liveTtsChunkService.ts`)

Instead of waiting for the full assistant reply before generating audio, the client now detects sentence boundaries in the growing streamed text and fires individual TTS requests.

**Backend endpoint**: `POST /api/speak-live/tts-chunk`

```typescript
// Input
{ text: string, threadId?: string, chunkIndex: number }
// Output
{ audioUrl: string, mimeType: string, chunkIndex: number }
```

**Clause splitting rules**:
- Split on sentence-ending punctuation (`.` `?` `!` `;`)
- Split on comma boundaries when clause >= 15 chars
- Merge tiny fragments (< 12 chars) into previous clause

**Client hook**: `useChunkedTtsPlayback`
- Receives delta tokens via `feedDelta(text)`
- Detects completed clauses and fires TTS requests in parallel with LLM streaming
- Queues audio chunks and plays them sequentially
- Falls back to full-text TTS if no clauses detected

### 2. Auto-commit Turn End (`useTurnAutoCommit.ts`)

Automatic turn commit based on silence detection and partial transcript stability. Replaces the manual hold-to-release pattern.

**Configuration**:
```typescript
type TurnAutoCommitConfig = {
  silenceMs: 800        // commit after this much silence
  minUtteranceMs: 400   // don't commit if speech < this
  partialStabilityMs: 600  // if partial text unchanged for this long, commit
  maxFinalizeWaitMs: 1200  // hard cap after silence detected
}
```

**How it works**:
1. Azure STT fires `speechEndDetected` → starts silence timer
2. If new `recognizing` event fires, timer is cancelled
3. If timer expires AND min utterance met → auto-commit
4. Manual tap-to-send remains as override (marks manual commit to prevent double-fire)

### 3. Fast Turn Endpoint (`liveFastTurnService.ts`)

Dedicated endpoint that bypasses full `conversationAppService` overhead.

**Endpoint**: `POST /api/speak-live/fast-turn` (NDJSON streaming)

```typescript
// Input
{
  threadId: string
  transcript: string
  compactState: LiveCompactState
}

// LiveCompactState shape
{
  scenarioSlug: string
  scenarioTitle: string
  personaName: string
  personaRole: string
  level: string
  phase: string
  goalIndex: number
  goalsCompleted: number[]
  goalTitles: string[]
  recentTurns: Array<{ role: 'U' | 'A'; text: string }>
  slotState: Record<string, unknown> | null
  groundingBlock: string
  rollingSummary?: string | null
}

// NDJSON events
{ type: 'meta', compactState: LiveCompactState }
{ type: 'delta', text: string }
{ type: 'done', assistantText: string, compactState: LiveCompactState, perf: FastTurnPerf }
```

**What it skips from the hot path**:
- SQL pool + DB thread/scenario/persona lookups
- User text moderation (deferred)
- Learner audio upload (background)
- Message persistence (background after first token)

**What persists in background**:
- User message (with fast_turn marker)
- Assistant message (with fast_turn marker)
- Thread state update (speakLiveStateJson)

### 4. LLM Response Speed

- **Token cap lowered**: 260 → 180 for live replies
- **Short response instruction**: "1 short sentence (max 15 words)" in micro prompt
- **Model**: `LIVE_REPLY_MODEL` env var (default gpt-4o-mini)

### 5. Client UX States

New `got_it` status added to `LiveSessionStatus`:
- `listening` → `got_it` → `replying` → `speaking` → `idle`
- "Got it — replying…" shown immediately when transcript commits
- "Replying…" shown when first LLM delta arrives
- Audio starts playing as soon as first TTS chunk resolves

Slow network fallback:
- If no LLM delta within 3s, shows "Still thinking — assistant will reply soon…"

### 6. Performance Profiling

Extended `LiveSpeechLatencyTrace` with new metrics:
- `autoCommitMs`: time from speech end to auto-commit
- `firstTtsChunkReadyMs`: when first chunked TTS audio is ready
- `ttsChunkCount`: number of TTS chunks requested
- `usedChunkedTts`: boolean
- `promptChars`: prompt size in characters
- `recentTurnsIncluded`: number of prior turns in prompt
- `responseTextLength`: assistant reply length
- `usedFastTurn`: whether fast-turn endpoint was used

## What Did NOT Change

- Post-session evaluation pipeline (already separated)
- Enrichment (already not on hot path)
- Existing `sendConversationMessageStream` NDJSON path (kept, now with chunked TTS overlay)
- Existing `speakLiveTurn` bundled path (kept as fallback)
- Database schema
- Azure Pronunciation Assessment (post-session only)

## Estimated Impact

| Metric | Before | After (target) |
|--------|--------|----------------|
| Turn end → transcript | ~5.3s | <1.0s (auto-commit) |
| Transcript → first LLM token | ~1.6s | <0.5s (fast endpoint) |
| LLM total | ~16.2s | <3s (shorter replies + model) |
| First audio | after full LLM+TTS | after first clause TTS |
| Total to first playback | ~22.9s | <2.5s |

## Remaining Bottlenecks

- **Azure STT latency**: Browser Azure STT partial recognition takes ~200-500ms; limited control
- **LLM cold starts**: Azure OpenAI deployments can have cold start spikes; mitigated by keeping deployment warm
- **Network round-trips**: Each TTS chunk is a separate HTTP call; could be optimized later with server-side TTS streaming via SSE
- **First sentence length**: If the model generates a very long first sentence, first audio is delayed until it completes

## Files Changed

### New files
- `backend/src/services/speak-live/liveTtsChunkService.ts` — clause splitter + chunk TTS
- `backend/src/services/speak-live/liveFastTurnService.ts` — fast-turn NDJSON service
- `src/features/speak-live/live/useChunkedTtsPlayback.ts` — client-side chunked TTS playback hook
- `src/features/speak-live/live/useTurnAutoCommit.ts` — auto-commit silence detection hook

### Modified files
- `backend/src/http/registerHttpFunctions.ts` — new endpoints registered
- `backend/src/services/ai/config/aiProviderConfig.ts` — token cap lowered
- `backend/src/prompts/liveSpeakMicroLlmPrompt.ts` — short response instruction
- `src/lib/speech/speakLivePipelineDebug.ts` — new pipeline phases
- `src/features/speak-live/live/liveSpeechLatencyTrace.ts` — extended metrics
- `src/features/speak-live/live/LiveSpeechPerfOverlay.tsx` — new metrics in overlay
- `src/features/speak-live/live/liveSpeakTypes.ts` — `got_it` status
- `src/features/speak-live/live/LiveStatusBadge.tsx` — `got_it` badge
- `src/features/speak-live/live/useLiveSpeakStt.ts` — `onSpeechEnd` callback
- `src/features/speak-live/live/LiveConversationScreen.tsx` — auto-commit, chunked TTS, UX states
- `src/lib/api/conversationClient.ts` — `sendFastTurn` + `speakLiveTtsChunk` methods
