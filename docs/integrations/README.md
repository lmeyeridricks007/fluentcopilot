# Integrations Documentation

## Overview

This folder contains the **Integrations Specification System** for the AI Language Coach (AI Dutch Coach) product. It documents all external and platform integrations required for identity, AI/LLM, speech, payments, push, geolocation, media, analytics, observability, email, feature flags, content safety, search, CMS, and browser/PWA capabilities.

## Document Index

| Document | Purpose |
|----------|---------|
| [integration-inventory.md](integration-inventory.md) | Master list of all integrations; decision status; phase |
| [integration-architecture-overview.md](integration-architecture-overview.md) | High-level integration architecture; boundaries; patterns |
| [identity-authentication.md](identity-authentication.md) | App auth; sessions/tokens; social login; entitlement linkage |
| [ai-llm.md](ai-llm.md) | OpenAI/Anthropic; prompts; moderation; cost; fallbacks |
| [speech-voice.md](speech-voice.md) | Azure/ElevenLabs STT/TTS; pronunciation; mobile web capture |
| [payments-subscriptions.md](payments-subscriptions.md) | Stripe; subscriptions; trials; webhooks; entitlement sync |
| [push-notifications.md](push-notifications.md) | Web push; FCM; reminders; consent; preferences |
| [geolocation-place-context.md](geolocation-place-context.md) | Browser geolocation; place context; privacy; triggers |
| [media-storage.md](media-storage.md) | User uploads; audio; signed URLs; retention; moderation |
| [analytics-event-tracking.md](analytics-event-tracking.md) | Product events; funnel; privacy-safe; identity merge |
| [observability-monitoring.md](observability-monitoring.md) | Errors; tracing; integration health; alerting |
| [email-communication.md](email-communication.md) | Verification; receipts; reactivation; consent |
| [feature-flags-experimentation.md](feature-flags-experimentation.md) | Rollout; experiments; model routing; cohorts |
| [content-safety-moderation.md](content-safety-moderation.md) | AI output; image; abuse; protected categories |
| [search-indexing.md](search-indexing.md) | Lesson/search relevance; when required; alternatives |
| [cms-content-management.md](cms-content-management.md) | Authored content; help; exam prep; versioning |
| [browser-capabilities-pwa.md](browser-capabilities-pwa.md) | Permissions; PWA; microphone; geolocation; limitations |
| [integration-security-secrets.md](integration-security-secrets.md) | Secret taxonomy; env layout; rotation; least privilege |
| [integration-environments.md](integration-environments.md) | Dev/staging/prod; env vars; sandbox; isolation |
| [integration-implementation-patterns.md](integration-implementation-patterns.md) | Adapter; webhook; retry; circuit breaker; etc. |
| [integration-error-handling-and-retries.md](integration-error-handling-and-retries.md) | Transient vs permanent; backoff; fallbacks; DLQ |
| [integration-testing-strategy.md](integration-testing-strategy.md) | Mocks; sandbox; contract; webhook replay; chaos |
| [integration-cost-and-risk-analysis.md](integration-cost-and-risk-analysis.md) | Cost drivers; lock-in; compliance; migration |

## Versioning and Finalization

- **Drafts/iterations**: Stored in `docs/versions/` (e.g. `ai-llm-v1.md`).
- **Reviews**: Stored in `docs/reviews/` (e.g. `review-ai-llm-v1.md`).
- **Audits**: Stored in `docs/audits/` (e.g. `audit-ai-llm.md`).
- **Final approved**: Stored in `docs/final/integrations/`.

## Quality Standard

All integration docs must meet `docs/meta/INTEGRATION_SPEC_GUIDELINES.md`: each scorecard category ≥ 9/10, overall confidence ≥ 95%, and pass independent audit before promotion to final.
