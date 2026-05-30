# LLM Orchestration — Integration Deep-Dive

**Integration**: Strategy (OpenAI primary, Anthropic fallback).  
**Version**: 1  
**Status**: Implementation-grade

---

## 1. Purpose

Specify the **LLM integration** for the AI Dutch Coach: scenario conversation (FD-03), voice tutor responses (FD-04), daily reflection lesson generation (FD-07), and AI tutor feedback (FD-11). Covers adapter design, prompt orchestration, moderation (IS-017), model routing, cost control, fallbacks, and local/staging/production behavior.

---

## 2. Core Concept

- **Orchestrator**: Backend component that builds prompts from context (scenario, user message, level, locale), calls an LLM provider (OpenAI or Anthropic), moderates output (IS-017), and returns sanitized text. Multiple use cases share the same adapter with different prompt templates and parameters.
- **Source of truth**: Our content (scenario definitions, prompt templates) and conversation/session state; LLM is stateless; we persist inputs and outputs for feedback and safety.

---

## 3. Why This Integration Exists

- **Scenario simulations**: AI acts as conversation partner in Dutch; user types or speaks (transcribed); AI responds in character and may correct gently.
- **Voice tutor**: LLM generates responses that are then spoken via TTS.
- **Daily reflection**: LLM generates personalized lesson content from user’s notes/photos/location.
- **AI feedback**: LLM generates post-activity feedback (grammar, vocabulary, suggestions). All AI-generated text must be moderated (IS-017) and indicated as AI (IS-016).

---

## 4. Business Capabilities Enabled

- **Conversation**: Turn-by-turn dialogue in Dutch with level-appropriate language and scenario-specific persona.
- **Content generation**: Reflection lessons, feedback paragraphs, corrections.
- **Consistency**: Single adapter and moderation path for all LLM use cases; cost and rate limits applied per user/tier.

---

## 5. Scope

### 6. In Scope

- Chat completions (and optional streaming) for conversation and generation.
- Prompt construction from templates (scenario, level, locale, system + user messages).
- Output moderation (block or rewrite unsafe output); fallback message if blocked.
- Primary provider (OpenAI) and fallback (Anthropic) on failure or config.
- Rate limiting and cost controls per user/tier; optional token caps per request.
- Local dev: mock adapter or test API key; optional local proxy.

### 7. Out of Scope

- Fine-tuning (use base or hosted models only). Image generation. Embeddings (future search). Training on user data (provider policy; we do not send PII beyond what’s needed for prompt).

---

## 8. Triggering Flows / Usage Points

| Trigger | Flow |
|---------|------|
| POST /v1/conversation/turn | AI Conversation service builds prompt from scenario + user message → Orchestrator → LLM adapter → Moderation → persist and return AI message. |
| POST /v1/voice/turn (text or transcript) | Same as above; response text is then sent to TTS. |
| Daily reflection lesson generation | Job or sync: aggregate user activities → build prompt → LLM → moderate → persist generated lesson. |
| POST /v1/feedback/generate | Aggregate session/lesson data → build prompt → LLM → moderate → persist and return feedback. |

---

## 9. Inputs

- **Conversation turn**: scenario_id, session_id, user_message, conversation_history (last N turns), level, locale.
- **Reflection generation**: user_id, activities (notes, venue types), profile (level, goals), locale.
- **Feedback generation**: activity_type, session_id or lesson_id, transcript or answers, score, level.
- **Adapter**: messages array (system, user, assistant); model id; max_tokens; temperature (from config per use case).

---

## 10. Outputs

- **Success**: { content: string } (sanitized); optional usage (prompt_tokens, completion_tokens) for cost tracking.
- **Moderation block**: Fallback message (e.g. “I couldn’t generate a response. Please try again.”); log event; do not persist blocked content.
- **Provider error**: 503 or retry; after fallback provider attempt, return 503 and user-facing “Service temporarily unavailable.”

---

## 11. Data Domains Involved

- **Scenarios**: scenario_id, prompt_template, system_prompt, level.
- **Conversation sessions**: session_id, scenario_id, turns (user, assistant), created_at.
- **Generated lessons**: lesson content, source_activities, model_id (audit).
- **Feedback**: feedback_id, activity_type, source_id, content, model_id.
- **Analytics**: token usage per user/tier; cost estimates; moderation events.

---

## 12. Source of Truth Rules

- **Prompts**: Our templates and scenario definitions are source of truth; LLM output is derived and must be moderated before storage or display.
- **History**: We persist only moderated, approved content; never store raw unmoderated LLM output.

---

## 13. Authentication Model

- **Provider API**: Backend uses API key (OPENAI_API_KEY or ANTHROPIC_API_KEY) in header (Bearer or provider-specific). Stored in env; never in client.
- **Our API**: All LLM-triggering endpoints require authenticated user; consent and entitlement checked where applicable.

