# Feature Flags & Experimentation Integration

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

Specifies **feature flags** and **experimentation** for phased rollout, A/B tests, AI model routing, and cohort-based targeting. Provider: LaunchDarkly or PostHog (if already using for analytics).

---

## 2. Why Needed

- Roll out voice tutor, push, location, or new UX gradually. A/B test premium upsell copy, trial length, or AI model (gpt-4o vs mini). Target by country, cohort, or entitlement.

---

## 3. Decision Status

| Item | Status |
|------|--------|
| Feature flags | **Required now** |
| Provider | **Required now** — LaunchDarkly or PostHog |
| Experiments | **Required now** (basic); full A/B with stats later |

---

## 4. Credentials

| Credential | Purpose | Where | Frontend-safe? |
|------------|---------|--------|----------------|
| `INTEGRATION_LAUNCHDARKLY_SDK_KEY_CLIENT` | Evaluate flags in browser | Frontend (build) | Yes |
| `INTEGRATION_LAUNCHDARKLY_SDK_KEY_SERVER` | Evaluate flags in backend | Backend | No |

If PostHog: use same client as analytics; feature flags are part of PostHog. Server-side: PostHog personal API key or server SDK.

---

## 5. Frontend Responsibilities

- **Init**: LD SDK or PostHog with client key. Identify user (user key = our user_id or anonymous id) after login so targeting works.
- **Evaluate**: e.g. `client.variation('voice-tutor-enabled', false)` before showing voice entry. Use for rollout (percentage) or experiment (variant A/B).
- **Do not**: Expose server SDK key. Do not use flags for secrets.

---

## 6. Backend Responsibilities

- **Evaluate**: For model routing (e.g. 10% gpt-4o, 90% mini), evaluate flag with user context (user_id, country) and call corresponding LLM adapter. For entitlement-gated features, still enforce server-side; flag only for “show new UI” or “use new model.”
- **Context**: Pass user_id, optional cohort (e.g. “trial_users”), optional custom attributes (e.g. level) for targeting.

---

## 7. Patterns

- **Rollout**: Flag `feature-voice-tutor` → 10% of users. Ramp to 100% after validation.
- **Experiment**: Flag `upsell-copy` → variant “control” vs “social_proof”; measure conversion in analytics; decide winner.
- **Kill switch**: Flag `integration-llm-primary` = “openai” or “anthropic”; flip if OpenAI down.

---

## 8. Testing

- Use LD/PostHog test environment; create flags; verify client and server evaluate same user consistently. Test percentage rollout (mock many users).
