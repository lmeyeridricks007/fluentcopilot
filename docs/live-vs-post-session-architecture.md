# Speak Live: live vs post-session architecture

FluentCopilot Speak Live is intentionally split into **two pipelines** so learners get a responsive conversation first, and a rich coach report second.

## Why the split matters

If pronunciation scoring, grammar coaching, CEFR commentary, recap generation, save-item mining, and training recommendations all run **while the mic is live**, every turn pays the full cost of those models and services. That stacks latency (often many seconds per turn) and still produces coaching the learner cannot use until the turn is over anyway.

The product rule is simple:

- **Live path**: “What did they say, what should the assistant say next?”
- **Post-session path**: “How well did they speak, write, and fit the scene — for their level?”

## Pipeline A — fast live conversation

**Goal:** keep the scenario moving with low perceived latency.

**Allowed on the critical path**

- Capture learner audio (for storage, not for scoring during the turn).
- Fast speech-to-text (recognition only — “what was said?”).
- Light transcript normalization (trim, whitespace collapse).
- Scenario + FSM grounded assistant reply (Stage A JSON / stream).
- Optional assistant TTS (client-side async TTS is preferred on the transcript path).

**Not allowed on the critical path**

- Pronunciation / fluency / rhythm / clarity scoring from audio.
- Grammar or sentence-construction evaluation beyond what the **dialogue model** needs to stay coherent.
- CEFR coaching essays, recap JSON, save-item generation, training queue synthesis, or detailed scorecards.

Implementation touchpoints:

- `LiveConversationService` (`backend/src/services/speak-live/liveConversationService.ts`) — pipeline id + normalization helpers.
- `SpeechRecognitionService` (`speechRecognitionService.ts`) — STT entry with a live-only purpose label.
- `sendConversationMessage` / NDJSON stream in `conversationAppService.ts` — Speak Live turns skip per-turn enrichment (`enrichmentPending: false`, assistant metadata `enrichmentComplete: true`).

## Pipeline B — post-session deep evaluation

**Goal:** produce the premium voice report after the learner taps **End**.

**Runs here (not during each live turn)**

- Azure Pronunciation Assessment (and timing-derived rhythm signals) on **stored** learner clips via `VoiceEvaluationService` (`voiceEvaluationService.ts`).
- Transcript + scenario language coaching via `liveSessionEvaluationLlm.ts` (structured JSON).
- Level-grounded grammar block (`TurnLanguageEvaluation` on each turn in `liveVoiceEvaluationTypes.ts`).
- Session-level recap merge, training recommendations, reference TTS for coaching lines.

Orchestration:

- `PostSessionEvaluationService` → `buildLiveSessionEvaluationRecord` in `liveSessionEvaluationOrchestrator.ts`.
- HTTP: `GET/POST …/speak-live/session/{threadId}/evaluation` via `liveSessionEvaluationAppService.ts`.

## Session lifecycle (thread metadata)

`ConversationThreads.SpeakLivePostSessionPhase` tracks the second pipeline:

| Phase        | Meaning                                      |
| ------------ | -------------------------------------------- |
| `active`     | Live conversation in progress                 |
| `ending`     | `POST /conversations/{id}/end` accepted      |
| `evaluating` | Thread completed; evaluation job may run    |
| `evaluated`  | JSON report stored                           |
| `failed`     | Evaluation error (retry via existing UI)    |

## CEFR grounding

The learner’s selected level is captured when the Speak Live thread starts (see `startConversation` summary stamp). Post-session evaluation prefers that level via `learnerCefrLevelForLiveEvaluation` instead of only the scenario difficulty band, so grammar expectations match what the learner chose (A1 vs B1).

## Related docs

- [live-speech-fast-path.md](./live-speech-fast-path.md)
- [post-session-evaluation-pipeline.md](./post-session-evaluation-pipeline.md)
