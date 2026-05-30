# Integration Deep-Dive Index — AI Dutch Coach

**Source**: docs/final/integrations/integration-inventory.md, docs/implementation/integrations.md, docs/final/backend-architecture.md

---

## 1. Integration List

| # | Integration name | Category | Description | Concrete / strategy | Business criticality | Dependency order | File name |
|---|-------------------|----------|-------------|---------------------|----------------------|------------------|-----------|
| 1 | **Payment / billing provider** | Billing | Subscriptions, trials, checkout, customer portal, webhooks for entitlement sync | Concrete (Stripe) | Critical | After Auth | payment-provider.md |
| 2 | **LLM orchestration** | AI | Scenario conversation, voice tutor responses, daily reflection generation, AI feedback; moderation | Strategy (OpenAI primary, Anthropic fallback) | Critical | — | llm-orchestration.md |
| 3 | **Speech & voice** | AI / Media | STT, TTS, pronunciation assessment for voice tutor and pronunciation feature | Strategy (Azure Speech, ElevenLabs TTS option) | Critical | — | speech-voice.md |
| 4 | **Webhook processing** | Platform | Incoming webhooks (payment, optional others); verification, idempotency, async handling | Strategy (provider-agnostic pattern) | Critical (for payment) | After Payment | webhook-processing.md |
| 5 | **Email provider** | Communication | Verification, password reset, receipts, trial-ending reminder | Strategy (SendGrid, Resend, AWS SES) | High | After Auth | email-provider.md |
| 6 | **Identity / auth provider** | Identity | Session/JWT; OAuth (Google, Apple) for sign-in and account linking | Strategy (backend session + OAuth) | Critical | First | identity-auth-provider.md |
| 7 | **Object / media storage** | Storage | Lesson media, listening audio, user photos (reflection), signed URLs | Strategy (S3-compatible, Azure Blob, EU) | High | — | object-storage.md |
| 8 | **Push notifications** | Communication | Re-engagement (streak, trial ending, daily lesson); device token registration | Strategy (Web Push, FCM, APNs) | Medium (P2) | After Entitlements | notification-delivery.md |
| 9 | **Cache / session store** | Platform | Entitlement cache, session store, rate limiting (Redis) | Concrete (Redis) | High | — | cache-session-store.md |
| 10 | **Observability / monitoring** | Operations | Errors (Sentry), logs, tracing; integration health | Strategy (Sentry, OpenTelemetry-compatible) | High | — | observability-monitoring.md |
| 11 | **Analytics / event tracking** | Product | Funnel, engagement, conversion (BFR-013); experiments | Strategy (PostHog, Amplitude) | High | After Auth | analytics-provider.md |
| 12 | **Content moderation / safety** | AI | AI output moderation (IS-017), user content filtering | Strategy (provider-native + optional pipeline) | High | With LLM | content-safety-moderation.md |
| 13 | **Feature flags / experimentation** | Platform | Rollout, A/B tests, model routing | Strategy (LaunchDarkly, PostHog) | High | — | feature-flags-experimentation.md |
| 14 | **Geolocation / place context** | Context | Location-aware prompts (FD-08); browser Geolocation, optional Places API | Strategy (Browser API + optional Google/Mapbox) | Medium (optional feature) | — | geolocation-place-context.md |

---

## 2. Dependency Order (Implementation)

1. **Identity / auth provider** — Foundation for all authenticated flows and entitlement linkage.
2. **Cache / session store** — Session and entitlement cache; needed before or with auth and entitlements.
3. **Payment / billing provider** — Revenue; webhooks drive entitlement state.
4. **Webhook processing** — Required for payment (and any other webhook-driven integrations).
5. **LLM orchestration** — Scenarios, voice, reflection, feedback.
6. **Speech & voice** — Voice tutor and pronunciation.
7. **Content moderation** — With or immediately after LLM.
8. **Email provider** — Auth flows (verification, reset) and optional receipts.
9. **Object / media storage** — Content and user media.
10. **Analytics / event tracking** — Events after auth and key flows exist.
11. **Observability / monitoring** — From day one; can be minimal then expanded.
12. **Feature flags** — Rollout and experiments.
13. **Push notifications** — After entitlements and notification preferences.
14. **Geolocation / place context** — Optional feature.

---

## 3. Concrete vs Strategy

| Type | Integrations |
|------|--------------|
| **Concrete** | Payment (Stripe), Cache (Redis) — provider chosen. |
| **Strategy** | LLM (OpenAI/Anthropic), Speech (Azure/ElevenLabs), Email (SendGrid/Resend/SES), Storage (S3/Blob), Push (Web Push/FCM/APNs), Observability (Sentry/OTel), Analytics (PostHog/Amplitude), Auth (OAuth providers), Moderation, Feature flags, Geolocation, Webhook (pattern). |

Strategy documents define the capability, data flows, and requirements; provider choice can vary by market or project. Concrete documents name the provider and its exact APIs and webhooks.
