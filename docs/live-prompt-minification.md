# Live prompt minification (Speak Live LLM)

## Intent

The **live** assistant call must be as small and fast as possible: minimal prompt tokens, minimal completion tokens, and a **tiny** JSON shape. It must **not** reuse chat, recap, or enrichment prompt text.

## Dedicated builder

| Module | Role |
|--------|------|
| `backend/src/prompts/liveSpeakMicroLlmPrompt.ts` | **Default** live Stage A prompt — scenario title, persona role, CEFR, phase/goal index line, compact numbered goals, optional train **slot** line (trimmed), optional **grounding** one-liner, micro JSON contract. |
| `backend/src/prompts/liveSpeakUltraLeanPrompt.ts` | **Legacy** richer prompt (train orchestration JSON, support hints). Enable with `SPEAK_LIVE_LEGACY_ULTRA_LEAN_PROMPT=1`. |

Routing: `buildReplyOnlyChatMessages` in `TurnPromptBuilder.ts` → when `speakLive` + `SPEAK_LIVE_ULTRA_LEAN_PROMPT` (default on), uses **micro** unless legacy flag is set.

## What was removed from the default live prompt

- Recap / correction / grammar / save-word instructions  
- Long JSON schemas and verbose “contract” prose  
- Full train-station **orchestration JSON** block  
- `formatSpeakLiveSupportStrategyForPrompt` and long “practice mode” copy  
- Per-turn lines capped (recent dialogue as short `U:… \| A:…` segments)

## Response format (tiny JSON)

Models return **one** JSON object (OpenAI `json_object` mode):

```json
{
  "assistantText": "<Dutch, 1–2 short sentences>",
  "goalHit": []
}
```

- **`assistantText`** (or legacy **`assistantReply`**) — required visible reply.  
- **`goalHit`** — optional `string[]`: numeric strings (`"0"`, `"1"`) → goal indices; other strings (e.g. `ASK_PLATFORM`) → train `trainTurnResponse.answeredGoals`.  
- Legacy fields **`answeredGoals`**, **`trainAnsweredGoalIds`**, **`detectedUserIntentOptional`**, **`pendingGoalsOptional`** still parse and merge with `goalHit`.

Mapping: `validateAndMapLiveSpeakReplyJson` in `ResponseValidator.ts` → unchanged persistence / FSM envelope shape.

## Short-reply policy (in prompt)

The micro system text instructs:

1. One or two short sentences.  
2. Answer the learner directly.  
3. At most one brief follow-up question.  
4. No teaching, corrections, scores, or English explanation inside `assistantText`.

## Model and logging

- **Model:** `LIVE_REPLY_MODEL` (via `getOpenAiLiveReplyModel` / Azure live deployment) — not the enrichment / evaluation model chain.  
- **Max completion tokens:** default **260** for Speak Live (`getConversationTurnSpeakLiveReplyMaxOutputTokens`); override with `AI_CONVERSATION_SPEAK_LIVE_REPLY_MAX_OUTPUT_TOKENS`.  
- **Logs:** `speak_live_live_llm_stream` / `speak_live_live_llm_reply` include `model`, `promptChars`, `estimatedInputTokens`, `estimatedOutputTokens`, `durationMs`, `livePromptMicro` (true when micro prompt is active).

## Flags summary

| Env | Effect |
|-----|--------|
| `SPEAK_LIVE_ULTRA_LEAN_PROMPT=0` | Disable all ultra-lean paths; use full reply-only FSM prompt (slow). |
| `SPEAK_LIVE_LEGACY_ULTRA_LEAN_PROMPT=1` | Keep ultra-lean **on** but use **legacy** `liveSpeakUltraLeanPrompt` instead of micro. |
| `LIVE_REPLY_MODEL` | Fast live chat model id. |

## Acceptance checklist

- [x] Live prompt is a **separate** module from chat/recap/enrichment.  
- [x] Default live output schema is **small** (`assistantText` + `goalHit`).  
- [x] Reply policy is **short** and encoded in the micro system message.  
- [x] Live model is **not** the evaluation model; logging includes model + token estimates + latency.  

Further gains: lower `LIVE_REPLY_MODEL` latency tier, regional deployment, or (advanced) plain-text completion without JSON mode — not implemented here.
