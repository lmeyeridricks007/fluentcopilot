# Integrations Specification — Final Summary

## Overview

This folder contains the **finalized integration specification** for the AI Language Coach (AI Dutch Coach). All documents have passed the review and audit process defined in `docs/meta/INTEGRATION_SPEC_GUIDELINES.md` and are suitable for implementation.

---

## Required Integrations (Phase 1)

| Integration | Recommended provider | Purpose | Key credentials |
|-------------|----------------------|---------|-----------------|
| **Identity & auth** | Own backend + optional Google/Apple OAuth | Login, signup, session/JWT, entitlement linkage | SESSION_SECRET or JWT_SECRET; GOOGLE_OAUTH_CLIENT_ID/SECRET; APPLE_OAUTH_* |
| **AI / LLM** | OpenAI (primary), Anthropic (fallback) | Scenarios, voice tutor, feedback, daily lesson generation | INTEGRATION_OPENAI_API_KEY, INTEGRATION_ANTHROPIC_API_KEY |
| **Speech & voice** | Azure Speech (STT, TTS, pronunciation) | Voice tutor, listening, pronunciation analysis | INTEGRATION_AZURE_SPEECH_KEY, INTEGRATION_AZURE_SPEECH_REGION |
| **Payments** | Stripe | Subscriptions, trial, webhooks, entitlement sync | INTEGRATION_STRIPE_SECRET_KEY, INTEGRATION_STRIPE_WEBHOOK_SECRET |
| **Media storage** | S3-compatible or Azure Blob (EU) | User photos, temp audio, lesson media | INTEGRATION_MEDIA_STORAGE_CONNECTION_STRING |
| **Analytics** | PostHog (EU) | Funnel, engagement, conversion, experiments | INTEGRATION_POSTHOG_API_KEY, INTEGRATION_POSTHOG_HOST |
| **Observability** | Sentry | Errors, performance, tracing | INTEGRATION_SENTRY_DSN |
| **Email** | Resend or SendGrid | Verification, receipts, reactivation | INTEGRATION_RESEND_API_KEY |
| **Feature flags** | LaunchDarkly or PostHog | Rollout, A/B tests, model routing | INTEGRATION_LAUNCHDARKLY_SDK_KEY_CLIENT/SERVER |
| **Content moderation** | OpenAI Moderation + optional Azure Content Safety | AI output and user content safety (IS-017, IS-018) | Same as LLM or INTEGRATION_AZURE_CONTENT_SAFETY_* |
| **Browser / PWA** | Browser APIs only | Permissions, install, microphone, geolocation | None (no external SaaS) |

---

## Optional or Phase 2

| Integration | Status | When required |
|-------------|--------|----------------|
| **Push notifications** | Optional Phase 1 or Phase 2 | Web Push (VAPID); reminders, streak nudges |
| **Geolocation / place** | Optional feature Phase 1 | Browser geolocation; optional Places API later |
| **Search / indexing** | Phase 2 | When lesson catalog and discovery justify; Algolia or Meilisearch |
| **CMS** | Phase 2 | When content team and workflow justify; Sanity or Contentful |

---

## Provider Decisions Summary

- **Identity**: Own backend (session or JWT); optional Google and Apple OAuth for social login.
- **LLM**: OpenAI primary, Anthropic fallback; adapter pattern; output moderation required.
- **Speech**: Azure Speech for STT, TTS, pronunciation; optional ElevenLabs for TTS alternative.
- **Payments**: Stripe; Checkout (redirect) for Phase 1; webhooks for subscription lifecycle; idempotent handler.
- **Analytics**: PostHog (EU) for product analytics and optional feature flags.
- **Observability**: Sentry for errors and tracing (OpenTelemetry-compatible).
- **Email**: Resend or SendGrid; transactional and consent-based marketing.
- **Feature flags**: LaunchDarkly or PostHog; client + server SDK keys.
- **Moderation**: OpenAI Moderation API for text; optional Azure Content Safety for images.
- **Search/CMS**: Not in Phase 1; document conditions and recommended providers for Phase 2.

---

## Top Risks

1. **Cost**: LLM and Speech dominate (~$0.30–1/user/month); enforce per-user caps and caching; monitor daily spend.
2. **Vendor lock-in**: Mitigated by adapter pattern and dual providers (LLM, TTS); Stripe migration would be rare but possible.
3. **Webhook reliability**: Stripe webhooks must be verified and idempotent; monitor delivery and handler 5xx.
4. **Latency**: LLM and Speech can be slow; use timeouts, streaming where possible, and clear loading/fallback UX.
5. **Privacy**: Audio and location are sensitive; short retention, consent, and no PII in logs (see integration-security-secrets and per-integration docs).

---

## Top Open Questions

