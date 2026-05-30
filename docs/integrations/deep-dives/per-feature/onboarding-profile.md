# Onboarding & Profile — Per-Feature Integration Specification

**Feature**: FD-01 Onboarding & Profile  
**Source**: docs/final/feature-domain-breakdown.md §3

---

## 1. Purpose

Specifies **integrations used by Onboarding & Profile**: auth (social login for identity), and analytics (onboarding_started, onboarding_step_completed, onboarding_completed, consent_granted/withdrawn). Profile and consent storage are internal (DB); no CDN or payment in this feature.

---

## 2. Feature Reference

- **Domain**: FD-01. **User goal**: Complete profile and get personalized path. **Integration dependencies**: Auth provider (if social login). None for profile storage (internal).

---

## 3. Integrations Used (Summary)

| Integration | Role | Criticality |
|-------------|------|-------------|
| **Identity / Auth** | Social login (Google, Apple) during or before onboarding; link provider to our user | High (if social) |
| **Analytics** | onboarding_started, onboarding_step_completed, onboarding_completed, consent_granted/withdrawn | High |

---

## 4. Per-Integration Detail

- **Identity**: If user arrives via OAuth, callback creates/links user and session; onboarding then runs for that user. See [identity-auth-provider.md](../../identity-auth-provider.md). **Local**: Dev OAuth or mock.
- **Analytics**: Track steps and completion for funnel; consent events for compliance. See [analytics-provider.md](../../analytics-provider.md). **Local**: Mock or disable.

---

## 5. Implementation Implications

- **Backend**: Profile service (save profile, consent); optional OAuth link. **DB**: users, profile, consent. **UI**: Onboarding steps (profile, level, goals, consent). **Testing**: With/without OAuth; analytics events asserted in mock.

---

## 6. Summary

Onboarding & Profile uses **Auth** (social login only) and **Analytics** (steps and consent). Profile and consent are internal; no object storage or payment in this feature.
