# Exam Preparation — Per-Feature Integration Specification

**Feature**: FD-09 Exam Preparation  
**Source**: docs/final/feature-domain-breakdown.md §11

---

## 1. Purpose

Specifies **integrations used by Exam Preparation**: content pipeline (internal); optional external link to official exam info; object storage/CDN for exam media if applicable; entitlement for full exam prep; analytics. No external exam API; content is authored or generated internally.

---

## 2. Feature Reference

- **Domain**: FD-09. **User goal**: Prepare for A2/B1 integration exam and KNM with aligned practice. **Integration dependencies**: Content pipeline; optional link to official exam info (URL).

---

## 3. Integrations Used (Summary)

| Integration | Role | Criticality |
|-------------|------|-------------|
| **Object storage / CDN** | Serve exam-style content (reading, listening audio) if stored as media | High |
| **Cache / Entitlements** | Gate full exam prep modules (premium); free may have limited practice | Critical |
| **Analytics** | exam_prep_started, exam_component_completed, simulated_exam_completed | High |

---

## 4. Per-Integration Detail

- **Object storage**: Same as Core Lessons/Listening for any exam media (passages, audio). See [object-storage.md](../../object-storage.md). **Local**: MinIO or mock URLs.
- **Entitlements**: Premium for full suite; free limited. See [entitlements-subscription.md](./entitlements-subscription.md), [cache-session-store.md](../../cache-session-store.md). **Local**: Redis + subscription seed.
- **Analytics**: Events for funnel and engagement. See [analytics-provider.md](../../analytics-provider.md). **Local**: Mock.

---

## 5. Implementation Implications

- **Backend**: Lesson Engine (exam content, progress); entitlement check. **DB**: exam content, attempts, progress; subscriptions. **UI**: Exam type selection; practice and simulated exam flows. **Testing**: Mock storage and entitlement; E2E with test content.

---

## 6. Summary

Exam Preparation uses **object storage** for media (if any), **entitlements** for gating, and **analytics**. Content pipeline and optional external URL are internal or config; no separate integration deep-dive for “exam API.”
