# Speak Live — Train Station grounding audit

**Date:** 2026-04-12  
**Scope:** FluentCopilot **Speak Live** (`conversationSurface === 'speak_live'`), **Train Station** scenario (`slug: train-station`), real-time voice loop.  
**Symptom:** Conductor replies felt unrelated; recap claimed the learner did not ask about schedules even when they asked e.g. *Is de trein op tijd?*, *Hoe laat vertrekt de trein?*.

---

## Part 1 — Current flow (audited)

### 1.1 Entry points

| Step | Location | Role |
|------|----------|------|
| FE mic + upload | `src/features/speak-live/call/SpeakLiveCallScreen.tsx` (and related hooks) | Captures short audio, `POST` speak-live turn |
| HTTP | `backend/src/http/registerHttpFunctions.ts` → `speakLiveTurn` | Auth, body parse (`audioBase64`, `mimeType`, `threadId`, …) |
| Voice pipeline | `backend/src/services/speak-live/speakLiveTurnService.ts` | STT → `sendConversationMessage` → TTS |
| Text turn + persistence | `backend/src/services/conversation/conversationAppService.ts` → `sendConversationMessage` | Inserts user + assistant rows, Speak Live FSM update, thread summary |
| LLM reply | `createConversationAiProvider()` → `generateAssistantReplyOnly` | JSON reply + `speakLiveSignals` |
| Prompt assembly | `backend/src/services/ai/orchestration/TurnPromptBuilder.ts` → `buildReplyOnlyChatMessages` | System + user payload |
| Recap | `endConversation` → `generateEndSummary` | Uses `buildRecapMessages` + full message list |

### 1.2 Transcription

- **Service:** `getOpenAiSpeechToTextService()` → `transcribeAsync` (`openAiSpeechToTextService`).
- **Output:** `transcript` string passed as `sendConversationMessage({ text: transcript, inputMeta: { inputMode: 'speech', originalTranscript: transcript } })`.
- **Risk:** STT errors or English bias can still break grounding; this audit’s fixes are **downstream** of STT (orchestration + recap), not a replacement for STT quality.

### 1.3 Turn normalization

- **No separate NL normalizer** before LLM (aside from trim). User text is stored as returned by Whisper.
- **New (2026-04-12):** `normalizeLearnerUtterance()` in `scenarioIntentGrounding.ts` is used for **deterministic pattern matching** and dev logs only.

### 1.4 Intent / goal detection (before fix)

- **Implicit only:** The model was asked to fill `speakLiveSignals` (`intentLabel`, `goalIndexesCompleted`, `nextPhase`, `rollingSummaryEnglish`, …) per `REPLY_ONLY_JSON_CONTRACT` (`backend/src/prompts/jsonContracts.ts`).
- **No rule-based bridge** tied scenario goal **indices** to common Dutch patterns (on time, departure time, platform).
- **Failure mode:** The assistant could answer generically; `speakLiveSignals` could omit goal completion or mis-state the learner in `rollingSummaryEnglish`. That summary is **concatenated into the thread summary** for the next LLM call (`thread.summaryText` + `rollingSummaryEnglish`), so errors **compound**.

### 1.5 Scenario state tracking

- **Persisted:** `ConversationThread.speakLiveStateJson` → `SpeakLivePersistedState` (`backend/src/domain/speakLive/speakLiveFsm.ts`): `phase`, `goalIndex`, `goalsCompleted`, `rollingSummaryEnglish`, `intentLabel`, …
- **Transition:** `computeNextSpeakLiveState({ prev, signals, userTextTrimmed, … })` merges model `speakLiveSignals` with deterministic rules (e.g. greeting + any user text → `intent_detection`).

### 1.6 Assistant reply generation

- **System:** `buildReplyOnlySystemMessage` + optional **Speak Live block** `buildSpeakLiveFsmPromptBlock` (`speakLiveFsmPrompt.ts`) — scene, phase, numbered goals, instructions for JSON signals.
- **User payload:** `buildTurnUserPayload` — recent messages (oldest first) + final line `User message (Dutch, may mix English): …`.

### 1.7 Recap generation

