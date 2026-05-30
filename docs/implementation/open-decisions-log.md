# Open Decisions Log

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

This document tracks **unresolved decisions** that affect implementation: decision description, options, owner, deadline, and impact. It prevents blocking work and clarifies who decides.

---

## 2. Scope

- **In scope**: Technical, product, and operational decisions that are not yet final and could change scope, sequence, or design.
- **Out of scope**: Decisions already made (document in respective specs or ADRs).

---

## 3. Open Decisions Table

| ID | Decision | Options | Owner | Deadline | Impact if delayed |
|----|----------|---------|--------|----------|-------------------|
| D1 | Backend language and framework | Node.js (Express/Fastify) vs Python (FastAPI/Django) | Tech lead | Before Phase A start | Affects repo setup, hiring, and all backend work |
| D2 | Trial length for Stripe | 7 days vs 14 days | Product | Before Phase D (Stripe config) | Affects checkout session and marketing copy |
| D3 | Phase B closed beta before Phase C | Yes: ship B to limited users first vs No: go straight to C | Product | Before Phase B gate | Affects timeline and feedback loop |
| D4 | Content authoring for Phase B | DB + seed only vs lightweight CMS | Product/Tech | Before Phase B content work | DB+seed is simpler; CMS adds tooling |
| D5 | Streaming for LLM and TTS | Yes: streaming responses vs No: sync only | Tech lead | Phase C | Streaming improves perceived latency; adds complexity |
| D6 | Push notifications in Phase D | Yes: Web Push or provider vs No: email only for launch | Product | Before Phase D | Affects notification service and consent |
| D7 | E2E test runner | Playwright vs Cypress | Tech/QA | Phase A or B | Affects test implementation only |
| D8 | Storybook for design system | Yes vs No | Frontend/UX | Phase A | Yes improves component reuse and QA |
| D9 | Stripe checkout: redirect vs embedded | Redirect (current assumption) vs embedded Elements | Product/Frontend | Phase D | Redirect is simpler; embedded better UX |
| D10 | Search and CMS trigger for Phase 2 | N lessons or content team size | Product | Phase E | No impact until Phase E or later |
| D11 | Pronunciation: streaming STT in Phase 2 | Yes vs No | Tech | Phase E | Lower latency for pronunciation feedback |
| D12 | OAuth (Google/Apple) in Phase A or B | Phase A vs Phase B vs later | Product | Phase A gate | Phase B is acceptable; reduces Phase A scope |

---

## 4. Recommended Defaults (If No Decision by Deadline)

| ID | Recommended default | Rationale |
|----|---------------------|-----------|
| D1 | Node.js (Express or Fastify) | Aligns with React ecosystem; single language for full-stack if needed |
| D2 | 14 days trial | Common for learning apps; more time to convert |
| D3 | No closed beta (go B → C) | Simpler; beta can be optional later |
| D4 | DB + seed only | No CMS dependency for Phase B; add CMS in E if needed |
| D5 | Sync first; add streaming in Phase E if needed | Reduces Phase C scope; streaming is enhancement |
| D6 | Email only for launch; push in Phase E | Reduces Phase D scope; push is optional |
| D7 | Playwright | Good for cross-browser; modern API |
| D8 | Yes (Storybook) | Improves design system and regression |
| D9 | Redirect | Simpler; fewer Stripe integration edge cases |
| D10 | Document only; decide when N lessons or team size triggers | No code impact until Phase 2 |
| D11 | Phase 2 | No impact on Phase C scope |
| D12 | Phase B | Reduces Phase A to email/password only |

---

## 5. Decision Record

When a decision is made, record here (or in ADR):

| ID | Decision made | Date | Notes |
|----|---------------|------|--------|
| (example) D1 | Node.js with Fastify | YYYY-MM-DD | Chosen for speed and TypeScript alignment |

---

## 6. Dependencies

- **Implementation plans**: Several open decisions block or influence frontend, backend, integrations (e.g. D1, D2, D5, D6, D9).
- **Backlog**: Stories that depend on a decision should link to this log (e.g. "Blocked on D2").
- **Phase gates**: Resolve decisions that block the phase before gate (e.g. D1 before Phase A; D2 before Phase D).

---

## 7. Review

- **Weekly or at refinement**: Review open decisions; nudge owner if deadline approaching.
- **Phase kick-off**: Confirm decisions needed for that phase are resolved or have default.
- **Launch**: No P0 decisions left open that affect launch (billing, legal, security).
