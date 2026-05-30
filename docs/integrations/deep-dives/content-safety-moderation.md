# Content Safety / Moderation — Integration Deep-Dive

**Integration**: Strategy (provider-native OpenAI/Anthropic moderation + optional custom pipeline).  
**Version**: 1  
**Status**: Implementation-grade

---

## 1. Purpose

Specify **content moderation** for the AI Dutch Coach: AI output safety (IS-017), user content filtering, and safe fallback when content is blocked. Ensures no unsafe AI-generated or user-submitted content is stored or shown.

---

## 2. Core Concept

- **Moderation**: Before persisting or returning LLM output (or user message), run through moderation: block list, provider moderation API, or custom classifier. If flagged, do not persist; return fallback message to user. **User content**: Optional moderation of user messages (e.g. scenario input) before sending to LLM.
- **Source of truth**: We only persist and display content that passed moderation; blocked content is not stored.

---

## 3. Why This Integration Exists

- **Safety (IS-017)**: All AI-generated text must be moderated. **Trust**: User and brand protection from harmful or inappropriate content. **Compliance**: Align with provider and platform policies.

---

## 4. Business Capabilities Enabled

- **Safe conversation**: Scenario and voice tutor responses are safe. **Safe feedback**: Generated feedback and reflection content is safe. **User input**: Optional filter of abusive or off-topic user input.

---

## 5. Scope

### 6. In Scope

- **Output moderation**: Every LLM response (conversation, reflection, feedback) passed through moderation before persist or return. **Input moderation** (optional): User message in scenario/voice checked before LLM. **Fallback**: Generic message when blocked (e.g. “I couldn’t generate a response. Please try again.”). **Provider**: Use OpenAI Moderation API or Anthropic safety; or in-prompt/response metadata; or custom block list + regex. **Logging**: Log moderation events (blocked, reason code) without logging blocked content.
- Local dev: Same moderation in dev (or mock that always passes / always blocks for tests).

### 7. Out of Scope

- Image moderation (if we add image input later). Real-time streaming moderation (buffer and moderate full response). User reporting flow (optional Phase 2).

---

## 8. Triggering Flows / Usage Points

| Trigger | Flow |
|---------|------|
| After LLM response | Orchestrator gets content → Moderation.check(content) → if pass: return and persist; if block: return fallback, log, do not persist. |
| Before LLM (optional) | User message → Moderation.check(message) → if block: return 400 “Message not allowed”; if pass: send to LLM. |
| Reflection/feedback generation | Same as above; moderate generated text before saving to DB. |

---

## 9. Inputs

- **Moderation**: content (string), optional context (use_case: conversation | reflection | feedback). **Provider API**: text; may return categories and flagged status.

---

## 10. Outputs

- **Pass**: content unchanged; allow persist and return. **Block**: return fallback message to user; do not persist; log event (reason, no content). **Optional**: reason code (e.g. hate, violence) for internal metrics only.

---

## 11. Data Domains Involved

- **Conversation/feedback**: Only moderated content in DB. **Logs**: moderation_blocked (use_case, reason_code, no content). **Analytics**: Optional count of blocks per use_case for tuning.

---

## 12. Source of Truth Rules

- **We never store unmoderated LLM output.** Moderation runs in same flow as LLM response; no async “moderate later” for display. **User input**: If we moderate input, reject request with 400 and do not send to LLM.

---

## 13. Authentication Model

- **Moderation API**: Same as LLM (OpenAI/Anthropic API key) if using provider moderation. **Our API**: Moderation is internal; no separate auth for moderation service.

---

## 14. Authorization / Consent Model

- **N/A**: Moderation is mandatory for all AI output; no user opt-out. **User input**: Rejecting abusive input is part of terms of use.

---

## 15. Configuration Model

| Key | Type | Description |
|-----|------|-------------|
| MODERATION_PROVIDER | string | openai \| anthropic \| custom |
| MODERATION_FALLBACK_MESSAGE | string | Message shown when blocked |
| MODERATION_INPUT_ENABLED | boolean | Whether to moderate user input |

---

## 16. Environment Strategy

| Env | Setup |
|-----|--------|
| **Local** | Same as backend (provider key or mock). Mock: always pass or always block for tests. |
| **Staging/Prod** | Provider moderation API; fallback message from config. |

---

## 17. Data Flow Design

- **Flow**: LLM returns content → ModerationService.check(content) → call provider API or custom rules → if flagged: return { blocked: true, reason }; if pass: return { blocked: false }. Orchestrator: if blocked, log and return fallback to user; else persist and return content.

---

## 18. Sync / Polling / Webhook Design

- **Sync**: Moderation is synchronous in request path. **Streaming**: If we stream LLM response, buffer full response and moderate before persisting or before showing to user (moderate before persist).

