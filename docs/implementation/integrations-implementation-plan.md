# Integrations Implementation Plan

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

This document **translates the integration specifications** (docs/final/integrations/) into **execution order**: implementation order of providers, sandbox/test account setup, secrets and environment readiness, provider abstraction pattern, per-provider setup (AI, speech, payments, analytics, notifications, media, feature flags, observability), and go-live verification per integration.

---

## 2. Scope

- **In scope**: Order in which each integration is implemented; env and secrets; adapter/abstraction; sandbox and production setup; verification steps.
- **Out of scope**: Detailed API usage (see per-integration docs in docs/final/integrations); backend/frontend feature logic (see backend and frontend plans).

---

## 3. Implementation Order of Providers

| Order | Integration | Phase | Prerequisite |
|-------|-------------|-------|--------------|
| 1 | **Identity (own)** | A | Repo, env |
| 2 | **Observability (Sentry)** | A | Repo, env |
| 3 | **Feature flags** | A | Repo, env |
| 4 | **Secrets / env** | A | Repo |
| 5 | **LLM (OpenAI, Anthropic)** | C | Phase B done; backend API skeleton |
| 6 | **Speech (Azure)** | C | Phase B done; backend API skeleton |
| 7 | **Moderation (OpenAI Moderation)** | C | With or just after LLM |
| 8 | **Media storage (S3/Blob)** | C or D | If voice/speech or reflection need uploads |
| 9 | **Stripe** | D | Phase C done; product/price defined |
| 10 | **Email (Resend/SendGrid)** | D | Phase D notifications |
| 11 | **Analytics (PostHog)** | A (taxonomy) / D (funnel) | Taxonomy in A; events in B–D |
| 12 | **Push (optional)** | D | Notifications; VAPID or provider |
| 13 | **Geolocation (browser)** | E | Client-only; no new provider |
| 14 | **Search / CMS** | E or later | When conditions met (see integration specs) |

---

## 4. Sandbox / Test Account Setup

| Provider | When | What to create |
|----------|------|----------------|
| **Auth** | Phase A | Test users in dev DB; optional: Google/Apple dev apps for OAuth |
| **Sentry** | Phase A | Project; DSN for frontend and backend; env per environment |
| **Feature flags** | Phase A | Project; one flag (e.g. show_voice_entry); client and server SDK keys |
| **OpenAI** | Phase C | API key (sandbox or prod); ensure moderation API enabled |
| **Anthropic** | Phase C | API key for fallback |
| **Azure Speech** | Phase C | Resource in Azure; key and region; optional separate resource for dev |
| **Stripe** | Phase D | Test mode account; products and prices; webhook endpoint (staging URL); test cards |
| **Resend/SendGrid** | Phase D | Account; verified domain or sender; test mode if available |
| **PostHog** | Phase A or D | Project; API key and host; EU if possible |
| **Media storage** | Phase C or D | Bucket/container (dev and staging); IAM or connection string |
| **Push** | Phase D | VAPID keys (Web Push) or OneSignal/FCM project |

Document credentials in secure place; never in repo. Use .env.example with placeholder names only.

---

## 5. Secrets and Environment Readiness

| Item | Phase | Implementation |
|------|-------|----------------|
| **.env.example** | A | List all required vars: AUTH_SECRET, DB_URL, REDIS_URL, SENTRY_DSN, FEATURE_FLAG_SDK_KEY, OPENAI_API_KEY, AZURE_SPEECH_*, STRIPE_*, etc. (see integration-security-secrets) |
| **Backend env** | A | Load from env; validate required vars at startup; fail fast if missing |
| **Frontend env** | A | Only VITE_* vars; build-time injection; no backend secrets |
| **Staging / prod** | D | Secrets in vault or managed secret store; inject at deploy |
| **Rotation** | D | Document rotation for Stripe webhook secret, API keys; test rotation in staging |

Reference: docs/final/integrations/integration-security-secrets.md (or equivalent in repo).

---

## 6. Provider Abstraction Pattern

| Layer | Responsibility |
|-------|----------------|
| **Adapter** | One per provider (e.g. OpenAIAdapter, AzureSpeechAdapter); implements interface (e.g. completeChat, synthesizeSpeech); handles errors, timeouts, retries |
| **Service** | Backend service (e.g. ScenarioService) calls adapter; does not know provider brand; can switch or fallback (e.g. OpenAI → Anthropic) |
| **Config** | Provider choice and keys from env; adapter factory returns correct implementation |
| **Testing** | Mock adapter in unit tests; use sandbox in integration tests |

