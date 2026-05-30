# Live speech turn service (`LiveSpeechTurnService`)

This document describes the **fast live speech turn path** for FluentCopilot Speak Live: what runs while the learner is talking, what is explicitly excluded, and how turn artifacts are persisted for **post-session** evaluation.

## Role

The live path answers one question: **“Given what the learner just said, what should the in-scene assistant say next?”**

Heavy coaching, pronunciation scoring, grammar reports, and recap generation are **out of scope** here. They run only after the session ends (see `post-session-evaluation-pipeline.md` and `live-vs-post-session-architecture.md`).

## Module

| Artifact | Path |
| -------- | ---- |
| Service API (object facade) | `backend/src/services/speak-live/liveSpeechTurnService.ts` |
| HTTP + LLM orchestration | `conversationAppService.sendConversationMessage` / `streamSendConversationMessageNdjson` |
| Bundled STT + optional server TTS | `speakLiveTurnService.speakLiveTurn` |

Import the namespace-style export:

```ts
import { LiveSpeechTurnService } from '../services/speak-live/liveSpeechTurnService'
```

## Responsibilities (live path)

1. **Final utterance** — Client sends finalized transcript (browser STT or server STT from `speak-live/turn`).
2. **Transcript pair** — `preprocessLiveSpeechTranscript` produces:
   - `transcriptRaw` — outer trim, preserve learner meaning.
   - `transcriptNormalized` — Unicode space unify, whitespace collapse, light punctuation spacing, **one** safe leading disfluency strip (`eh`, `ehm`, `uh`, …).
3. **Conversation continuation** — `message.content` and the LLM use **`transcriptNormalized`** only. No heavy rewrite.
4. **Minimal context** — Recent messages are capped with `sliceRecentForLiveSpeechTurn` (default **5**, override `LIVE_SPEECH_RECENT_MESSAGES_MAX`).
5. **Fast LLM** — Ultra-lean Stage A (`buildSpeakLiveUltraLeanChatMessages`) when `SPEAK_LIVE_ULTRA_LEAN_PROMPT` is on. Optional CEFR line from `inputMeta.learnerLevelCefr` or thread summary (`resolveLearnerCefrForLiveTurn`).
6. **TTS** — Prefer **client** async TTS after NDJSON stream. For `speak-live/turn`, set `SPEAK_LIVE_SERVER_TTS_ASYNC=1` to fire server TTS in the background and return an empty `audioUrl` immediately.

## Explicitly not called on live turns

- Azure pronunciation assessment  
- Turn-level grammar / sentence / rhythm / clarity reports  
- Score aggregation, learning recommendations, phrase extraction, recap LLM  

Those live only in `liveSessionEvaluationOrchestrator` / `voiceEvaluationService` after `POST …/end`.

## Persistence (turn record on messages)

Learner **user** row metadata (merged over the turn) includes:

| Field | Meaning |
| ----- | ------- |
| `sessionId` | Thread UUID |
| `turnId` | Same as learner message id (patched after insert) |
| `speaker` | `"learner"` |
| `transcriptRaw` | Verbatim (trimmed) STT line |
| `transcriptNormalized` | Line passed to LLM / `content` |
| `normalizedTranscript` | Back-compat duplicate of normalized |
| `learnerAudioRef` | Blob-relative path when upload succeeded (`learnerAudioBlobPath` alias) |
| `liveSpeechTurn` | `true` |
| `latencyTrace` / `liveTurnLatencyTrace` | Server perf snapshot |

Assistant row metadata includes `liveSpeechTurn`, `sessionId`, `turnId` (learner message id), `speaker: "assistant"`, `assistantText`.

## Environment

| Variable | Purpose |
| -------- | ------- |
| `LIVE_SPEECH_RECENT_MESSAGES_MAX` | 2–16, default 5 — recent turns into Stage A |
| `SPEAK_LIVE_SERVER_TTS_ASYNC` | `1` / `true` — non-blocking server TTS on `speak-live/turn` |

## Client contract

`POST …/messages/stream` body `inputMeta` may include `learnerLevelCefr: 'A1' \| 'A2' \| 'B1' \| 'B2'` (see `UserInputMetaSchema` and `UserMessageInputMeta` on the client).

## See also

- [live-speech-fast-path.md](./live-speech-fast-path.md)  
- [live-vs-post-session-architecture.md](./live-vs-post-session-architecture.md)  
