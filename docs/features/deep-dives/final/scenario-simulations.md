# Scenario Simulations — Deep-Dive Specification

## 1. Purpose

Scenario Simulations let learners practice real-life situations (e.g. café, doctor, supermarket) by chatting with an AI in Dutch. The AI responds in character, may correct gently, and the session ends with summary and feedback. This spec covers FD-03: triggers, workflows, moderation, entitlements, and integration with AI Conversation and Feedback.

## 2. Core Concept

- **Scenario**: A defined situation (category, context, goals, key phrases, AI roleplay instructions) tagged by level and optionally profile (occupation, goals) (IS-009).
- **Conversation**: Multi-turn chat; user types (or speaks via FD-04); AI responds with context and level injected; moderation on output (IS-017); AI indicated to user (IS-016).
- **Free cap**: e.g. 1–2 scenarios per week for free users; premium unlimited within fair use (BFR-011).

## 3. Why This Feature Exists

- **Differentiation**: Real-life practice differentiates from generic apps (BFR-002: scenario simulations premium).
- **Engagement**: High-value activity; conversion driver when cap reached.
- **Learning**: Aligns with scenario-based learning (IS-009).

## 4. User / Business Problems Solved

- Learners practice situation-specific Dutch without a human partner.
- Business monetizes via premium and trial; cap drives upsell.

## 5. Scope

### 6. In Scope

- Scenario list filtered by user level and profile (occupation, goals); selection and start.
- Conversation: context and user level injected into LLM prompt; turn-by-turn chat; moderation on AI output before display (IS-017); indicate AI (IS-016).
- Session end: summary and link to feedback (FD-11); persist conversation summary; usage count for free cap.
- Free-tier limit (e.g. 1–2/week); premium unlimited (fair use).
- Input validation: block empty or policy-breaching user input; do not send to LLM if breach.

### 7. Out of Scope

- Voice within scenario (FD-04; can be same scenario with voice; orchestration only).
- Content authoring of scenarios (Content doc); this spec consumes scenario definitions.
- Detailed LLM prompt design (AI Conversation doc).

## 8. Main User Personas

- **Practical learner**: Wants café, doctor, work scenarios.
- **Exam-focused**: Scenarios tagged for integration exam context.
- **Free user**: Uses 1–2 scenarios per week; sees upsell when cap reached.

## 9. Main User Journeys

| Journey | Steps |
|--------|--------|
| **Run scenario** | Home or Scenarios → Select scenario → Intro + first AI message → User types → AI replies (loop) → User ends → Summary + feedback → XP. |
| **Cap reached** | Free user tries to start → 403 free_cap_reached → Upsell. |
| **Restart / different** | End or exit → Choose same or different scenario; progress saved up to last turn. |

## 10. Triggering Events / Inputs

- **List scenarios**: GET /scenarios (filter by level, profile); used by scenario picker.
- **Start**: POST /conversation/start { scenario_id }; entitlement and optional consent checked; session created.
- **Turn**: POST /conversation/turn { session_id, message }; moderation on input; LLM; moderation on output; persist; return AI message.
- **End**: POST /conversation/end { session_id }; summary and feedback trigger; usage incremented.

## 11. States / Lifecycle

- **Not started**: Scenario available in list.
- **Active**: Session created; turns in progress; can end or abandon.
- **Ended**: Summary and feedback generated; session persisted; usage updated; Gamification (XP) and Feedback (FD-11) linked.
- **Abandoned**: User left without end; save turns up to last; optional “resume” or count as abandoned for analytics.

## 12. Business Rules

- **BR-2**: Level drives scenario list and prompt difficulty (IS-003).
- **IS-009**: Real-life scenarios; IS-016 (indicate AI); IS-017 (moderation).
- **Premium or trial** for unlimited; free capped (BFR-011).
- **Moderation**: AI output filtered before display; user input validated; policy breach → generic message or block.

## 13. Configuration Model

- **Scenarios**: From DB (scenarios table): context, goals, key_phrases, ai_roleplay_instructions, difficulty_level, scenario_category_id. See database-schema.
- **Free cap**: Scenarios per week (e.g. 1–2); configurable.
- **Moderation**: Rules and API (internal or external); block list; max turn count or time (optional).

## 14. Data Model

- **scenarios**: id, locale, external_id, scenario_category_id, title, context, goals (JSONB), key_phrases (JSONB), grammar_focus_ids, ai_roleplay_instructions (JSONB), difficulty_level, version, created_at, updated_at.
- **conversation_sessions**: id, user_id, scenario_id, status (active|ended|abandoned), started_at, ended_at, summary (JSONB or text), created_at, updated_at.
- **conversation_turns**: id, session_id, role (user|assistant), content (text), moderated_content (if different), turn_index, created_at.
- **Usage**: Same as Entitlements usage (e.g. scenario_sessions_this_week); stored in Entitlements or shared usage table.

## 15. Read Model / Projection Needs

- **Scenario list**: Scenarios filtered by level and profile; Personalization may supply “recommended scenario.”
- **Session history**: For “Continue” or history; list sessions with scenario title and date.
- **Feedback**: FD-11 reads session and turns to generate feedback.