---

## 14. Authorization / Consent Model

- **Entitlement**: Scenario and voice flows require premium or trial (or within free cap if product allows). Reflection and feedback may be gated by feature.
- **Consent**: Use of AI-generated content is covered by terms; no separate consent for LLM call beyond general product consent.

---

## 15. Configuration Model

| Key | Type | Description | Example |
|-----|------|-------------|---------|
| LLM_PROVIDER_PRIMARY | string | openai \| anthropic | openai |
| LLM_PROVIDER_FALLBACK | string | anthropic \| openai | anthropic |
| OPENAI_API_KEY | string | OpenAI key | sk-... |
| ANTHROPIC_API_KEY | string | Anthropic key | sk-ant-... |
| OPENAI_MODEL | string | Model id | gpt-4o or gpt-4o-mini |
| ANTHROPIC_MODEL | string | Model id | claude-3-sonnet |
| LLM_MAX_TOKENS | number | Max completion tokens per request | 1024 |
| LLM_TEMPERATURE | number | 0–1 | 0.7 |
| LLM_RATE_LIMIT_PER_USER_PER_MIN | number | Requests per user per minute | 20 |

---

## 16. Environment Strategy

| Env | Keys | Behavior |
|-----|------|----------|
| **Local** | Test API key or mock | Mock adapter returns fixed responses; or real key with low quota. No PII in prompts in logs. |
| **Staging** | Test keys | Same as prod config but test keys; optional lower rate limits. |
| **Production** | Live keys, EU endpoint if available | OpenAI/Anthropic with production keys; use EU region option if provider supports. |

---

## 17. Data Flow Design

1. **Request** → Auth → Entitlement/consent → Load context (scenario, history) → Build messages from template.
2. **Adapter** → Select provider (primary or fallback) → POST to provider chat API with messages, model, max_tokens, temperature.
3. **Response** → Parse content → **Moderation** (block list, safety classifier, or provider moderation API) → If pass: return content; if fail: return fallback message, log, do not persist.
4. **Persistence** → Save only moderated content to conversation/feedback/generated_lesson.

---

## 18. Sync / Polling / Webhook Design

- **Sync**: All LLM calls are request/response. Optional streaming for conversation (chunked response); client consumes stream; backend still moderates full content before persisting if needed, or persist per chunk with final moderation.
- **Async**: Reflection lesson generation can be job-based: job receives user_id and date; fetches activities; builds prompt; calls LLM; moderates; saves lesson; notifies or updates session set.

---

## 19. Failure Handling

| Failure | Handling |
|---------|----------|
| Provider 5xx / timeout | Retry once with backoff (e.g. 2s); if fallback provider configured, try fallback; else return 503 to client. |
| Provider 429 (rate limit) | Retry after Retry-After; or return 429 to client with “Too many requests.” |
| Provider 401/403 | Log; do not retry; return 503 “Service unavailable” (config error). |
| Moderation block | Return fallback message to user; log moderation event; do not persist. |
| Invalid response (empty, malformed) | Retry once; if still invalid, return fallback message. |

---

## 20. Retry Strategy

- **Transient errors**: One retry with 2s backoff for 5xx and timeouts. If fallback provider, one attempt to fallback before returning 503.
- **Rate limit (429)**: Respect Retry-After; one retry per request. Application-level: rate limit per user to avoid hitting provider limit.

---

## 21. Rate Limiting / Quota Considerations

- **Provider**: OpenAI and Anthropic have RPM/TPM limits per key. Use tiered limits (e.g. premium higher than free) and queue or reject when over.
- **Our API**: Rate limit per user (e.g. 20 conversation turns/min for premium, 5 for free) and per endpoint to avoid cost spikes and abuse.

---

## 22. Security / Compliance Requirements

- **Secrets**: API keys in env/vault; never in client or logs. Rotate if leaked.
- **PII**: Minimize PII in prompts; avoid logging full prompts with user content in production. Prefer hashed or truncated identifiers in logs.
- **Moderation**: Required (IS-017); block unsafe output; do not store unmoderated content. EU: ensure provider terms and data processing align with GDPR where applicable.

---

## 23. Auditability / Logging Requirements

- Log: Request (use case, scenario_id, user_id hashed, token counts); response (success/block/error); provider used; latency. Do not log full prompt or full response content in production (or redact).

---

## 24. Observability / Monitoring

- **Metrics**: Request count by use case and provider; latency p50/p95; token usage; moderation block count; error rate by provider.
- **Alerts**: Error rate > threshold; fallback provider usage spike; moderation rate spike.

---

## 25. UI / UX Implications

- **Conversation**: Show “AI is typing…” while waiting; on error show “Something went wrong. Try again.” and optional retry button.
- **Indicate AI**: All AI-generated text must be clearly indicated (IS-016) (e.g. label “AI” or avatar).
- **Moderation**: If response blocked, show generic fallback message; do not explain moderation to avoid gaming.

