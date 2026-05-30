# AI Conversation Engine — Architecture

## Overview

The AI Conversation Engine provides backend orchestration for real-time conversational language practice. It supports:

1. **Text conversation simulations** — chat-based scenario practice with corrections and feedback.
2. **Voice-based conversational tutoring** — via STT → conversation → TTS and pronunciation scoring (interfaces; integration with Azure Speech / ElevenLabs is pluggable).

## Principles

1. **Provider abstraction** — No tight coupling to a single AI provider. Adapters for OpenAI, Anthropic, Azure OpenAI, and a mock provider.
2. **Structured prompt templates** — All prompts versioned and built from scenario + level + constraints.
3. **Conversation session state** — Sessions track learner, scenario, CEFR level, messages, corrections, and progress.
4. **Deterministic orchestration** — Engine controls prompt construction and response parsing (e.g. `[CORRECTION: ...]`).
5. **Safety** — User and (optionally) tutor content pass moderation before/after.
6. **Observability** — Telemetry hooks for session start/end and turn processing.

## Directory Layout

```
src/ai-conversation-engine/
├── config/          # defaultConfig, scenario registry
├── types/           # session, scenario, provider, API contracts
├── prompts/        # template system, buildSystemPrompt, parseTutorResponse
├── providers/      # IConversationProvider, mock + future OpenAI/Azure
├── orchestrator/   # processTurn (conversation loop)
├── session/        # in-memory session store (swap for Redis/DB)
├── safety/         # IModerationService, MockModerationService
├── analysis/       # grammar/vocab analysis (mock; LLM in production)
├── feedback/       # buildFeedbackFromSession, buildSessionSummary, scoring
├── voice/          # STT, TTS, pronunciation interfaces + mocks
├── telemetry/      # recordTurn, recordSessionStart/End, setTelemetryRecorder
├── api/            # startConversation, sendMessage, endConversation, getConversation
├── lib/            # createSessionId (cross-env UUID)
└── tests/
```

## Conversation Loop

1. **Receive** user message (text or STT result).
2. **Moderate** user input; reject if blocked.
3. **Analyze** (optional) grammar/vocabulary for feedback.
4. **Build** system prompt from template + scenario + CEFR level.
5. **Call** provider with system + conversation history + user message.
6. **Parse** tutor response; extract `[CORRECTION: ...]` if present.
7. **Update** session with user message and tutor message (and corrections).
8. **Record** telemetry; return tutor response + corrections to client.

## Session Model

- `session_id`, `user_id`, `scenario_id`, `cefr_level`, `conversation_type` (text | voice)
- `start_time`, `messages[]`, `status` (active | completed | abandoned | error)
- `feedback`, `summary` (set on session end)
- Each message: `role`, `content`, `timestamp`, `analysis?`, `corrections?`

## API Facade (Backend Integration)

- **startConversation(request)** → `StartConversationResponse` (session_id + session)
- **sendMessage(request)** → `SendMessageResponse` (user message, tutor response, corrections, feedback_snippet) or `{ error }`
- **endConversation(request)** → `EndConversationResponse` (session + summary) or `{ error }`
- **getConversation(sessionId)** → `GetConversationResponse` or `{ error }`

Map these to REST: `POST /conversation/start`, `POST /conversation/message`, `POST /conversation/end`, `GET /conversation/:id`.

## Voice Pipeline

- **STT**: `ISpeechToTextService.transcribe(audio)` → `{ text, confidence? }`
- **TTS**: `ITextToSpeechService.synthesize(text)` → `{ audio_base64 }`
- **Pronunciation**: `IPronunciationService.score(audio, reference_text)` → `{ score, feedback? }`

Flow: Audio → STT → conversation engine (same as text) → TTS output; pronunciation scoring can be called after user utterance or at session end.

## Safety

- `IModerationService.check({ text, context })` → `{ allowed, flags?, reason? }`
- Mock implementation: block empty input and simple blocklisted patterns. Production: use provider moderation API (e.g. OpenAI Moderation).

## Frontend Compatibility

Responses align with the learner UI:

- **Chat message** — `tutor_response.content`
- **Correction notes** — `tutor_response.corrections` and `feedback_snippet`
- **Feedback summary** — `session.feedback` after end
- **Session completion summary** — `session.summary` (conversation_summary, grammar_mistakes_list, new_vocabulary_learned, pronunciation_score, recommended_next_lessons)
