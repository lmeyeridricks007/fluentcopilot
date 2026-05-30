# External Integrations

**Source**: docs/features/deep-dives, docs/final/backend-architecture.md, docs/final/integrations-implementation-plan.md (if present)

Purpose, API endpoints used, authentication, and required environment variables per integration.

---

## 1. Payment Provider (Stripe)

| Attribute | Value |
|-----------|--------|
| **Purpose** | Subscription and one-time payments; customer portal (manage_url); webhooks for subscription state. |
| **Endpoints** | Create Checkout Session, Create Customer Portal Session, Webhooks (customer.subscription.*, invoice.paid, invoice.payment_failed). |
| **Authentication** | API key (secret); webhook signing secret. |
| **Env vars** | STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PUBLISHABLE_KEY (frontend). STRIPE_PRICE_ID_* for products. |
| **Implementation** | Backend: create checkout session for upgrade; create portal session for manage_url. Webhook endpoint verifies signature, updates subscriptions table, invalidates entitlement cache. |

---

## 2. LLM APIs (OpenAI / Anthropic)

| Attribute | Value |
|-----------|--------|
| **Purpose** | Scenario conversation (FD-03), AI Voice Tutor (FD-04), Daily Reflection lesson generation (FD-07), AI Tutor Feedback (FD-11). |
| **Endpoints** | Chat completions (e.g. /v1/chat/completions). |
| **Authentication** | API key in header (Authorization: Bearer KEY). |
| **Env vars** | OPENAI_API_KEY or ANTHROPIC_API_KEY. Optional: model name (e.g. gpt-4, claude-3). |
| **Implementation** | Adapter layer: prompt construction from scenario/lesson context; output moderation (IS-017) before persisting or returning. Rate limiting and cost controls per user/tier. |

---

## 3. Speech-to-Text (e.g. Azure Speech / Whisper)

| Attribute | Value |
|-----------|--------|
| **Purpose** | AI Voice Tutor (FD-04): transcribe user speech for LLM input. |
| **Endpoints** | REST or SDK: submit audio, get transcript. |
| **Authentication** | Subscription key or OAuth. |
| **Env vars** | AZURE_SPEECH_KEY, AZURE_SPEECH_REGION (or WHISPER_API_KEY if using OpenAI Whisper). |
| **Implementation** | Voice session: receive audio from client (or stream); call STT; pass transcript to LLM; return with TTS response. |

---

## 4. Text-to-Speech (e.g. Azure / ElevenLabs)

| Attribute | Value |
|-----------|--------|
| **Purpose** | AI Voice Tutor: synthesize Dutch (and optionally English) responses for playback. |
| **Endpoints** | REST: submit text, get audio stream or URL. |
| **Authentication** | API key or subscription. |
| **Env vars** | AZURE_TTS_KEY, AZURE_TTS_REGION; or ELEVENLABS_API_KEY, VOICE_ID. |
| **Implementation** | After LLM response: call TTS with selected voice; return audio URL or stream to client. |

---

## 5. Pronunciation Assessment (e.g. Azure)

| Attribute | Value |
|-----------|--------|
| **Purpose** | Pronunciation (FD-06): score and feedback (phoneme, stress, fluency) from user audio. |
| **Endpoints** | Pronunciation assessment REST or SDK. |
| **Authentication** | Same as Azure Speech. |
| **Env vars** | AZURE_SPEECH_KEY, AZURE_SPEECH_REGION (often same as STT). |
| **Implementation** | Pronunciation-analysis sub-feature: send audio + reference text; persist score and tips; display in Pronunciation feedback UI. |

---

## 6. CDN / Media Storage

| Attribute | Value |
|-----------|--------|
| **Purpose** | Serve lesson media (images, audio for listening exercises), static assets. |
| **Endpoints** | GET object by path or key; signed URLs if private. |
| **Authentication** | IAM or signed URL. |
| **Env vars** | CDN_BASE_URL, STORAGE_ACCESS_KEY (or S3/Blob credentials if generating signed URLs). |
| **Implementation** | Content tables store relative paths or keys; API returns full CDN URL in lesson/exercise payloads. |

---

## 7. Email Provider (e.g. SendGrid / AWS SES)

| Attribute | Value |
|-----------|--------|
| **Purpose** | Verification email, password reset, receipts, trial-ending reminder (optional). |
| **Endpoints** | Send transactional email API. |
| **Authentication** | API key. |
| **Env vars** | SENDGRID_API_KEY or AWS_SES_*; FROM_EMAIL, SUPPORT_EMAIL. |
| **Implementation** | Auth flow: send verification and reset links. Optional: subscription receipts and trial-ending (trigger from Notifications). |

---

## 8. Push Notifications (FCM / APNs)

| Attribute | Value |
|-----------|--------|
| **Purpose** | Re-engagement (streak reminder, trial ending, daily lesson ready). FD-15. |
| **Endpoints** | FCM HTTP v1; APNs HTTP/2. |
| **Authentication** | Service account (FCM); key/cert (APNs). |
| **Env vars** | FCM_CREDENTIALS_JSON or path; APNS_KEY_ID, APNS_TEAM_ID, APNS_BUNDLE_ID. |
| **Implementation** | Notifications: register device token (push-registration); trigger-delivery job or sync send on event. |

---

## 9. Redis (Cache / Session)

| Attribute | Value |
|-----------|--------|
| **Purpose** | Entitlement cache (tier, usage); session store; rate limiting. |
| **Endpoints** | Internal: get/set/del by key. |
| **Authentication** | Connection URL (optional password). |
| **Env vars** | REDIS_URL. |
| **Implementation** | Entitlements: cache GET /entitlements result by user_id; TTL 300s; invalidate on webhook and trial/start. |

---

## 10. Observability (Sentry / Logging)

| Attribute | Value |
|-----------|--------|
| **Purpose** | Error tracking, performance, logs. |
| **Endpoints** | Sentry DSN; log aggregation endpoint. |
| **Authentication** | DSN key. |
| **Env vars** | SENTRY_DSN, LOG_LEVEL. |
| **Implementation** | Backend and frontend: capture exceptions; structured logs with request_id, user_id. |

---

## Summary

| Integration | Used by Epics / Features | MVP Required |
|-------------|--------------------------|----------------|
| Stripe | Entitlements (E-13) | Yes |
| LLM (OpenAI/Anthropic) | Scenarios (E-04), Voice (E-05), Reflection (E-08), Feedback (E-12) | Yes (Scenarios, Voice) |
| STT | Voice (E-05) | Yes |
| TTS | Voice (E-05) | Yes |
| Pronunciation API | Pronunciation (E-07) | P1 |
| CDN | Core Lessons, Listening, Content | Yes |
| Email | Auth, optional Notifications | Yes (Auth) |
| Push | Notifications (E-15) | P2 |
| Redis | Entitlements, Session | Yes |
| Sentry | All | Yes |