---

## 26. Admin / Operations Implications

- **Model/config**: Change model or temperature via config; no code deploy for A/B. Optional feature flag for model routing.
- **Cost**: Monitor token usage and cost per user/tier; set alerts for anomaly.

---

## 27. API / Adapter Design

- **Interface**: `LLMAdapter.complete(messages, options) → { content, usage?, provider }`. Implementations: `OpenAIAdapter`, `AnthropicAdapter`. Orchestrator chooses provider and calls adapter; then runs moderation on content.
- **Prompt builder**: Per use case (conversation, reflection, feedback); inject scenario, level, locale, history into template; return messages array.

---

## 28. Event / Async Flow Design

- **Sync**: Conversation and voice turn are sync. Reflection generation can be async job: trigger on “generate lesson” or schedule; job calls LLM and writes result.
- **Events**: Emit usage event (user_id, use_case, tokens, provider) for analytics and cost.

---

## 29. Data Persistence Requirements

- **Conversation turns**: user_id, session_id, role (user|assistant), content (moderated), created_at.
- **Generated lessons**: lesson_id, user_id, model_id, prompt_version, content (moderated), source_activities.
- **Feedback**: feedback_id, activity_type, source_id, content (moderated), model_id. Do not persist raw unmoderated LLM output.

---

## 30. Local Development Setup

- **Option A**: Use test API keys (OpenAI/Anthropic) with low quota; real calls in dev.
- **Option B**: **Mock adapter** that returns fixed or random canned responses (e.g. “Mock AI response for scenario X”). No provider key required. Switch via env (e.g. LLM_MOCK=true).
- **Option C**: Local proxy (e.g. LiteLLM) that forwards to provider; same as A but with one endpoint. Env: LLM_BASE_URL=http://localhost:4000.

---

## 31. Testing Requirements

- **Unit**: Prompt builder produces valid messages; moderation blocks known bad output; adapter parses provider response.
- **Integration**: With mock or test key: send conversation turn → receive response → moderation pass; send bad prompt → fallback or block. Fallback: disable primary → expect fallback provider used.
- **E2E**: User sends message in scenario → sees AI response (or fallback on error).

---

## 32. Rollout / Feature Flag Strategy

- **Feature flag**: “llm_conversation_enabled” per region or cohort; “llm_fallback_provider” (openai | anthropic) to switch primary. Model id in config for quick model upgrade without deploy.

---

## 33. Example Scenarios

**Conversation turn**  
Input: scenario_id=cafe, user_message="Mag ik een koffie?", level=A1.  
Prompt: system “You are a barista in a Dutch café. Respond in Dutch, A1 level.”; user “Mag ik een koffie?”  
Output: “Natuurlijk! Wilt u hem hier drinken of meenemen?”  
Moderation: pass → persist and return.

**Reflection generation**  
Input: activities=[{ venue: cafe, note: "Had coffee" }, { venue: supermarket }], level=A1.  
Prompt: “Generate a short Dutch lesson (title, 5 phrases, 5 words) based on these activities for A1 learner.”  
Output: JSON or structured text → moderate → persist as generated_lesson.

---

## 34. Edge Cases

- **Very long history**: Truncate to last N turns or last K tokens to stay within context limit.
- **Empty or non-Dutch user message**: Validate input; reject or prompt “Please type in Dutch or your message.”
- **Provider returns non-text**: Parse safely; if no content, treat as error and retry or fallback.
- **Streaming**: If streaming, buffer full response and run moderation on full content before persisting; or persist chunks and mark “unmoderated” until final moderation run.

---

## 35. Recommended Technical Design

- **Orchestrator**: Single entry point per use case; builds prompt → calls adapter (primary/fallback) → moderates → returns. Adapter interface; OpenAI and Anthropic implementations.
- **Moderation**: In-process (block list, regex) or call to provider moderation API; must run before any persistence or response to client.
- **Cost**: Track token usage per request; aggregate per user/tier; optional hard cap per user per day.

---

## 36. Suggested Implementation Phasing

- **Phase 1**: Single provider (OpenAI); conversation and voice turn; basic moderation (block list or provider); mock adapter for local.
- **Phase 2**: Fallback (Anthropic); reflection and feedback generation; streaming optional; cost tracking.
- **Phase 3**: Model routing by feature flag; A/B test models; advanced moderation pipeline.

---

## 37. Summary

LLM orchestration is **strategy-based** (OpenAI primary, Anthropic fallback). Backend builds prompts from templates, calls provider via a common adapter, and **moderates all output** (IS-017) before persisting or returning. Local dev can use a **mock adapter** or test keys. Failures trigger retry and fallback; rate limits and cost controls are applied per user/tier. Observability and security (no keys in client, minimal PII in logs) are required.
