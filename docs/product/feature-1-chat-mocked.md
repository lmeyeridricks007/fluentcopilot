# Feature 1 — Chat (text conversation), mocked vertical slice

## What ships

- **Talk landing**: continue card for an in-progress train-station thread, plus “Start train station chat” (always available). Setup sheet: Guided/Free, feedback after each reply vs at end, then **Start conversation**.
- **Chat thread** (`/app/talk/chat/[threadId]`): WhatsApp-style bubbles, compact dismissible scene context, sticky composer, guided suggestion chips, typing indicator, inline coach blocks when feedback mode = after each, save-to-Library from assistant lines and coach items.
- **Recap** (`/app/talk/chat/[threadId]/recap`): light summary after **End conversation**; deferred coaching list when feedback was at end.

## Real vs mocked

| Real | Mocked |
|------|--------|
| UI, navigation, composer, persistence (`localStorage` via Zustand) | Persona “intelligence” |
| Per-user thread isolation in the store document | LLM / backend |
| Library entries from chat (`addWordFromChat`) | Definitions / translations for saved words |

## Conversation engine (mock)

- File: `src/features/feature1-chat/services/mockConversationEngine.ts`
- **Intent detection**: normalized text + regex/keyword scoring for platform, delay, on-time, transfer, destination/confirmation, thanks/close, unclear.
- **Replies**: template Dutch lines bounded to the train-station scenario; slight variation if the user repeats a topic.
- **Stages** (`opening` → `platform_ok` / `timing_ok` / `route_ok` / `closing` / `ended`): updated from detected intent to drive recap copy.
- **Coach feedback**: light heuristics (mixed English, missing “perron/spoor”, etc.). Shown inline when `feedbackMode === 'after_each'`, else appended only to `pendingFeedback` for the recap.

## Data models

- Types: `src/features/feature1-chat/types.ts` — `ScenarioConfig`, `PersonaConfig`, `ConversationThread`, `ChatMessage`, `FeedbackItem`, `ConversationSummary`, `MockIntentResult`, etc.

## Persistence

- Store: `src/features/feature1-chat/store/conversationStore.ts`, persist key `fc-feature1-chat-v1`.
- Threads keyed by authenticated user id, or `LOCAL_ANONYMOUS_LEARNER_ID` for anonymous demo (see `src/lib/storage/storageKeys.ts`).
- Note: `src/features/feature1-chat/store/threadPersistence.ts` documents the key and sharding approach.

## Phase 2 (backend + LLM)

- Replace `runMockEngineTurn` / `classifyIntent` with an API client that streams assistant text and structured coach payloads.
- Map API DTOs onto the same `ConversationThread` / `ChatMessage` shapes to avoid UI churn.
- Swap `persist` rehydration for sync-from-server (keep persist as offline cache if needed).
- Extend `saveWordService` to POST saved lexemes instead of `usePersonalLibraryStore`.
