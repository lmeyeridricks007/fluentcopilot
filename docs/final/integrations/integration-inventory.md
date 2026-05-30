# Integration Inventory

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

This document is the **master inventory** of all external and platform integrations for the AI Language Coach. It records decision status (required now / later / optional / rejected), recommended provider(s), phase (1 vs later), and traceability to product capabilities.

---

## 2. Inventory Table

| # | Integration domain | Decision status | Recommended provider | Phase | Product capabilities supported |
|---|--------------------|-----------------|----------------------|-------|---------------------------------|
| 1 | **Identity & authentication** | Required now | Backend session/JWT + optional OAuth (Google, Apple) | 1 | Login, signup, onboarding, entitlement linkage, device/session |
| 2 | **AI / LLM** | Required now | OpenAI (primary), Anthropic (fallback/alternative) | 1 | Scenarios, voice tutor, corrections, daily reflection, feedback |
| 3 | **Speech & voice** | Required now | Azure Speech (STT, TTS, pronunciation), ElevenLabs (TTS alternative) | 1 | Voice tutor, listening, pronunciation analysis |
| 4 | **Payments / subscriptions** | Required now | Stripe | 1 | Premium, trial, billing, entitlement sync, webhooks |
| 5 | **Push notifications** | Required later (optional Phase 1) | Web Push + optional FCM/OneSignal | 1 or 2 | Reminders, streak nudges, re-engagement |
| 6 | **Geolocation / place context** | Required now (optional feature) | Browser Geolocation API; optional Places (Google/Mapbox) | 1 | Location-aware phrase prompts (FD-08) |
| 7 | **Media storage** | Required now | S3-compatible or Azure Blob (EU) | 1 | User photos (reflection), audio retention, lesson media |
| 8 | **Analytics / event tracking** | Required now | PostHog or Amplitude (recommend PostHog for EU/privacy) | 1 | Funnel, engagement, conversion, experiments |
| 9 | **Error monitoring / observability** | Required now | Sentry (errors), OpenTelemetry-compatible (tracing) | 1 | Frontend errors, backend tracing, integration health |
| 10 | **Email** | Required now | Resend or SendGrid | 1 | Verification, receipts, reactivation, consent |
| 11 | **Feature flags / experimentation** | Required now | LaunchDarkly or PostHog (if PostHog for analytics) | 1 | Rollout, A/B tests, model routing |
| 12 | **Content moderation / safety** | Required now | Provider-native (OpenAI/Anthropic) + optional custom pipeline | 1 | AI output safety, user content, IS-017 |
| 13 | **Search / indexing** | Optional later | Algolia or Meilisearch when lesson discovery scales | 2 | Lesson/search, phrasebook (future) |
| 14 | **CMS / content management** | Optional later | Sanity or Contentful when content team scales | 2 | Authored lessons, help, exam prep, localization |
| 15 | **Browser / PWA** | Required now (no external SaaS) | Browser APIs only | 1 | Permissions, install, microphone, geolocation, notifications |

---

## 3. Credential Summary (High-Level)

| Integration | Credential type | Where used | Stored |
|-------------|-----------------|------------|--------|
| Identity | Session secret / JWT secret; OAuth client ID/secret | Backend | Env / vault; OAuth client secret backend-only |
| AI/LLM | API key (OpenAI, Anthropic) | Backend | Env / vault |
| Speech | Azure subscription key or token; ElevenLabs API key | Backend | Env / vault |
| Payments | Stripe secret key; webhook signing secret | Backend | Env / vault |
| Push | VAPID keys (web); FCM server key (if FCM) | Backend; public key in frontend for web push | Env; public key in build |
| Media | Storage access key / connection string | Backend | Env / vault |
| Analytics | API key / project ID | Backend + frontend (write key safe per provider) | Env; frontend receives inject from backend or build-time |
| Observability | Sentry DSN (frontend); backend API key | Frontend (DSN); Backend | Env; DSN can be public |
| Email | SMTP or API key (Resend/SendGrid) | Backend | Env / vault |
| Feature flags | SDK key (client + server) | Frontend + Backend | Env; client key in build |
| Moderation | Same as LLM or dedicated API key | Backend | Env / vault |

---

## 4. Phase 1 vs Later

- **Phase 1 (launch)**: Identity, AI/LLM, Speech, Payments, Media storage, Analytics, Observability, Email, Feature flags, Moderation, Browser/PWA. Optional in Phase 1: Push (can be post-launch), Geolocation (feature is optional).
- **Phase 2 (scale / expand)**: Search (when lesson catalog and discovery justify it), CMS (when content workflow and localization justify it). Push if deferred.

---

## 5. Dependencies Between Integrations

- **Identity** → required for Entitlements (Payments), Analytics (user id), Feature flags (user/cohort).
- **Payments** → webhooks update Entitlements; Entitlements gate AI, Speech, premium features.
- **AI/LLM** → may use Moderation (same or separate); Feature flags can route model.
- **Speech** → depends on Media storage for temporary audio if persisted; backend only.
- **Analytics** → receives events from Frontend and Backend; identity merge after login (anonymous → authenticated).
- **Feature flags** → can control rollout of Push, Geolocation, and specific AI/speech features.

---

## 6. Out of Scope (Explicitly Excluded)

| Integration | Status | Reason |
|-------------|--------|--------|
| Enterprise SSO / SAML | Rejected for Phase 1 | Future enterprise/school support; not required for B2C launch |
| SMS / WhatsApp | Optional later | Not required for initial verification or notifications; email first |
| Third-party lesson marketplaces | Rejected | Not in product scope |
| Social login (beyond Google/Apple) | Optional | Google and Apple sufficient for expat segment; others later if needed |

---

## 7. Traceability to Product Docs

- **Business**: BFR-002 (entitlements), BFR-008 (export/deletion), BFR-009 (consent), BFR-013 (conversion events).
- **Feature domains**: FD-01 (onboarding, profile), FD-03 (scenarios), FD-04 (voice), FD-06 (pronunciation), FD-07 (reflection), FD-08 (location), FD-12 (payments, entitlements).
- **Industry**: IS-016 (AI indicated), IS-017 (moderation), IS-025 (pronunciation).
- **Architecture**: Single API (ARCH-002); observability (ARCH-004); EU residency (ARCH-001, ARCH-003).
