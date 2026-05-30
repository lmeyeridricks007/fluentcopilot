# Integration Cost and Risk Analysis

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

Compares **cost drivers**, **vendor lock-in**, **compliance**, **latency**, **quality**, and **operational burden** across major integrations; outlines **fallback and migration** strategy.

---

## 2. Cost Drivers (Expected)

| Integration | Primary cost driver | Rough scale (Phase 1) |
|-------------|---------------------|------------------------|
| **LLM** | Token usage (prompt + completion) | $0.15–2.50/1M tokens; target <$0.30/user/month with caps and mini model |
| **Speech** | STT/TTS per character or minute; pronunciation | Azure: per audio minute; target <$0.50–1/user/month |
| **Stripe** | % of revenue + fixed per transaction | ~2.9% + €0.25 per charge; negligible at low volume |
| **Email** | Per email sent | Resend: ~$0.10/1k emails |
| **Storage** | Storage + egress | Low for Phase 1 (photos, temp audio) |
| **Analytics** | Events or MAU | PostHog: free tier or low $ |
| **Sentry** | Events/errors | Free tier or low $ |
| **Feature flags** | MAU or flags | LaunchDarkly: free tier or low $ |

**Total target** (from Business doc): ~$1–2 per active user per month. LLM + Speech dominate; caps and caching critical.

---

## 3. Vendor Lock-In Risks

| Provider | Lock-in | Mitigation |
|----------|---------|------------|
| **OpenAI/Anthropic** | API and prompt format | Adapter pattern; two providers; prompts portable; no fine-tune dependency Phase 1 |
| **Azure Speech** | STT/TTS/Pronunciation API | Adapter; could add Google/Deepgram later for TTS; pronunciation may stay Azure |
| **Stripe** | Subscription and webhook model | Standard subscription concepts; migration would need export and re-import of customers; rare |
| **PostHog** | Event schema and dashboards | Events are simple; could export and re-send to Amplitude/Mixpanel |
| **Resend/SendGrid** | API and templates | SMTP is standard; templates can be recreated |

**Strategy**: Prefer adapters and minimal provider-specific logic. For LLM and TTS, maintain at least two options (primary + fallback).

---

## 4. Compliance Risks

| Area | Risk | Mitigation |
|------|------|------------|
| **GDPR** | Data in non-EU provider | Prefer EU regions (OpenAI EU, Azure EU, Stripe EU, PostHog EU); DPAs in place |
| **PCI** | Card data | We do not touch cards; Stripe handles; no PCI scope for us |
| **AI** | EU AI Act, transparency | Document AI use cases (IS-023); user informed (IS-016); moderation (IS-017) |
| **Email** | Consent and unsubscribe | BFR-009; unsubscribe in every marketing email; store preference |

---

## 5. Latency Risks

| Integration | Risk | Mitigation |
|-------------|------|------------|
| **LLM** | High latency (5–30 s) | Timeout 30 s; streaming if supported; use mini model; show “Thinking…” |
| **Speech** | STT/TTS delay | Regional endpoint (EU); stream TTS; cache repeated TTS |
| **Stripe** | Webhook delay | Eventual consistency; “Updating…” and optional refresh |
| **Analytics** | Non-blocking | Fire-and-forget; do not block user action |

---

## 6. Quality Risks

| Integration | Risk | Mitigation |
|-------------|------|------------|
| **LLM** | Wrong language, unsafe output | System prompt “Dutch only”; output moderation always |
| **Speech** | Poor Dutch STT/TTS | Choose Dutch-supported voices and locale; test with native speakers |
| **Pronunciation** | Inaccurate feedback | Use documented rubric (IS-025); tune or change provider if needed |

---

## 7. Operational Burden

| Integration | Burden | Mitigation |
|-------------|--------|------------|
| **Secrets** | Many keys; rotation | Central vault; rotation runbook; env registry (integration-security-secrets) |
| **Webhooks** | Stripe retries, signature | Idempotency; verify signature; monitor delivery in Stripe Dashboard |
| **Rate limits** | LLM, Speech 429 | Backoff; circuit breaker; per-user caps; alert on high 429 |
| **Cost spikes** | LLM/Speech overuse | Per-user caps; daily spend alert; circuit breaker |

---

## 8. Fallback and Migration Strategy

- **LLM**: Primary OpenAI; fallback Anthropic. If both down: return 503 and “Try again later” or text-only scenario.
- **TTS**: Primary Azure; fallback ElevenLabs (if integrated). If both down: return transcript only.
- **STT**: Single provider (Azure) Phase 1; add fallback (e.g. Deepgram) if needed.
- **Payments**: No fallback (Stripe only); ensure Stripe status page and our alerting.
- **Migration**: For LLM/Speech, new adapter + config switch; run both in parallel briefly; cut over. For Stripe, migration would require customer export and new provider onboarding (avoid unless forced).
