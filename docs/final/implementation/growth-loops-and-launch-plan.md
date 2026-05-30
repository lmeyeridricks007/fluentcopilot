# Growth Loops and Launch Plan

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

This document defines **initial launch** and **user acquisition support** work: launch scope, channels, growth hooks (referral, sharing), experiment readiness, and what must be in place for Day 1 launch vs post-launch iteration.

---

## 2. Scope

- **In scope**: Launch scope and readiness; minimal growth hooks (share, optional referral); experiment infrastructure; launch communication and support.
- **Out of scope**: Full growth strategy (product/marketing); paid acquisition campaigns; detailed referral program (Phase E).

---

## 3. Assumptions

- Launch is Netherlands (Dutch); expat audience.
- First launch is "soft" or controlled (e.g. waitlist, invite, or small beta) rather than open flood.
- Referral and viral loops are Phase E or post-launch; Phase D only ensures hooks exist (e.g. share link, experiment flags).
- Support: email or in-app help; no live chat required for launch.

---

## 4. Launch Scope (What Ships at Launch)

| Area | In scope for launch |
|------|----------------------|
| **Product** | Onboarding, lessons, flashcards, quizzes, progress, gamification, scenario (text), voice tutor, listening, pronunciation, subscriptions, entitlement gating, notifications (email), settings, export/delete |
| **Content** | Launch lesson set (curated); 2–5 scenarios; listening exercises; enough for 2–4 weeks of daily use |
| **Growth** | Share link (e.g. "I'm learning with AI Dutch Coach"); optional referral placeholder (Phase E) |
| **Experiments** | Feature flags for rollout and A/B tests (e.g. onboarding_v2, upsell_copy); no complex experiments required Day 1 |
| **Support** | Help/support link; email or form; FAQ optional |
| **Legal** | Privacy policy; Terms; consent flows; cookie banner if required |

Out of scope for launch: daily reflection, location prompts, advanced exam prep, referral program, native app, second language.

---

## 5. Launch Readiness (Summary)

- All Phase D exit criteria met (see delivery-phases.md).
- Launch checklist completed (see launch-checklist.md).
- Go/no-go decision: functionality, performance, security, privacy, billing, ops, stakeholder sign-off.
- Rollback plan and runbook in place.
- Support channel and owner identified.
- Legal pages and consent live.

---

## 6. Channels (Minimal for Launch)

| Channel | Launch | Post-launch |
|---------|--------|-------------|
| **Organic** | Landing page or app URL; SEO basics (title, meta) | Content, keywords |
| **Waitlist / invite** | Optional: collect emails; invite in batches | — |
| **Product** | In-app share (link or social); no referral reward yet | Referral program (Phase E) |
| **Paid** | Not required for Day 1 | Optional: Google, Meta, etc. |
| **PR / community** | Optional: launch post, expat communities | — |

---

## 7. Growth Hooks (Implementation)

| Hook | Phase | Implementation |
|------|-------|----------------|
| **Share** | D | "Share" button: copy link or open share dialog (Web Share API or fallback); link = app URL with optional ref param (e.g. ?ref=share); no reward |
| **Referral** | E | Referral code or link; track signup from ref; reward (discount, free month) in Phase E; Phase D: only track ref param if present for analytics |
| **Experiment flags** | D | Feature flags (LaunchDarkly/PostHog) for onboarding_v2, upsell_copy, etc.; run A/B test when needed |
| **Email** | D | Verification, receipt, reminder; consent-based; no spam |
| **Push** | D (optional) | Reminder and re-engagement; consent; Phase E for referral or campaign |

---

## 8. Experiment Readiness

| Item | Implementation |
|------|----------------|
| **Flags** | Rollout and experiment flags in place (see feature-flags-experimentation integration); user context passed |
| **Analytics** | Funnel and key events (see analytics-and-observability-implementation-plan); segment by cohort or variant |
| **A/B test** | Optional: run one test at launch (e.g. onboarding copy or paywall timing); document hypothesis and result |
| **No dependency** | Experiments must not block launch; default variant must be safe |

---

## 9. Launch Communication

| Audience | Message |
|----------|---------|
| **Users (waitlist)** | "We're live" email with link and how to get started |
| **Internal** | Launch summary; support owner; monitoring and on-call |
| **Stakeholders** | Go/no-go outcome; launch date and scope |

No requirement for press or paid; product decision.

---

## 10. Support Workflows

| Item | Implementation |
|------|----------------|
| **Channel** | Email (support@ or help form); or in-app "Contact us" with email link |
| **Owner** | Designate support owner (product or ops); triage to engineering for bugs |
| **FAQ** | Optional: 5–10 questions (account, subscription, data, how to use) |
| **Abuse** | Document: how to handle abuse report; content moderation (see content-safety-moderation); block user if needed |
| **Escalation** | P0: on-call; P1: next business day; document in runbook |

---

## 11. What Should Happen Before Launch

- [ ] Phase D gate passed.
- [ ] Launch checklist signed off.
- [ ] Go/no-go meeting held; decision documented.
- [ ] Support channel and owner set.
- [ ] Monitoring and alerting on; on-call or escalation path defined.
- [ ] Rollback and hotfix process tested once.
- [ ] Legal pages (privacy, terms) and consent flows live.
- [ ] At least one successful test purchase and export/delete in production-like env.

---

## 12. What Happens After Launch (First 30–60 Days)

- Execute post-launch stabilization plan (see post-launch-stabilization-plan.md).
- Monitor errors, latency, conversion, and support volume.
- Iterate on onboarding and paywall based on data.
- Plan Phase E (reflection, location, exam, referral) based on capacity and feedback.

---

## 13. Dependencies

- **Product**: Launch scope and channel decisions.
- **Frontend**: Share button and ref param; experiment flag integration.
- **Backend**: Ref param storage or analytics event (optional).
- **Analytics**: Funnel and cohort analysis for experiments.
- **Support**: Process and owner (staffing-and-operating-model).

---

## 14. Risks

- **Launch too early**: Incomplete billing or GDPR causes reputational or legal risk. Mitigation: go/no-go and checklist.
- **No growth loop**: Rely on one channel. Mitigation: share and ref param in place; expand in Phase E.
- **Support overload**: Document FAQ and escalation; start with email only.

---

## 15. Readiness and Done Criteria

- **Phase D**: Share hook (and optional ref param) implemented; experiment flags ready; support channel and owner set; launch checklist and go/no-go process defined.
- **Launch**: Checklist complete; go/no-go go; communication sent; monitoring and support active.
- **Phase E**: Referral program and additional channels as needed.
