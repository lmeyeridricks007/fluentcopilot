# Live speech vs post-session evaluation (architectural boundaries)

FluentCopilot Speak Live has two distinct pipelines:

| Lane | When | Work |
|------|------|------|
| **Live turn** | Each learner utterance during the session | STT, fast transcript shaping, reply LLM, optional server TTS, persistence |
| **Post-session deep evaluation** | After **End conversation** | Azure pronunciation assessment, evaluation LLM, reference TTS, `LiveSessionEvaluation` JSON, training-item hooks |

Regressions that call heavy scoring from the live path add latency and cost. This document describes how we guard against that.

## Hard rules

1. **Live-only modules** (`liveSpeechTurnService`, `speakLiveTurnService`, `liveConversationService`, `speechRecognitionService`) must not contain static `from '…'` imports whose path includes any fragment listed in `backend/src/services/speak-live/liveEvaluationImportBoundary.ts` (`FORBIDDEN_IMPORT_PATH_FRAGMENTS`).
2. **No pronunciation assessment** on the live recognition path — use STT / `speechToTextGateway` only (`speechRecognitionService.ts` documents this).
3. **No post-session orchestrator or evaluation HTTP** from those files.
4. **Recap generation for the end-of-session summary** runs only inside `endConversation` in `conversationAppService.ts` (not inside `sendConversationMessage` / NDJSON stream).
5. **`seedPendingLiveEvaluation`** is invoked only from `endConversation`, via **dynamic `import()`** so the evaluation app module is not part of the static graph of `conversationAppService` at load time (live callers still share the file, but avoid eager evaluation wiring).

## Code map

- **Live fast path helpers**: `backend/src/services/speak-live/liveSpeechTurnService.ts`
- **Live HTTP turn** (`/speak-live/turn`): `speakLiveTurnService.ts` → `conversationAppService.sendConversationMessage`
- **Live NDJSON stream**: `conversationAppService.streamSendConversationMessageNdjson`
- **Post-session report**: `postSessionEvaluationService.ts` → `speakLivePostSessionEvaluationPipeline.ts` → `liveSessionEvaluationOrchestrator.ts` (merge / premium / assembly) + `speakLivePostSessionSpeechAssessment.ts` (Azure) + `speakLiveTranscriptEvaluationService.ts` (OpenAI) + `liveTurnVoicePrepService.ts` / `voiceEvaluationService.ts`
- **Evaluation API**: `liveSessionEvaluationHttp.ts` → `liveSessionEvaluationAppService.ts`

## Anti-regression measures

1. **Central forbidden-import list**: `liveEvaluationImportBoundary.ts` + `assertLiveSpeechBoundarySources()`.
2. **Vitest**: `backend/src/services/speak-live/liveEvaluationBoundaries.test.ts` — scans live boundary files on every test run; positive checks that post-session modules and `endConversation` still wire evaluation + recap.
3. **Comments** on `streamSendConversationMessageNdjson`, `speakLiveTurnService`, and the dynamic import in `endConversation` pointing here.

## Changing the rules

If a new post-session module is added, update `FORBIDDEN_IMPORT_PATH_FRAGMENTS` and this doc. If a file is added to the live-only list, append it to `LIVE_SPEECH_BOUNDARY_RELATIVE_FILES`.
