# Milestones and Gates

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

This document defines **milestone gates** and **readiness checkpoints** for the implementation. Each phase has a gate that must be passed before the next phase starts; within phases, key milestones help track progress and trigger reviews.

---

## 2. Scope

- **In scope**: Phase gates (A–E); technical milestones within each phase; release and launch gates.
- **Out of scope**: Sprint-level milestones; exact dates (use relative order only).

---

## 3. Gate Definitions

| Gate | Type | When | Criteria | Who signs off |
|------|------|------|----------|----------------|
| **Gate A** | Phase exit | End of Phase A | All Phase A exit criteria (A1–A8) met | Tech lead + Product |
| **Gate B** | Phase exit | End of Phase B | All Phase B exit criteria (B1–B7) met | Tech lead + Product |
| **Gate C** | Phase exit | End of Phase C | All Phase C exit criteria (C1–C7) met | Tech lead + Product |
| **Gate D** | Phase exit | End of Phase D | All Phase D exit criteria (D1–D9) met; launch checklist done | Tech lead + Product + Stakeholder |
| **Gate E** | Phase exit | End of Phase E | All Phase E exit criteria (E1–E6) met | Tech lead + Product |
| **Launch gate** | Go/no-go | Before production launch | Launch checklist complete; go/no-go decision | Product + Stakeholder |

---

## 4. Phase A Milestones

| Milestone | Description | Readiness for next | Complexity |
|-----------|-------------|--------------------|------------|
| **M-A1** | Repo and env ready | Backend and frontend can run locally with env vars | Low |
| **M-A2** | Auth working (signup, login, session) | All authenticated flows can be built | Medium |
| **M-A3** | First deploy to staging | Staging exists; team can deploy and test | Medium |
| **M-A4** | Data model and first migration | Profile and lesson work can start | Low |
| **M-A5** | Design system base and app shell | All UI work has base components and routing | Medium |
| **M-A6** | Observability and feature flags | Can observe and control rollout | Low |
| **M-A7** | Phase A gate review | Gate A criteria verified | — |

---

## 5. Phase B Milestones

| Milestone | Description | Readiness for next | Complexity |
|-----------|-------------|--------------------|------------|
| **M-B1** | Onboarding API and UI complete | User has profile and consent; lesson engine can use profile | Medium |
| **M-B2** | Lesson engine API and seed data | Lesson UI can consume real data | Medium |
| **M-B3** | Lesson UI (guided, flashcards, quiz) | User can complete a full lesson | High |
| **M-B4** | Progress and gamification | User sees progress and XP/streak | Medium |
| **M-B5** | Home and recommendations | Core loop complete | Low |
| **M-B6** | Phase B gate review | Gate B criteria verified | — |

---

## 6. Phase C Milestones

| Milestone | Description | Readiness for next | Complexity |
|-----------|-------------|--------------------|------------|
| **M-C1** | LLM adapter and scenario API | Scenario UI can run real conversations | High |
| **M-C2** | Scenario UI complete | User can do text scenario end-to-end | Medium |
| **M-C3** | Speech adapter (STT, TTS, pronunciation) | Voice and listening can be built | High |
| **M-C4** | Voice and listening UI | User can do voice session and listening exercise | High |
| **M-C5** | Moderation and fallbacks | Safe and resilient; Phase C gate | Medium |
| **M-C6** | Phase C gate review | Gate C criteria verified | — |

---

## 7. Phase D Milestones

| Milestone | Description | Readiness for next | Complexity |
|-----------|-------------|--------------------|------------|
| **M-D1** | Stripe and entitlement service | Payments and gating work | High |
| **M-D2** | Entitlement gating and upsell UI | Free/premium experience correct | Medium |
| **M-D3** | Notifications (email, optional push) | Reminders and re-engagement possible | Medium |
| **M-D4** | Analytics funnel and hardening | Launch visibility and reliability | Medium |
| **M-D5** | GDPR export/delete and launch content | Launch-ready from compliance and content | Medium |
| **M-D6** | Launch checklist and go/no-go | Production launch | — |

---

## 8. Phase E Milestones

| Milestone | Description | Readiness for next | Complexity |
|-----------|-------------|--------------------|------------|
| **M-E1** | Daily reflection | Reflection feature live | Medium |
| **M-E2** | Location prompts | Location feature live | Low |
| **M-E3** | Exam prep extension | Exam content and UX extended | Medium |
| **M-E4** | Content ops and multi-language readiness | Scale and expansion ready | Low |
| **M-E5** | Cost and performance optimization | Sustainable and fast | Medium |

---

## 9. Release and Launch Gates

| Gate | Criteria | Notes |
|------|----------|--------|
| **Staging release** | Build green; smoke tests pass; no P0 bugs | After any phase for internal/beta |
| **Beta release** | Phase B gate + optional Phase C; beta checklist | Optional closed beta |
| **Production launch** | Phase D gate; launch checklist; go/no-go | First real launch |
| **Post-launch release** | Phase E or hotfix; regression pass; rollback plan | Any release after launch |

---

## 10. Test Exit Criteria (Per Phase)

| Phase | Test exit criteria |
|-------|---------------------|
| A | Auth E2E or API tests pass; deploy smoke pass; no secrets in repo |
| B | Onboarding and lesson E2E pass; progress and gamification verified |
| C | Scenario and voice E2E (or manual) pass; moderation and fallback verified |
| D | Billing and entitlement E2E pass; GDPR export/delete tested; security and a11y pass |
| E | Regression and new-feature tests pass; performance baseline met |

---

## 11. Production Readiness Criteria (Phase D)

- [ ] Production environment provisioned and secured.
- [ ] All secrets in vault or managed secret store; no secrets in code.
- [ ] HTTPS only; rate limiting on API.
- [ ] Monitoring and alerting configured; runbook for top 3 failure modes.
- [ ] Rollback and hotfix process documented and tested once.
- [ ] GDPR export and delete flows tested.
- [ ] Stripe webhook and entitlement flow tested in production-like env.
- [ ] Launch checklist completed (see launch-checklist.md).
