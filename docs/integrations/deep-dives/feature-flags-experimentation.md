# Feature Flags / Experimentation — Integration Deep-Dive

**Integration**: Strategy (LaunchDarkly, PostHog, or custom).  
**Version**: 1  
**Status**: Implementation-grade

---

## 1. Purpose

Specify **feature flags and experimentation** for the AI Dutch Coach: rollout control, A/B tests, and optional model routing (LLM). Enables safe releases and data-driven decisions.

---

## 2. Core Concept

- **Flags**: Backend and/or frontend evaluate flag (e.g. `payments_enabled`, `voice_tutor_enabled`) by user_id, segment, or context; return boolean or variant. **Experimentation**: Assign user to variant (A/B); track in analytics; measure conversion. **Source of truth**: Flag provider or our DB (if self-hosted); we do not override per request except for kill switch.
- **Local dev**: Override via env or provider dev environment; or mock (all flags true/false).

---

## 3. Why This Integration Exists

- **Rollout**: Enable payments, voice, or new features by region or cohort. **Experiments**: Test paywall copy, onboarding steps. **Model routing**: Route LLM to different model by flag (e.g. gpt-4o vs gpt-4o-mini by cohort).

---

## 4. Business Capabilities Enabled

- **Gradual rollout**: Enable feature for 10% then 100%. **A/B test**: Show variant A vs B; measure conversion. **Kill switch**: Disable feature without deploy.

---

## 5. Scope

### 6. In Scope

- **Evaluate**: flag key, user_id (or anonymous_id), optional attributes (country, tier). Return boolean or string variant. **Backend**: Evaluate in API (e.g. entitlements, feature access). **Frontend**: Evaluate for UI (show/hide, copy). **Provider**: LaunchDarkly, PostHog (if using for analytics), or in-house (DB + cache). **Local**: Env overrides (FEATURE_X=true) or provider dev; mock for tests.
- **Out of scope**: Complex targeting (optional); real-time flag change propagation (eventual consistency acceptable).

### 7. Out of Scope

- Full experimentation platform (optional). Multivariate (3+ variants) if not needed in Phase 1.

---

## 8. Triggering Flows / Usage Points

| Trigger | Flow |
|---------|------|
| Request needs feature check | Backend: get user_id from context → evaluate(flag_key, user_id) → allow or 403. |
| Frontend render | evaluate(flag_key, user_id) → show/hide component or variant. |
| LLM call | evaluate(llm_model_variant, user_id) → route to model A or B. |
| Experiment | evaluate(experiment_key, user_id) → variant A or B; track in analytics. |

---

## 9. Inputs

- **Evaluate**: flag_key, user_id (or anonymous_id), optional context (country, tier, custom). **Provider**: Same; may use SDK (e.g. LaunchDarkly SDK) with user object.

---

## 10. Outputs

- **Boolean flag**: true/false. **Variant flag**: string (e.g. "control", "treatment"). **Experiment**: variant + assignment (stable for user).

---

## 11. Data Domains Involved

- **User**: user_id, optional segment (from profile or provider). **Flags**: Key, rules (targeting), default value. **Analytics**: Experiment assignment and conversion (if using provider or our analytics).

---

## 12. Source of Truth Rules

- **Provider**: Flag definitions and rules are source of truth. **Our code**: Default behavior when flag not found or provider down (e.g. flag off for safety, or cached last value).

---

## 13. Authentication Model

- **Provider**: SDK key (client-side and server-side); client key may be public (e.g. LaunchDarkly client-side id). **Our API**: Flags evaluated in context of authenticated user (user_id from session).

---

## 14. Authorization / Consent Model

- **N/A**: Flags control feature visibility/behavior; no separate consent. **Experiments**: Covered by terms; no PII in flag keys (user_id hashed in provider if needed).

---

## 15. Configuration Model

| Key | Type | Description |
|-----|------|-------------|
| FEATURE_FLAG_PROVIDER | string | launchdarkly \| posthog \| custom |
| LAUNCHDARKLY_SDK_KEY_SERVER / POSTHOG_* | string | Server-side key |
| LAUNCHDARKLY_SDK_KEY_CLIENT | string | Client-side (optional) |
| FEATURE_* | string | Env overrides (e.g. FEATURE_PAYMENTS_ENABLED=true) for local |

---

## 16. Environment Strategy

| Env | Setup |
|-----|--------|
| **Local** | Provider dev project or env overrides (FEATURE_X=true). Mock: return fixed value in tests. |
| **Staging** | Same provider; staging environment; different rules for testing. |
| **Production** | Production environment; gradual rollout rules. |

---

## 17. Data Flow Design

