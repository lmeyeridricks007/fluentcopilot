# Phase 9: External Integrations (v1)

## Document Info

| Attribute | Value |
|-----------|--------|
| Phase | 9 – External Integrations |
| Version | 1 |
| Status | Draft |

---

## 1. Purpose and Scope

This document describes **external systems** integrated with the AI Dutch Coach platform: LLM, speech (STT/TTS), pronunciation, payment, CDN, and optional push. It provides contract and failure-handling guidance for Backend and Operations.

**In scope**: LLM (OpenAI/Anthropic), Speech (Azure, ElevenLabs), Pronunciation (Azure), Payment (Stripe or equivalent), CDN, Push notifications. For each: purpose, data flow, auth, failure behavior, and compliance/security notes.

**Out of scope**: Internal service-to-service calls; detailed API specs (provider docs).

---

## 2. LLM (OpenAI / Anthropic)

| Aspect | Detail |
|--------|--------|
| **Purpose** | Conversation (scenario, voice), corrections, lesson generation (daily reflection), feedback text |
| **Data flow** | Backend sends prompt (system + user message, context, level); receives completion. User content and context may include PII (e.g. reflection note); minimize in prompt where possible. |
| **Auth** | API key in secrets; backend only. |
| **Failure** | Timeout (e.g. 30s); retry once; then return 503 to client with "Try again." Circuit breaker if repeated failures. |
| **Compliance** | Check provider DPA and data processing location; prefer EU or compliant region. No user content in training (provider policy). IS-017: Moderation applied to output before returning to user. |
| **Multi-provider** | Abstract behind internal interface; allow swap (e.g. OpenAI vs. Anthropic) for resilience. |

---

## 3. Speech: STT and TTS (Azure Speech / ElevenLabs)

| Aspect | Detail |
|--------|--------|
| **Purpose** | STT: user speech → text for LLM. TTS: LLM response → audio for playback (FD-04, FD-05). |
| **Data flow** | Backend sends audio (or stream) to STT; sends text to TTS; returns audio URL or stream to client. Audio may be stored temporarily for pronunciation (see §4). |
| **Auth** | API key or OAuth; backend only. |
| **Failure** | Timeout; retry; fallback: "Voice unavailable, use text" (FD-04). Regional endpoint for lower latency (EU). |
| **Compliance** | Audio is personal data; retention short (Data doc). Prefer region in EU if provider supports. |
| **Multi-provider** | TTS: Azure Neural Voice and/or ElevenLabs; abstract so voice style can be chosen. STT: Azure or equivalent. |

---

## 4. Pronunciation (Azure Speech or dedicated)

| Aspect | Detail |
|--------|--------|
| **Purpose** | Analyze user speech; return score and feedback (FD-06, IS-025). |
| **Data flow** | Backend sends audio; receives score and phoneme/word-level feedback. Persist result (Data doc); do not persist raw audio beyond retention. |
| **Auth** | Same as Speech or dedicated key. |
| **Failure** | Return "Feedback unavailable" to user; do not block session end. |
| **Compliance** | Short retention for audio; result persisted per IS-025. |

---

## 5. Payment (Stripe or equivalent)

| Aspect | Detail |
|--------|--------|
| **Purpose** | Subscription and trial; payment method; webhooks for subscription lifecycle. |
| **Data flow** | Client may redirect to Stripe Checkout or use Stripe Elements; backend never sees card. Webhooks: subscription created/updated/canceled, payment succeeded/failed → backend updates Entitlements and records BFR-013 events. |
| **Auth** | Webhook signature verification; API key for backend calls. |
| **Failure** | Webhook retry with backoff; idempotent handler (check event id). Payment failed → notify user; retry logic per provider. |
| **Compliance** | PCI: no card data in our systems. PII in webhook payload: store only what’s needed (subscription id, user mapping); retain per legal. |
| **Contract** | Subscription and trial periods; currency (EUR); webhook event types documented in provider docs. |

---

## 6. CDN (Media Delivery)

| Aspect | Detail |
|--------|--------|
| **Purpose** | Serve static assets (JS, CSS, images) and lesson/listening media (audio, images). |
| **Data flow** | Backend returns signed or public URLs to media; client loads from CDN. No PII in URL paths. |
| **Auth** | Optional signed URLs for private content; public for static. |
| **Failure** | Client retry; backend can have fallback origin. |
| **Compliance** | EU edge preferred; no PII in logs. |

---

## 7. Push Notifications (Optional)

| Aspect | Detail |
|--------|--------|
| **Purpose** | Remind user to practice (FD-Notifications); re-engagement. |
| **Data flow** | Client registers token (with consent); backend stores token and sends via provider (FCM, APNs, or web push). |
| **Auth** | Provider credentials in backend. |
| **Failure** | Invalid token: remove from DB. Provider down: log; retry. |
| **Compliance** | Consent required (BFR-009); user can disable in Settings. |

---

## 8. Summary Table

| Integration | Purpose | Data shared | Failure behavior |
|-------------|---------|-------------|-------------------|
| LLM | Conversation, feedback, generation | Prompts (may include context); no storage in our control | Retry; 503; circuit breaker |
| STT/TTS | Voice input/output | Audio, text | Retry; fallback to text |
| Pronunciation | Speech feedback | Audio (short retention) | Skip feedback; do not block |
| Payment | Subscription, webhooks | Subscription events, no card | Idempotent webhook; notify user on fail |
| CDN | Media delivery | URLs only | Client retry |
| Push | Notifications | Token, message | Remove bad token; retry |

---

## 9. Traceability

- ARCH-003: External calls from EU-hosted backend; data residency per provider. FD-03, FD-04, FD-06: LLM and speech in scenario and voice. FD-12: Payment for subscription. IS-017: Moderation on LLM output. BFR-013: Payment webhook drives funnel events.
