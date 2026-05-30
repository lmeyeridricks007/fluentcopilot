# Pronunciation — Per-Feature Integration Specification

**Feature**: FD-06 Pronunciation Analysis  
**Source**: docs/final/feature-domain-breakdown.md §8

---

## 1. Purpose

Specifies **integrations used by Pronunciation**: speech (Pronunciation API, e.g. Azure), entitlement/cache (premium only), and analytics. Covers dedicated pronunciation exercises and optional in-voice feedback.

---

## 2. Feature Reference

- **Domain**: FD-06. **User goal**: Get feedback on pronunciation (phoneme, stress, fluency). **Integration dependencies**: Pronunciation API (e.g. Azure).

---

## 3. Integrations Used (Summary)

| Integration | Role | Criticality |
|-------------|------|-------------|
| **Speech (Pronunciation API)** | Send user audio + reference text; receive score and tips; persist and display | Critical |
| **Cache / Entitlements** | Gate: premium only (BFR-002); microphone consent | Critical |
| **Analytics** | pronunciation_completed, pronunciation_skipped_failure | High |

---

## 4. Per-Integration Detail

- **Speech**: POST /v1/pronunciation/analyze (audio, reference_text). Backend calls Pronunciation adapter; returns score, dimensions, tips. See [speech-voice.md](../../speech-voice.md). **Failure**: Service down → "Feedback unavailable"; retry option. **Local**: Mock (fixed score/tips).
- **Entitlements**: Check tier and consent before analyze. See [entitlements-subscription.md](./entitlements-subscription.md). **Local**: Redis + premium user seed.
- **Analytics**: completion and skip events. See [analytics-provider.md](../../analytics-provider.md).

---

## 5. Implementation Implications

- **Backend**: Speech service (Pronunciation adapter); entitlement check. **DB**: pronunciation_results (user_id, reference_text, score, tips); consent. **UI**: Record button; score and tips; "Feedback unavailable" on error. **Testing**: Mock pronunciation adapter; entitlement 403; E2E with mock.

---

## 6. Summary

Pronunciation uses **Speech (Pronunciation API)**, **entitlements/cache** for gating, and **analytics**. Full speech and auth detail in [speech-voice.md](../../speech-voice.md) and [entitlements-subscription.md](./entitlements-subscription.md).
