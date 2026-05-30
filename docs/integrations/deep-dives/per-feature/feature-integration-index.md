# Per-Feature Integration Index — AI Dutch Coach

**Source**: docs/final/feature-domain-breakdown.md (Integration Dependencies), docs/integrations/deep-dives/integration-index.md

---

## 1. Feature → Integrations Map

| Feature | FD / Epic | Integrations used | File name |
|---------|-----------|-------------------|-----------|
| **Authentication** | E-01 | Identity/Auth, Email (verification, reset), Analytics, Observability | authentication.md |
| **Onboarding & Profile** | FD-01 | Auth (social login), Analytics | onboarding-profile.md |
| **Core Lessons** | FD-02 | Object storage/CDN, Cache (entitlement), Entitlements (cap), Analytics | core-lessons.md |
| **CEFR curriculum path & revision** (extension) | FD-01, FD-02, E-14 | CDN/CMS (manifest content), Analytics (path/plan/revision events), optional Entitlements (revision limits) | See `docs/feature-extensions/cefr-curriculum-path-overview.md` |
| **Scenario Simulations** | FD-03 | LLM, Content moderation, Cache/Entitlements, Analytics | scenario-simulations.md |
| **AI Voice Tutor** | FD-04 | Speech (STT, TTS), LLM, Moderation, Cache/Entitlements, optional Pronunciation, Analytics | ai-voice-tutor.md |
| **Listening Training** | FD-05 | Object storage/CDN (audio), Entitlements, Analytics | listening-training.md |
| **Pronunciation** | FD-06 | Speech (Pronunciation API), Cache/Entitlements, Analytics | pronunciation.md |
| **Daily Reflection** | FD-07 | LLM, Object storage (photos), Moderation, Entitlements, Analytics | daily-reflection.md |
| **Location-Aware Prompts** | FD-08 | Geolocation/Places, Entitlements (optional), Analytics | location-aware-prompts.md |
| **Exam Preparation** | FD-09 | Content pipeline (internal); optional external link; Entitlements, Analytics | exam-preparation.md |
| **Gamification** | FD-10 | Cache (Redis), Analytics | gamification.md |
| **AI Tutor Feedback** | FD-11 | LLM, Moderation, Analytics | ai-tutor-feedback.md |
| **Entitlements & Subscription** | FD-12 | Payment, Webhook, Cache, Email (optional), Analytics, Observability | entitlements-subscription.md |
| **Notifications** | FD-15 | Push, Email (optional), Entitlements (preferences), Analytics | notifications.md |

---

## 2. Integration → Features (Reverse Map)

| Integration | Features that use it |
|-------------|----------------------|
| **Identity / Auth** | Authentication, Onboarding & Profile |
| **Email** | Authentication (verification, reset), Entitlements (receipts, trial reminder), Notifications |
| **Payment** | Entitlements & Subscription |
| **Webhook** | Entitlements & Subscription |
| **Cache / Session (Redis)** | All authenticated features (session); Core Lessons, Scenarios, Voice, Pronunciation, Daily Reflection, Entitlements (entitlement cache); Gamification |
| **LLM** | Scenario Simulations, AI Voice Tutor, Daily Reflection, AI Tutor Feedback |
| **Speech (STT, TTS, Pronunciation)** | AI Voice Tutor, Pronunciation |
| **Content moderation** | Scenario Simulations, AI Voice Tutor, Daily Reflection, AI Tutor Feedback |
| **Object storage** | Core Lessons (media), Listening (audio), Daily Reflection (photos), Curriculum manifests (if media packaged) |
| **Geolocation / Places** | Location-Aware Prompts |
| **Push** | Notifications |
| **Analytics** | All features (events) |
| **Observability** | All (errors, health); called out in Authentication, Entitlements |

---

## 3. Dependency Order (Feature Implementation)

When building features, integration availability follows this order:

1. **Identity, Cache, Observability** — Needed by almost every feature.
2. **Entitlements (Payment + Webhook)** — Needed to gate premium features (Scenarios, Voice, Pronunciation, Reflection, Exam, etc.).
3. **Object storage** — Needed for Core Lessons, Listening, Daily Reflection media.
4. **LLM + Moderation** — Needed for Scenarios, Voice, Reflection, AI Feedback.
5. **Speech (STT, TTS, Pronunciation)** — Needed for Voice and Pronunciation.
6. **Email** — Auth and optional Entitlements/Notifications.
7. **Geolocation** — Location-Aware Prompts (optional).
8. **Push** — Notifications (optional / Phase 2).
9. **Analytics** — Can be added per feature as flows are implemented.