Implement adapter interface in Phase C for LLM and Speech; in Phase D for Stripe (webhook handler is backend, not adapter), Email, and optional Push.

---

## 7. AI Provider Setup

| Step | Work item | Done criteria |
|------|-----------|----------------|
| 1 | Create OpenAI API key; add to env (OPENAI_API_KEY) | Backend can call OpenAI (e.g. chat completion) |
| 2 | Implement LLM adapter (OpenAI); method: completeChat(messages, options) | Returns assistant message; handles timeout and errors |
| 3 | Add Anthropic key; implement Anthropic adapter with same interface | Fallback when OpenAI fails or config says use Claude |
| 4 | Implement provider selection (config or feature flag) | Scenario service uses selected or fallback |
| 5 | Wire moderation (OpenAI Moderation API) in adapter or scenario service | Unsafe input/output replaced or blocked |
| 6 | Integration test with sandbox | E2E scenario turn returns valid response; moderation blocks test payload |
| 7 | Go-live | Prod key in vault; rate limits and cost alerts configured |

Reference: docs/final/integrations/ai-llm.md.

---

## 8. Speech Provider Setup

| Step | Work item | Done criteria |
|------|-----------|----------------|
| 1 | Create Azure Speech resource; key and region in env | Backend can call Azure |
| 2 | Implement speech adapter: STT(audioBuffer/stream), TTS(text, voiceId), Pronunciation(audio) | Returns text, audio URL or buffer, score/tips |
| 3 | Handle formats (e.g. webm, wav) per Azure spec; convert if needed | STT accepts client upload format |
| 4 | TTS caching (optional): cache by (text, voice); reduce cost and latency | Cache hit returns URL or blob |
| 5 | Timeouts and retries per integration-error-handling doc | No indefinite hang; user sees fallback on failure |
| 6 | Integration test: upload sample audio; get STT; get TTS; get pronunciation | All return valid result |
| 7 | Go-live | Prod key in vault; EU region; retention and deletion for stored audio per BR-4 |

Reference: docs/final/integrations/speech-voice.md.

---

## 9. Payments Provider Setup

| Step | Work item | Done criteria |
|------|-----------|----------------|
| 1 | Stripe account; test mode for dev/staging | Dashboard access |
| 2 | Create product(s) and price(s) in Stripe (e.g. Premium Monthly, Yearly) | Price IDs in env or config |
| 3 | Backend: create Checkout Session (POST); return session URL to frontend | Frontend redirects to Stripe |
| 4 | Configure success/cancel return URLs; frontend handles return (e.g. /settings?subscription=success) | User returns to app after payment |
| 5 | Webhook endpoint: POST /webhooks/stripe; verify signature; parse event | Reject invalid; idempotent by event id |
| 6 | Handle events: customer.subscription.created/updated/deleted, invoice.paid, checkout.session.completed | Update subscriptions table; sync entitlement |
| 7 | Customer portal link (optional): backend generates link for "Manage subscription" | User can cancel or update payment |
| 8 | Test with Stripe test cards and webhook CLI | Subscription created; webhook updates DB; entitlement reflects |
| 9 | Go-live | Live mode keys; webhook URL production; monitor delivery and 5xx |

Reference: docs/final/integrations/payments-subscriptions.md.

---

## 10. Analytics Setup

| Step | Work item | Done criteria |
|------|-----------|----------------|
| 1 | PostHog (or chosen) project; API key and host in env | Frontend and/or backend can send events |
| 2 | Event taxonomy document (see analytics-and-observability-implementation-plan) | Names and properties agreed |
| 3 | Frontend: init SDK; identify user after login; send page_view and key actions | Events appear in PostHog |
| 4 | Backend: send server-side events (e.g. trial_started, payment_success) if needed | Funnel complete |
| 5 | Privacy: no PII in event properties where possible; respect consent (no analytics if withdrawn) | GDPR-compliant |
| 6 | Go-live | Prod project; EU host if required; dashboards and alerts for key funnels |

Reference: docs/final/integrations/analytics-event-tracking.md.

---

## 11. Notification Setup