- **Trial length**: 7 vs 14 days (product decision).
- **Streaming**: LLM and TTS streaming for lower perceived latency (implementation choice).
- **Push**: Phase 1 vs Phase 2 and Web Push vs OneSignal/FCM.
- **Search/CMS**: Exact trigger (N lessons or content team size) for Phase 2.
- **Pronunciation**: Streaming STT in Phase 2 for faster feedback.

---

## Implementation Order Recommendation

1. **Foundation**: Identity (signup/login, session), Env and secrets (integration-security-secrets, integration-environments), Observability (Sentry).
2. **Core product**: LLM (adapter, orchestrator, moderation), Speech (STT, TTS, pronunciation), Media storage (uploads, signed URLs).
3. **Monetization**: Stripe (products/prices, Checkout, webhooks, entitlement sync), Feature flags (rollout and experiments).
4. **Engagement**: Analytics (PostHog), Email (Resend/SendGrid), optional Push and Geolocation.
5. **Quality**: Content moderation (text + image), Testing (integration-testing-strategy), Error handling and retries (integration-error-handling-and-retries).
6. **Later**: Search and CMS when conditions are met.

---

## Document Index (Final)

| Document | Description |
|----------|-------------|
| [integration-inventory.md](integration-inventory.md) | Master list; decision status; phase; credential summary |
| [integration-architecture-overview.md](integration-architecture-overview.md) | Boundaries; who calls whom; adapter; security |
| [identity-authentication.md](identity-authentication.md) | Auth, OAuth, session/JWT, credentials, flows |
| [ai-llm.md](ai-llm.md) | OpenAI/Anthropic, prompts, moderation, cost, fallback |
| [speech-voice.md](speech-voice.md) | Azure/ElevenLabs STT/TTS/pronunciation, mobile web capture |
| [payments-subscriptions.md](payments-subscriptions.md) | Stripe, subscription state, webhooks, entitlement sync |
| [push-notifications.md](push-notifications.md) | Web Push, VAPID, consent, preferences |
| [geolocation-place-context.md](geolocation-place-context.md) | Browser geolocation, place context, privacy |
| [media-storage.md](media-storage.md) | S3/Blob, signed URLs, retention, moderation |
| [analytics-event-tracking.md](analytics-event-tracking.md) | PostHog, event taxonomy, identity merge, privacy |
| [observability-monitoring.md](observability-monitoring.md) | Sentry, tracing, integration health, alerting |
| [email-communication.md](email-communication.md) | Resend/SendGrid, verification, receipts, consent |
| [feature-flags-experimentation.md](feature-flags-experimentation.md) | LaunchDarkly/PostHog, rollout, experiments |
| [content-safety-moderation.md](content-safety-moderation.md) | AI and user content moderation, safety |
| [search-indexing.md](search-indexing.md) | Not Phase 1; when and how (Algolia/Meilisearch) |
| [cms-content-management.md](cms-content-management.md) | Not Phase 1; when and how (Sanity/Contentful) |
| [browser-capabilities-pwa.md](browser-capabilities-pwa.md) | Permissions, PWA, service worker, limitations |
| [integration-security-secrets.md](integration-security-secrets.md) | Secret taxonomy, env registry, rotation, least privilege |
| [integration-environments.md](integration-environments.md) | Dev/staging/prod, sandbox, isolation |
| [integration-implementation-patterns.md](integration-implementation-patterns.md) | Adapter, webhook, retry, circuit breaker, etc. |
| [integration-error-handling-and-retries.md](integration-error-handling-and-retries.md) | Transient vs permanent, backoff, fallbacks, idempotency |
| [integration-testing-strategy.md](integration-testing-strategy.md) | Mocks, sandbox, contract, webhook replay, staging checklist |
| [integration-cost-and-risk-analysis.md](integration-cost-and-risk-analysis.md) | Cost drivers, lock-in, compliance, migration |

---

## What Changed Across Versions

- **Single iteration (v1)**: All integration docs were created to implementation-ready depth in one pass. Batch review and audit confirmed completeness, technical depth, security/compliance coverage, and operational readiness. No v2 required; all docs promoted to final as-is.
- **Key decisions**: Own auth + optional OAuth; OpenAI + Anthropic for LLM; Azure for Speech; Stripe for payments; PostHog for analytics; Sentry for observability; Resend/SendGrid for email; LaunchDarkly or PostHog for flags; search and CMS deferred to Phase 2 with explicit conditions.

---

## Remaining Open Questions (Consolidated)

- Trial length (7 vs 14 days).
- LLM/TTS streaming rollout.
- Push in Phase 1 vs Phase 2.
- Search/CMS trigger (N lessons or team size).
- Optional: ElevenLabs as default TTS for quality vs cost.
- Optional: Google vs Apple OAuth priority for expat segment.