- **Prompts:** `buildRecapSystemMessage` / `buildRecapUserPayload` (`backend/src/prompts/buildRecapMessages.ts`).
- **Context:** `ConversationRecapGenerationContext` includes scenario title/goals, `speakLiveRollingSummary`, `threadCurrentStage`, and **now** `speakLiveGoalsCompletedIndexes` (structured FSM output).
- **Risk (mitigated):** Recap LLM previously could overweight “Session notes” (`rollingSummaryEnglish`) vs transcript; recap rules now **explicitly** say: if session notes disagree with transcript, **trust the transcript** and verified goal list.

---

## Part 2 — Dev-only diagnostics

Enable structured logs and HTTP response extras:

```bash
export SPEAK_LIVE_DEBUG_TURNS=1
```

| Mechanism | What you get |
|------------|----------------|
| **Console JSON** | One line per turn from `sendConversationMessage`: `msg: speak_live_turn_debug`, raw + normalized transcript, `groundingPatch`, model vs merged `speakLiveSignals`, summary preview. |
| **Message metadata** | When debug is on: `speakLiveSignalsModelRaw` (pre-merge model hints), `speakLiveTurnDebug` (normalized transcript + patch + summary preview). |
| **`POST /api/speak-live/turn` response** | Optional `speakLiveDebug` object (merged + raw signals, thread `speakLiveStateJson` snapshot, recap preview head). |

**Note:** Do not enable `SPEAK_LIVE_DEBUG_TURNS` in production without log redaction policy — transcripts are PII.

---

## Part 3 — Root cause (diagnosis)

**Primary cause:** Grounding for goals and recap depended almost entirely on the **reply-only LLM** filling `speakLiveSignals` and `rollingSummaryEnglish` correctly. For Train Station, common learner lines (*op tijd*, *hoe laat*, *perron*) were **not enforced** against scenario goal indices (0 = platform, 1 = schedule/delay/destination, …). Wrong or empty signals → wrong FSM progress → wrong rolling summary → **next-turn prompt** and **recap** both drifted from what the learner actually said.

**Contributing factors:**

1. **Recap authority:** Session notes could contradict the transcript; recap prompt did not hard-require transcript precedence.
2. **Phase stickiness:** Without reliable `nextPhase: execution` when the learner asked a clear info question, the model could keep the arc in `intent_detection` while answering off-topic.
3. **No deterministic intent layer** for the seeded `train-station` slug (now addressed).

**Not the primary root cause for the reported bug:** Microphone capture or audio upload (they were already delivering text into `sendConversationMessage`); failures were in **orchestration + recap grounding**.

---

## Part 4 — Fixes implemented (2026-04-12)

| Change | File(s) |
|--------|---------|
| Deterministic **Train Station** pattern → goal indices + English facts | `backend/src/domain/speakLive/scenarioIntentGrounding.ts` |
| Merge model `speakLiveSignals` with deterministic patch **before** FSM | `conversationAppService.ts` |
| Inject **verified grounding** into Speak Live system block | `speakLiveFsmPrompt.ts`, `TurnPromptBuilder.ts`, `AiConversationTurnRequest.ts` |
| Recap: transcript-over-notes rule + **goalsCompleted** indexes in context | `buildRecapMessages.ts`, `contracts.ts`, `conversationAppService.ts` (`endConversation`) |
| Dev logs + optional API `speakLiveDebug` | `conversationAppService.ts`, `speakLiveTurnService.ts` |
| Unit tests | `scenarioIntentGrounding.test.ts`, `vitest.config.ts` |

### Acceptance checklist

| Requirement | Status |
|-------------|--------|
| Audit doc exists | Yes (this file) |
| Failure point identified | Yes (LLM-only signals + recap weighting) |
| Dev diagnostics available | Yes (`SPEAK_LIVE_DEBUG_TURNS=1`) |
| Fix plan clear | Yes — deterministic grounding + merge + recap rules; extend `groundSpeakLiveUserTurn` for more scenarios later |

---

## Next steps (recommended)

1. **Extend grounding** beyond `train-station` using the same pattern (slug → matchers → goal indices), or drive matchers from **scenario metadata** in DB if goals become data-defined.
2. **STT prompt / language lock** for Dutch-only sessions to reduce garbage transcripts.
3. **FE dev panel** (optional): surface `speakLiveDebug` from the turn response when `NEXT_PUBLIC_DEV_TOOLS` (or similar) is on.
4. **Telemetry:** log `groundingPatch.goalIndexesCompleted` counts (no raw text) in prod for quality dashboards.
