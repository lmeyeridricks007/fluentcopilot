# AI Conversation Engine — API Contracts (REST Mapping)

Backend services can expose the engine as REST endpoints with the following mapping.

## POST /conversation/start

**Request body** (`StartConversationRequest`):

```json
{
  "user_id": "string",
  "scenario_id": "string",
  "cefr_level": "A1 | A2 | B1 | B2 | C1",
  "conversation_type": "text | voice",
  "locale": "optional string, e.g. nl-NL"
}
```

**Response** (`StartConversationResponse`):

```json
{
  "session_id": "uuid",
  "session": { /* ConversationSession */ },
  "initial_message": "optional string"
}
```

---

## POST /conversation/message

**Request body** (`SendMessageRequest`):

```json
{
  "session_id": "uuid",
  "content": "string",
  "source": "optional: text | stt"
}
```

**Response** (`SendMessageResponse`):

```json
{
  "message": { "role": "user", "content": "...", "timestamp": "...", "analysis?", "corrections?" },
  "tutor_response": { "role": "tutor", "content": "...", "timestamp": "...", "corrections?" },
  "corrections": [ { "original", "corrected", "explanation?" } ] | undefined,
  "feedback_snippet": "optional string"
}
```

**Error**: `{ "error": "string" }` (e.g. Session not found, Moderation blocked, Provider error).

---

## POST /conversation/end

**Request body** (`EndConversationRequest`):

```json
{
  "session_id": "uuid"
}
```

**Response** (`EndConversationResponse`):

```json
{
  "session": { /* ConversationSession with status completed, feedback, summary */ },
  "summary": {
    "conversation_summary": "string",
    "grammar_mistakes_list": [ { "message", "correction" } ],
    "new_vocabulary_learned": [ "string" ] | undefined,
    "pronunciation_score": number | undefined,
    "recommended_next_lessons": [ "string" ] | undefined
  }
}
```

**Error**: `{ "error": "string" }`.

---

## GET /conversation/:id

**Response** (`GetConversationResponse`):

```json
{
  "session": { /* full ConversationSession */ }
}
```

**Error**: `{ "error": "string" }` (e.g. Session not found).

---

## ConversationSession (reference)

- `session_id`, `user_id`, `scenario_id`, `cefr_level`, `conversation_type`, `start_time`, `status`, `locale?`
- `messages`: array of `{ role, content, timestamp, analysis?, corrections? }`
- `feedback?`: `{ grammar_mistakes, vocabulary_improvements, fluency_score?, cefr_match?, ... }`
- `summary?`: `{ conversation_summary, grammar_mistakes_list, new_vocabulary_learned?, pronunciation_score?, recommended_next_lessons? }`
