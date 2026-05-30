# Scenario Simulations — Per-Feature Integration Specification

**Feature**: FD-03 Scenario Simulations (Text/Chat)  
**Source**: docs/final/feature-domain-breakdown.md §5; docs/features/deep-dives/scenario-simulations.md

---

## 1. Purpose

This document specifies **which integrations the Scenario Simulations feature uses** and **how**: LLM for conversation, content moderation for safety (IS-017), entitlement/cache for premium gating and usage caps, and analytics. It enables implementers to wire the scenario conversation flow and operate it in local, staging, and production.

---

## 2. Feature Reference

- **Domain**: FD-03 Scenario Simulations
- **User goal**: Practice a real-life situation (e.g. restaurant, doctor) by chatting with AI in Dutch.
- **Business goal**: Differentiation; premium engagement (BFR-002: scenario simulations premium).
- **Integration dependencies** (from feature-domain-breakdown): LLM API; Moderation (internal or API).

---

## 3. Integrations Used (Summary)

| Integration | Role in Scenario Simulations | Criticality |
|-------------|------------------------------|-------------|
| **LLM orchestration** | Generate AI reply in character (scenario + level); conversation turn-by-turn | Critical |
| **Content moderation / safety** | Moderate every AI output before display and persist (IS-017); block or fallback message | Critical |
| **Cache / Entitlements** | Gate: premium/trial for unlimited; free cap (e.g. 1–2 scenarios/week). Fast check via cache | Critical |
| **Analytics** | scenario_started, scenario_turn_sent, scenario_completed, scenario_abandoned, scenario_cap_reached | High |

---

## 4. Per-Integration Detail

### 4.1 LLM Orchestration

- **Why this feature needs it**: Each user message is sent to the LLM with scenario context (persona, level, locale); LLM returns in-character reply in Dutch. Core of the feature.
- **Data flow**: Client POST /v1/conversation/turn (session_id, message). Backend: load session and scenario; build messages (system prompt from scenario, history, user message); call LLM adapter (OpenAI/Anthropic); receive content → pass to moderation (below); if pass, persist turn and return content to client.
- **Triggering**: Every user message in an active scenario session (POST /v1/conversation/turn). Session created by POST /v1/conversation/start (scenario_id).
- **Auth**: Authenticated user; session belongs to user. LLM API key in backend env only.
- **Failure**: Provider 5xx/timeout → retry once, then fallback provider if configured; else 503 “Something went wrong”, allow retry. Rate limit 429 → return 429 to client. See [llm-orchestration.md](../../llm-orchestration.md) § Failure Handling.
- **Local**: Mock LLM adapter (fixed or random canned replies) or test API key. See [llm-orchestration.md](../../llm-orchestration.md) § Local Development Setup.
- **Observability**: Request count, latency, token usage, provider used; cost per scenario. See main deep-dive § Observability.
- **Reference**: [llm-orchestration.md](../../llm-orchestration.md)

### 4.2 Content Moderation / Safety

- **Why this feature needs it**: IS-017 requires all AI output to be moderated before display and storage. Scenario replies must not contain unsafe content.
- **Data flow**: After LLM returns content, backend runs ModerationService.check(content). If blocked: do not persist; return fallback message to client (“I couldn’t generate a response. Please try again.”); log block event. If pass: persist and return content.
- **Triggering**: In same request as LLM call, immediately after receiving LLM response, before persist or response to client.
- **Auth**: Moderation uses same provider as LLM or dedicated API key; backend only.
- **Failure**: Moderation API down → fail closed: treat as block, return fallback, do not persist. See [content-safety-moderation.md](../../content-safety-moderation.md) § Failure Handling.
- **Local**: Mock moderation (always pass or always block for tests). See main deep-dive § Local Development Setup.
- **Observability**: Block rate; moderation API errors. See main deep-dive.
- **Reference**: [content-safety-moderation.md](../../content-safety-moderation.md)

### 4.3 Cache / Entitlements

- **Why this feature needs it**: Scenario access is premium or trial (unlimited); free tier has cap (e.g. 1–2 scenarios per week). Must check before POST /v1/conversation/start and optionally enforce per-session or per-turn.
- **Data flow**: On conversation/start: backend reads entitlement (tier, scenarios_used_this_week, scenarios_limit); if free and at cap, return 403 scenario_cap_reached and client shows upsell. On scenario_completed (or end): increment usage; invalidate entitlement cache for user.
- **Triggering**: POST /v1/conversation/start (must pass); optional check on first turn if we count “start” as usage. POST /v1/conversation/end → increment usage, invalidate cache.
- **Auth**: user_id from session; entitlement from our DB/cache (subscriptions, usage_counts).
- **Failure**: Cache/DB down → fail closed (deny start) or 503. See [cache-session-store.md](../../cache-session-store.md), [entitlements-subscription.md](./entitlements-subscription.md).
- **Local**: Redis + seed subscription/usage; Stripe test + webhook CLI if testing payment-driven state. See [entitlements-subscription.md](./entitlements-subscription.md).
- **Observability**: Entitlement check latency; 403 scenario_cap_reached count. See [payment-provider.md](../../payment-provider.md) sub-feature entitlement-enforcement.
- **Reference**: [cache-session-store.md](../../cache-session-store.md), [entitlements-subscription.md](./entitlements-subscription.md)

### 4.4 Analytics

- **Why this feature needs it**: scenario_started, scenario_turn_sent, scenario_completed, scenario_abandoned, scenario_cap_reached for funnel and engagement.
- **Data flow**: Backend (or frontend) sends events with user_id, scenario_id, and optional properties. Fire-and-forget.
- **Triggering**: On start, on each turn (optional or sampled), on end, on 403 cap.
- **Auth**: user_id from context. See [analytics-provider.md](../../analytics-provider.md).
- **Failure**: Must not block conversation. See main deep-dive.
- **Local**: Mock or disable. See [analytics-provider.md](../../analytics-provider.md).
- **Reference**: [analytics-provider.md](../../analytics-provider.md)

---

## 5. Implementation Implications

- **Backend services**: AI Conversation service (session, turns); LLM adapter; Moderation service; Entitlements (cap check). All behind single API.
- **Jobs/workers**: Optional: async feedback generation after scenario end (FD-11) may call LLM in job; same LLM + moderation.
- **DB tables**: scenarios, conversation_sessions, conversation_turns (user, assistant content after moderation); usage_counts (scenarios_used_this_week); subscriptions.
- **UI**: Scenario list; conversation view (user + AI messages); “AI” indicator (IS-016); loading state during LLM call; error “Something went wrong” and retry; cap-reached upsell.
- **Admin/config**: Scenario definitions (prompts); LLM model and temperature; moderation on/off; scenario cap for free tier; feature flag scenario_simulations_enabled.
- **Monitoring**: LLM latency and errors; moderation block rate; 403 cap rate; scenario completion rate.
- **Seed/demo data**: Scenarios with system prompts; test user free at cap and premium; mock LLM for E2E.
- **Testing**: Unit: mock LLM and moderation; assert blocked content not persisted. Integration: start scenario → send message → receive moderated reply; at cap → 403. E2E: full conversation; cap modal. Mock: LLM, moderation, entitlement.

---

## 6. Summary

Scenario Simulations depends on **LLM** for replies, **moderation** for safety (IS-017), **cache/entitlements** for premium and cap, and **analytics** for events. Data flow is request-scoped (turn → LLM → moderate → persist/return); failure handling and local setup are aligned with the main integration deep-dives referenced above.
