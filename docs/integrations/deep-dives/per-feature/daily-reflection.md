# Daily Reflection — Per-Feature Integration Specification

**Feature**: FD-07 Daily Reflection  
**Source**: docs/final/feature-domain-breakdown.md §9

---

## 1. Purpose

Specifies **integrations used by Daily Reflection**: LLM for lesson generation from activities, object storage for optional reflection photos, content moderation (user notes and generated content, IS-017/IS-018), entitlement gate, and analytics.

---

## 2. Feature Reference

- **Domain**: FD-07. **User goal**: Log daily activities; get personalized lesson generated. **Integration dependencies**: LLM; storage for media (object storage/CDN); Moderation.

---

## 3. Integrations Used (Summary)

| Integration | Role | Criticality |
|-------------|------|-------------|
| **LLM** | Generate lesson (vocabulary, phrases) from activities + profile (level, context) | Critical |
| **Object storage** | Store optional reflection photos; key in activity; signed or CDN URL for display | High |
| **Content moderation** | Moderate user notes (input) and generated lesson text (output) per IS-017, IS-018 | Critical |
| **Cache / Entitlements** | Gate: premium only | Critical |
| **Analytics** | reflection_added, daily_lesson_generated, daily_lesson_completed | High |

---

## 4. Per-Integration Detail

- **LLM**: Job or on-demand: aggregate activities (notes, venue types, optional photo metadata); build prompt; call LLM; moderate response; persist generated lesson. See [llm-orchestration.md](../../llm-orchestration.md). **Local**: Mock LLM (fixed lesson).
- **Object storage**: Upload photo → Put key → save key in reflection activity. See [object-storage.md](../../object-storage.md). **Local**: MinIO or mock.
- **Moderation**: User notes before LLM (optional); generated lesson after LLM before persist. See [content-safety-moderation.md](../../content-safety-moderation.md). **Local**: Mock pass.
- **Entitlements**: Premium only for reflection and generated lesson. See [entitlements-subscription.md](./entitlements-subscription.md). **Local**: Redis + premium seed.
- **Analytics**: Events above. See [analytics-provider.md](../../analytics-provider.md).

---

## 5. Implementation Implications

- **Backend**: Reflection service (CRUD activities); Lesson Engine (generated lesson); LLM + moderation; storage adapter; entitlement check. **Jobs**: Optional async lesson generation (schedule or on-demand). **DB**: reflection_activities (note, photo_key, venue?), generated_lessons; subscriptions. **UI**: Add reflection; “Your day” lesson; photo upload. **Testing**: Mock LLM, storage, moderation; entitlement 403; E2E with mock data.

---

## 6. Summary

Daily Reflection uses **LLM**, **object storage** (photos), **moderation** (input and output), **entitlements**, and **analytics**. Generation can be sync or async; moderation is mandatory before persisting generated content.