- **Backend**: On request load flags for user_id (SDK or HTTP); cache per request or short TTL (e.g. 60s); evaluate and allow/deny. **Frontend**: SDK initializes with user_id after login; evaluate on render or route; optional bootstrap from server to avoid flash. **Fallback**: If provider unreachable, use default (e.g. false for new feature, true for existing) or cached value.

---

## 18. Sync / Polling / Webhook Design

- **SDK**: Typically poll or stream; provider pushes updates. **Server**: Evaluate on each request or cache 60s. **Fallback**: On timeout use default.

---

## 19. Failure Handling

| Failure | Handling |
|---------|----------|
| Provider 5xx / timeout | Use default value (e.g. flag off for risky feature); log; optional cache last known. |
| Flag not found | Use default (false or control). |
| Invalid variant | Fallback to control. |

---

## 20. Retry Strategy

- **Evaluate**: One retry on timeout; then default. **SDK**: Provider SDK may retry; we do not block request long (e.g. 500ms timeout).

---

## 21. Rate Limiting / Quota Considerations

- **Provider**: Evaluation limits per key; stay within. **Our side**: Cache evaluation per user for 60s to reduce calls.

---

## 22. Security / Compliance Requirements

- **Client key**: By design may be public; restrict by origin if possible. **Server key**: In env; never in client. **No PII in flag keys**: Use user_id; do not put email in context if not required.

---

## 23. Auditability / Logging Requirements

- **Log**: Flag evaluation failures (timeout, error); optional audit of flag change (in provider). **Do not log**: Full user context in every request (volume).

---

## 24. Observability / Monitoring

- **Metrics**: Evaluation latency; fallback rate; error rate. **Alerts**: Provider down; high fallback rate.

---

## 25. UI / UX Implications

- **Flag off**: Feature hidden or disabled; no broken UI. **Experiment**: User sees consistent variant for session/user. **Fallback**: Default (e.g. control) so UX is consistent when provider down.

---

## 26. Admin / Operations Implications

- **Toggle**: Change flag in provider UI; no deploy. **Rollout**: Ramp from 0% to 100% by segment. **Kill switch**: Set flag false to disable feature.

---

## 27. API / Adapter Design

- **Interface**: FeatureFlagService.isEnabled(flagKey, userId) → boolean; getVariant(flagKey, userId) → string. **Implementations**: LaunchDarklyAdapter, PostHogAdapter, EnvOverrideAdapter (read FEATURE_* from env), MockAdapter (tests). **Injection**: Use in middleware (entitlements) and in services (LLM routing).

---

## 28. Event / Async Flow Design

- **Sync**: Evaluate in request. **No async** for flag evaluation (must know before response).

---

## 29. Data Persistence Requirements

- **None in our DB** if using provider. **Custom**: If in-house, table flags (key, rules_json, default_value); cache in Redis.

---

## 30. Local Development Setup

- **Env**: FEATURE_PAYMENTS_ENABLED=true, etc. **Provider**: Create dev project; use SDK key in .env.local. **Mock**: In tests, inject MockAdapter returning true/false or variant.

---

## 31. Testing Requirements

- **Unit**: Mock adapter; assert isEnabled('payments') → 403 when false. **Integration**: With provider dev: set flag true/false; assert behavior. **E2E**: Optional; flag off → feature not visible.

---

## 32. Rollout / Feature Flag Strategy

- **New feature**: Flag off by default; enable for internal then beta then 100%. **Experiment**: Create experiment in provider; assign variant; track conversion in analytics.

---

## 33. Example Scenarios

**Rollout**: payments_enabled = true for segment "beta" → only beta users see upgrade. **Experiment**: paywall_copy = "control" | "treatment" → frontend shows copy A or B; backend tracks in analytics. **Kill switch**: voice_tutor_enabled = false → POST /voice/start returns 503 or 403.

---

## 34. Edge Cases

- **User not yet in context**: Evaluate with anonymous_id or default. **Provider down**: Default; document which flags default to what. **Stale cache**: 60s TTL; accept brief staleness.

---

## 35. Recommended Technical Design

- **FeatureFlagService**: Wraps provider SDK; isEnabled, getVariant; timeout 500ms; fallback to config default. **Backend**: Evaluate in middleware for feature-gated routes; in service for LLM model. **Frontend**: Evaluate after login; pass variant to components.

---

## 36. Suggested Implementation Phasing

- **Phase 1**: Single provider (LaunchDarkly or PostHog); backend flags for payments, voice; env override for local. **Phase 2**: Frontend flags; experiments. **Phase 3**: Model routing; advanced targeting.

---

## 37. Summary

**Feature flags** are **strategy-based** (LaunchDarkly, PostHog, or custom). **Backend and frontend** evaluate by user_id; **fallback** on provider failure to safe default. **Local**: Env overrides or provider dev. Used for rollout, experiments, and optional LLM routing. Required for safe releases and experiments.