| Step | Work item | Done criteria |
|------|-----------|----------------|
| 1 | Resend or SendGrid account; API key; verify sender domain | Backend can send email |
| 2 | Templates: verification, receipt, reminder (or use inline HTML) | Send test email |
| 3 | Backend: send verification on signup; send receipt on payment (Phase D) | Emails received |
| 4 | Optional: Web Push; VAPID keys; frontend subscribe; backend store subscription and send | Push received in supported browser |
| 5 | Preferences: store in DB; check before sending marketing | Only send where consented |
| 6 | Go-live | Prod API key; domain verified; rate limits known |

Reference: docs/final/integrations/email-communication.md, push-notifications.md.

---

## 12. Media Storage Setup

| Step | Work item | Done criteria |
|------|-----------|----------------|
| 1 | Create bucket/container (S3-compatible or Azure Blob); EU region | Backend can upload and generate URL |
| 2 | Backend: signed upload URL (POST) for client upload or server-side upload | Client or server uploads file; URL returned |
| 3 | Backend: signed download URL for private content | Frontend displays image/audio via URL |
| 4 | Lifecycle: short TTL for temp audio (e.g. 30 days); retention per BR-4 | Objects expire or are purged |
| 5 | Go-live | Prod bucket; IAM least privilege; no public read for PII |

Reference: docs/final/integrations/media-storage.md.

---

## 13. Feature Flags

| Step | Work item | Done criteria |
|------|-----------|----------------|
| 1 | LaunchDarkly or PostHog flags; client and server SDK keys in env | FE and BE can evaluate flag |
| 2 | One flag (e.g. show_voice_entry) in Phase A | Toggle in dashboard; app shows/hides entry |
| 3 | Rollout flags for Phase D: e.g. premium_upsell_v2, notifications_enabled | Gradual rollout possible |
| 4 | User context: pass user_id or anonymous_id for targeting | Flags can target by user |
| 5 | Go-live | Prod project; no flags required for core path (defaults work) |

Reference: docs/final/integrations/feature-flags-experimentation.md.

---

## 14. Observability Tooling

| Step | Work item | Done criteria |
|------|-----------|----------------|
| 1 | Sentry project(s); DSN for backend and frontend | Errors reported to Sentry |
| 2 | Backend: capture unhandled errors; attach request_id | 500 and exceptions appear |
| 3 | Frontend: capture unhandled errors; source maps for stack traces | Client errors appear |
| 4 | Optional: OpenTelemetry or Sentry tracing; spans for API and integration calls | Latency visible per endpoint and per provider |
| 5 | Alerts: error rate, latency P95 (Phase D) | On-call notified on threshold |
| 6 | Go-live | Prod DSN; alerts configured; runbook for "Sentry alert" |

Reference: docs/final/integrations/observability-monitoring.md.

---

## 15. Go-Live Verification Per Integration

| Integration | Verification |
|-------------|--------------|
| **Auth** | Login/signup in prod; session persists; logout works |
| **LLM** | One scenario turn in prod; response valid; no key leak |
| **Speech** | One voice turn in prod; STT and TTS work; latency acceptable |
| **Stripe** | Test live mode (small amount) or use test clock; webhook received and processed; entitlement updated |
| **Email** | Send real email to team; deliverability and links work |
| **Analytics** | Event in prod project; user identifiable; funnel visible |
| **Feature flags** | Toggle flag; app behavior changes in prod |
| **Sentry** | Trigger test error; appears in Sentry; alert if configured |
| **Media** | Upload and download in prod; URL expires as expected |

---

## 16. Dependencies

- **Backend**: All integrations are consumed by backend services (or frontend for analytics, flags, Stripe redirect).
- **Data**: Subscriptions and usage tables for Stripe and entitlements; notification_preferences for email/push.
- **DevOps**: Secrets and env for each provider; deploy pipeline uses vault or env injection.

---

## 17. Risks

- **Provider outage**: Document fallback (e.g. Anthropic when OpenAI down); circuit breaker and user message.
- **Key rotation**: Rotate keys in vault; update env; restart or redeploy; verify webhook secret rotation for Stripe.
- **Cost overrun**: Per-user caps and alerts (see integration-cost-and-risk-analysis); monitor daily spend.

---

## 18. Readiness and Done Criteria

- **Phase A**: Identity (own), observability (Sentry), feature flags, secrets layout; .env.example complete.
- **Phase C**: LLM and Speech adapters implemented and tested; moderation wired; media storage if needed.
- **Phase D**: Stripe end-to-end; email sending; analytics funnel; optional push; go-live verification done.
- **Phase E**: Geolocation (client-only); search/CMS only when conditions met.
