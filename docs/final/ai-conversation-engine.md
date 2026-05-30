# AI Conversation Engine — Final Summary

## Overview

The **AI Conversation Engine** provides backend orchestration for real-time conversational language practice on the AI Language Coach platform. It supports **text conversation simulations** and **voice-based tutoring** (via pluggable STT/TTS and pronunciation services), with provider-agnostic AI, structured prompts, session state, safety checks, feedback, and telemetry.

---

## Architecture

- **Location**: `src/ai-conversation-engine/`
- **Entry**: `api/conversationApi.ts` — `startConversation`, `sendMessage`, `endConversation`, `getConversation`
- **Orchestration**: `orchestrator/conversationLoop.ts` — `processTurn` (moderation → analysis → provider → parse → session update)
- **Provider**: `providers/` — `IConversationProvider`, mock implementation; register OpenAI/Azure/Anthropic adapters via `registerProvider`
- **Session**: In-memory store in `session/sessionStore.ts`; replace with Redis/DB for production
- **Prompts**: `prompts/templates.ts` — `ConversationPromptTemplate`, `buildSystemPrompt`, `parseTutorResponse` for `[CORRECTION: ...]`
- **Scenarios**: `config/scenarios.ts` — built-in registry (café, supermarket, doctor, workplace, introductions, customer service, social, school/daycare, dating, travel) with CEFR-aware roleplay instructions
- **Safety**: `safety/moderation.ts` — `IModerationService`, mock implementation; plug provider moderation API
- **Feedback**: `feedback/summary.ts`, `feedback/scoring.ts` — session feedback and summary for learner UI
- **Voice**: `voice/types.ts`, `voice/mockVoice.ts` — STT, TTS, pronunciation interfaces and mocks
- **Telemetry**: `telemetry/events.ts` — `recordTurn`, `recordSessionStart`/`recordSessionEnd`, `setTelemetryRecorder`

---

## Prompt Design

- System prompt is built from **template + scenario context + CEFR level + locale**.
- Constraints: Dutch only, level-appropriate, gentle correction, stay in character.
- Tutor may append one line: `[CORRECTION: ...]`; engine parses it and attaches to the message and feedback snippet.
- All prompts are versioned and structured; no ad-hoc concatenation of user input into system prompt.

---

## Session Model

- **Session**: `session_id`, `user_id`, `scenario_id`, `cefr_level`, `conversation_type` (text | voice), `start_time`, `messages[]`, `feedback?`, `summary?`, `status`, `locale?`
- **Message**: `role` (user | tutor), `content`, `timestamp`, `analysis?`, `corrections?`
- **Summary** (on end): `conversation_summary`, `grammar_mistakes_list`, `new_vocabulary_learned?`, `pronunciation_score?`, `recommended_next_lessons?`

---

## Speech Pipeline

- **STT**: `ISpeechToTextService.transcribe(audio)` → text (and optional confidence).
- **TTS**: `ITextToSpeechService.synthesize(text)` → audio (e.g. base64).
- **Pronunciation**: `IPronunciationService.score(audio, reference_text)` → score and feedback.
- Flow: Audio → STT → same conversation engine as text → optional TTS playback; pronunciation can be used per turn or at session end.
- Integration points: Azure Speech, ElevenLabs, OpenAI Whisper (optional); implemented via adapters, not in core.

---

## Provider Abstraction

- **Interface**: `IConversationProvider.generateResponse(GenerateResponseInput)` → `Promise<GenerateResponseResult>`.
- **Config**: `defaultConfig.default_provider` (e.g. `"mock"`); switch to `"openai"` / `"azure"` when adapters are added.
- **Mock**: Returns scenario-aware Dutch replies and optional correction line for development and tests.
- **Production**: Implement adapters that build messages from the same system + history format and return `content` (+ optional usage/finish_reason).

---

## Safety Controls

- **Moderation**: Every user message is passed to `IModerationService.check()` before being added to the session. Blocked messages return an error and are not stored.
- **Prompt safety**: System prompt uses only trusted scenario and level data; user content appears only in the user role in the conversation history.
- **Output**: Tutor response is parsed; only content and optional correction are exposed to the client.

---

## Integration with Learner App

The engine responses align with the existing learner UI:

| UI element | Engine output |
|------------|----------------|
| Chat message | `tutor_response.content` |
| Correction panel / tip | `tutor_response.corrections`, `feedback_snippet` |
| Feedback summary (post-session) | `session.feedback` |
| Session completion summary | `session.summary` (conversation_summary, grammar_mistakes_list, new_vocabulary_learned, pronunciation_score, recommended_next_lessons) |

Frontend can call backend REST endpoints that map to `startConversation`, `sendMessage`, `endConversation`, `getConversation` (see `docs/ai-conversation/api-contracts.md`).

---

## API Contracts

- **POST /conversation/start** — body: `StartConversationRequest`; response: `StartConversationResponse`.
- **POST /conversation/message** — body: `SendMessageRequest`; response: `SendMessageResponse` or `{ error }`.
- **POST /conversation/end** — body: `EndConversationRequest`; response: `EndConversationResponse` or `{ error }`.
- **GET /conversation/:id** — response: `GetConversationResponse` or `{ error }`.

Types are defined in `src/ai-conversation-engine/types/api.ts` and `session.ts`.

---

## Tests and Quality

- **Tests**: `src/ai-conversation-engine/tests/` — conversation API (start, message, end, get, errors), prompts (buildSystemPrompt, parseTutorResponse), safety (mock moderation). All 13 conversation-engine tests passing; full suite (content-engine + ai-conversation-engine) 26 tests.
- **Reviews**: `docs/reviews/ai-conversation-engine-review-1.md`, `docs/reviews/ai-conversation-engine-review-2.md` — scorecard categories ≥8–9/10; overall confidence 93%.
- **Audit**: `docs/audits/ai-conversation-engine-audit.md` — prompt safety, provider abstraction, conversation stability, speech pipeline robustness, session state correctness. **Verdict: Pass with improvements.**

---

## Recommended Next Steps

1. **Backend REST layer**: Expose the four API functions as POST/GET routes; add auth and rate limiting.
2. **Real provider**: Implement OpenAI and/or Azure OpenAI adapters; set `default_provider` and model in config.
3. **Session persistence**: Replace in-memory store with Redis or DB; keep same interface (`getSession`, `saveSession`, `updateSession`).
4. **Moderation**: Integrate provider moderation API (e.g. OpenAI Moderation) behind `IModerationService`.
5. **Voice**: Implement Azure Speech (or ElevenLabs) STT/TTS and optional pronunciation scoring behind existing voice interfaces.
6. **Grammar/analysis**: Replace mock analysis with LLM-based or dedicated grammar API for richer feedback.
7. **Telemetry**: Implement `setTelemetryRecorder` to send events to your analytics/monitoring backend.