---

## 19. Failure Handling

| Failure | Handling |
|---------|----------|
| Moderation API 5xx / timeout | **Fail closed**: Treat as block; return fallback; log; do not persist. Or retry once then fail closed. |
| Moderation API 429 | Retry after backoff; if still 429, fail closed. |
| Invalid response | Parse safely; if unclear, fail closed. |

---

## 20. Retry Strategy

- **One retry** on 5xx and timeout (2s backoff). If still failing, **fail closed** (block and return fallback).

---

## 21. Rate Limiting / Quota Considerations

- **Provider**: Moderation may share rate limit with LLM or be separate; stay within quota. **Our side**: Moderation runs once per LLM response; no extra user-facing rate limit.

---

## 22. Security / Compliance Requirements

- **Fail closed**: Do not show or persist content when moderation fails (API down). **No logging of blocked content**: Log only that block occurred and reason code; avoid storing blocked text. **IS-017**: Satisfy “all AI output moderated” requirement.

---

## 23. Auditability / Logging Requirements

- **Log**: moderation_blocked event (use_case, reason_code, request_id); no content. **Metrics**: Block rate by use_case; moderation API errors.

---

## 24. Observability / Monitoring

- **Metrics**: Moderation pass/block count; API latency; API error rate. **Alerts**: Moderation API down (fail closed); block rate spike (may indicate prompt issue).

---

## 25. UI / UX Implications

- **Blocked**: User sees fallback message only; no explanation that content was moderated (avoid gaming). **Input blocked**: “Your message couldn’t be sent. Please rephrase.” No detail on reason.

---

## 26. Admin / Operations Implications

- **Tuning**: If block rate is high, review prompts or adjust provider threshold (if configurable). **Audit**: Block logs for safety reviews; no PII in log.

---

## 27. API / Adapter Design

- **Interface**: ModerationService.check(content: string) → { blocked: boolean, reason?: string }. **Implementations**: OpenAIModerationAdapter (call OpenAI Moderation API), AnthropicSafetyAdapter (use response metadata), CustomModerationAdapter (block list + regex). **Orchestrator**: Calls moderation after LLM; branches on blocked.

---

## 28. Event / Async Flow Design

- **Sync**: Moderation in same request as LLM. **No async moderation** for content we return to user (must moderate before return).

---

## 29. Data Persistence Requirements

- **None for blocked content.** **Optional**: moderation_events table (request_id, use_case, blocked, reason_code, created_at) for analytics; no content field.

---

## 30. Local Development Setup

- **Mock**: ModerationAdapter that always returns pass (or always block for negative test). No provider key needed for mock. **Real**: Use same OpenAI/Anthropic key as LLM; moderate in dev as in prod.

---

## 31. Testing Requirements

- **Unit**: Mock moderation; assert block → fallback returned and not persisted; pass → content returned. **Integration**: Send known-bad string to moderation API; assert blocked. **E2E**: Optional; trigger scenario response that gets blocked; assert user sees fallback.

---

## 32. Rollout / Feature Flag Strategy

- **Feature flag**: Optional “moderation_input_enabled” to turn on user input moderation. **Moderation**: Always on for output; no flag to disable (safety).

---

## 33. Example Scenarios

**Pass**: LLM returns “Natuurlijk! Wilt u koffie?” → moderate → pass → persist and return. **Block**: LLM returns [harmful] → moderate → block → log; return “I couldn’t generate a response. Please try again.” **Input block**: User sends [abusive] → moderate input → block → 400 “Message not allowed.”

---

## 34. Edge Cases

- **Empty content**: Treat as pass (no content to moderate). **Very long content**: Provider may have length limit; truncate or chunk; or moderate in chunks (document behavior). **Provider returns unknown**: Fail closed. **False positives**: Fallback message is neutral; user can retry; tune threshold if provider allows.

---

## 35. Recommended Technical Design

- **ModerationService**: Single entry point; check(content); uses ModerationAdapter. **Fail closed**: Any error or timeout → block and return fallback. **Orchestrator**: Always call moderation after LLM; never persist without check.

---

## 36. Suggested Implementation Phasing

- **Phase 1**: Provider-native moderation (OpenAI or Anthropic) for all LLM output; fallback message; logging. **Phase 2**: User input moderation (optional); custom block list for edge cases. **Phase 3**: Tuning and metrics dashboard.

---

## 37. Summary

**Content moderation** is **strategy-based** (provider-native + optional custom). **All LLM output** is moderated before persist or return (IS-017). **Fail closed** on API errors. **Local**: Mock pass/block for tests. No storage of blocked content; log only block events and reason codes. Required for safety and compliance.
