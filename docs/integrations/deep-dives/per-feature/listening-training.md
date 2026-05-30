# Listening Training — Per-Feature Integration Specification

**Feature**: FD-05 Listening Training  
**Source**: docs/final/feature-domain-breakdown.md §7

---

## 1. Purpose

Specifies **integrations used by Listening Training**: object storage/CDN for exercise audio, entitlement for premium content gating, and analytics. Optional future: TTS for generated listening.

---

## 2. Feature Reference

- **Domain**: FD-05. **User goal**: Improve listening comprehension with audio exercises. **Integration dependencies**: CDN for audio; optional TTS for generated listening (future).

---

## 3. Integrations Used (Summary)

| Integration | Role | Criticality |
|-------------|------|-------------|
| **Object storage / CDN** | Serve listening exercise audio; content stores key/path; API returns URL to client | High |
| **Cache / Entitlements** | Gate premium listening content (e.g. exam-style); free gets basic set | High |
| **Analytics** | listening_started, listening_completed, listening_abandoned | High |

---

## 4. Per-Integration Detail

- **Object storage**: Same pattern as Core Lessons media: exercise payload includes audio_url (CDN or signed). Client GETs URL. See [object-storage.md](../../object-storage.md). **Local**: MinIO or mock URLs.
- **Entitlements**: Check tier before serving premium/exam listening; return 403 or filter list. See [entitlements-subscription.md](./entitlements-subscription.md), [cache-session-store.md](../../cache-session-store.md). **Local**: Redis + seed subscription.
- **Analytics**: Events on start, complete, abandon. See [analytics-provider.md](../../analytics-provider.md). **Local**: Mock.

---

## 5. Implementation Implications

- **Backend**: Lesson Engine (listening content); media resolution; entitlement check. **DB**: listening content (audio_key), attempts, progress; subscriptions. **UI**: Audio player; questions; feedback. **Testing**: Mock storage and entitlement; E2E with test audio URL.

---

## 6. Summary

Listening Training uses **object storage/CDN** for audio, **entitlements/cache** for premium gating, and **analytics** for events. Optional TTS later for generated exercises; see [speech-voice.md](../../speech-voice.md).