## 16. APIs / Contracts

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| GET | `/v1/scenarios` | List scenarios (level, category) | Query: level, category, limit | 200 { scenarios[] }; 403 if free cap and “start” intent — prefer separate check |
| POST | `/v1/conversation/start` | Start scenario session | { scenario_id } | 201 { session_id, initial_message? }; 403 not entitled or cap |
| POST | `/v1/conversation/turn` | Send user message; get AI reply | { session_id, message } | 200 { reply, turn_id }; 400 invalid/empty; 403 session not active; 503 LLM/moderation down |
| POST | `/v1/conversation/end` | End session; get summary | { session_id } | 200 { summary, feedback_id? }; 404 |
| GET | `/v1/conversation/sessions` | User’s sessions (optional) | Query: limit | 200 { sessions[] } |

**Cap**: On POST /conversation/start, backend checks scenario usage for period; if at cap, 403 with reason free_cap_reached.

## 17. Events / Async Flows

- **scenario_started**: session_id, scenario_id, user_id (analytics).
- **scenario_turn_sent**: session_id, turn_index (analytics).
- **scenario_completed**: session_id, turns_count; triggers feedback generation (FD-11) and Gamification (XP).
- **scenario_abandoned**: session_id (analytics).
- **scenario_cap_reached**: user_id (analytics, upsell).
- **Async**: Feedback generation may be async after end; client can poll or get via GET /feedback/:id.

## 18. UI / UX Design

- **Scenario list**: Cards with title, category, level, duration; “Recommended for you” from Personalization.
- **Conversation**: Chat UI; user messages on one side, AI on other; clear “AI” or “Practice partner” label (IS-016). Input box; send; loading state while waiting for AI.
- **End**: “End conversation” button; confirm optional; then summary screen and feedback (FD-11).
- **Error**: “Something went wrong” on timeout or moderation block; Retry or End.

## 19. Main Screens / Components

- **ScenarioListScreen**: Grid/list of scenarios; filters; recommended.
- **ConversationScreen**: Chat thread, input, end button; transcript optional.
- **ConversationSummaryScreen**: Summary + feedback card + XP; “Practice again” or “Home.”

## 20. Permissions / Security Rules

- **Authenticated**: All endpoints require auth; user only sees own sessions.
- **Entitlement**: Premium or trial for unlimited; free only up to cap (enforced server-side).
- **Moderation**: Never return unmoderated AI or user content that breaches policy.

## 21. Notifications / Alerts / Side Effects

- **Feedback**: FD-11 generates and stores feedback; shown on summary screen.
- **Gamification**: XP on completion.
- **Usage**: Increment scenario count for period (Entitlements).

## 22. Integrations / Dependencies

- **AI Conversation Engine**: LLM call with scenario context and level; prompt design (docs/ai-conversation).
- **Moderation**: Filter AI output and validate user input (IS-017).
- **Entitlements**: Cap and entitlement check on start.
- **Profile**: Level and profile for scenario list and prompt.
- **FD-11 (Feedback)**: Consumes session and turns; produces feedback.
- **Gamification**: XP on scenario_completed.

## 23. Edge Cases / Failure Cases

- **LLM timeout or error**: Return 503 or 500; “Something went wrong”; allow retry or end session.
- **Moderation blocks AI reply**: Replace with generic safe message; do not show harmful content.
- **User sends empty or inappropriate**: Validate; 400 or block; do not send to LLM if policy breach.
- **Session already ended**: POST /turn → 403 or 404.
- **Webhook or async failure**: Feedback may be delayed; show “Feedback will appear shortly” or poll.

## 24. Non-Functional Requirements

- **Latency**: First AI response < 5s (FD-03); streaming optional. Rate limit per user to control cost.
- **Availability**: Depends on LLM and moderation; degrade gracefully (message + retry).

## 25. Analytics / Auditability Requirements

- **Events**: scenario_started, scenario_turn_sent, scenario_completed, scenario_abandoned, scenario_cap_reached. Include scenario_id, session_id, user_id, turn_count.
- **Audit**: Conversations stored for feedback and support; retention per Data doc; no PII in logs.

## 26. Testing Requirements

- Unit: Cap check; input validation; moderation stub.
- Integration: Start session; send turn; receive moderated reply; end session; 403 at cap; feedback and XP triggered.
- E2E: Full scenario flow; cap reached; error handling (timeout).

## 27. Recommended Architecture

- **API**: Conversation endpoints in API layer; delegate to AI Conversation service for LLM and moderation; persist sessions and turns in PostgreSQL; call Entitlements for cap on start; call Gamification and Feedback on end.
- **AI Conversation Engine**: See docs/final/ai-conversation-engine.md; inject scenario context and level into prompt.

## 28. Recommended Technical Design

- **Prompt**: Scenario’s ai_roleplay_instructions + user level + conversation history; see prompt-design in ai-conversation.
- **Idempotency**: End session idempotent (multiple end calls → same result).
- **Rate limit**: Stricter on /conversation/turn (e.g. 20/min per user) to control cost.

## 29. Suggested Implementation Phasing

- **Phase 1**: Scenario list; start; turn (text only); end; summary; moderation; cap; feedback stub.
- **Phase 2**: Full feedback (FD-11); Gamification; session history; analytics.
- **Phase 3**: Voice option (FD-04) reusing same scenario; streaming reply optional.

## 30. Summary

Scenario Simulations provide text-based conversation practice with AI in real-life situations. Scenarios are level- and profile-filtered; conversation is moderated and AI is clearly indicated. Free users have a weekly cap; premium unlimited. Session and turns are persisted; on end, summary and feedback (FD-11) are generated and XP awarded. Implementation must enforce cap server-side, apply moderation to all AI output, and integrate with AI Conversation, Entitlements, and Feedback.
