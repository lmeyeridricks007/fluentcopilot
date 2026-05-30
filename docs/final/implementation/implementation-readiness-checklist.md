# Implementation Readiness Checklist

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

This document defines **entry criteria** that must be satisfied **before building starts** (or before each phase starts). It ensures specs, environment, design direction, repo, and backlog are in place so that execution can proceed without blocking on missing decisions or assets.

---

## 2. Scope

- **In scope**: Pre-Phase A (project start) and optional per-phase entry criteria.
- **Out of scope**: Phase exit criteria (see delivery-phases.md and milestones-and-gates.md); launch criteria (see launch-checklist.md).

---

## 3. Before Any Development (Pre-Phase A)

| # | Criterion | How to verify | Owner |
|---|-----------|----------------|--------|
| 1 | **Product and feature specs baselined** | docs/final/ has business-requirements, feature-domain-breakdown, ui-ux-architecture, backend-architecture, data-model-pipelines, external-integrations (or equivalent); no open "TBD" that blocks scope | Product |
| 2 | **Integration specs available** | docs/final/integrations/ (or equivalent) has identity, ai-llm, speech-voice, payments-subscriptions, analytics, observability, security-secrets; implementation order known | Tech lead |
| 3 | **Environment and secret strategy agreed** | integration-security-secrets and integration-environments (or equivalent) document env vars and where secrets live; .env.example skeleton possible | Backend/DevOps |
| 4 | **Design direction set** | Design tokens (colors, typography, spacing) and base components list agreed; no full design system required, but direction for Phase A | UX/Product |
| 5 | **Repo and branch strategy** | Repo created; branch strategy (e.g. main + feature branches); .gitignore and README with setup steps | Tech lead |
| 6 | **Project board and backlog structure** | Epics and features for Phase A added (from backlog-structure-and-epic-map); at least first milestone stories created | Product/Tech lead |
| 7 | **Implementation plan reviewed** | implementation-roadmap-overview, delivery-phases, dependency-map, and stream-specific plans read and agreed by leads | Tech lead/Product |
| 8 | **Open decisions that block Phase A resolved** | Backend language (D1) and OAuth timing (D12) resolved or default accepted (see open-decisions-log) | Tech lead/Product |
| 9 | **Roles and ownership** | At least minimum team shape identified; ownership for Phase A (auth, env, design system) assigned | Product/Tech lead |
| 10 | **Access and tools** | Repo access; CI (e.g. GitHub Actions) available; staging host and DB/Redis planned or provisioned | DevOps/Tech lead |

**Sign-off**: Product and Tech lead (or equivalent) confirm all items above before Phase A development starts. Document sign-off date and any exceptions.

---

## 4. Optional: Per-Phase Entry Criteria

| Phase | Additional entry (beyond prior phase exit) |
|-------|---------------------------------------------|
| **B** | Phase A gate passed; lesson metadata schema and seed data approach agreed; API contract for profile and lessons drafted |
| **C** | Phase B gate passed; LLM and Speech provider accounts and sandbox keys ready; moderation approach agreed |
| **D** | Phase C gate passed; Stripe account and products/prices created (test mode); production env and secrets strategy ready |
| **E** | Phase D gate passed; launch complete or parallel; reflection and location scope agreed |

Use when phase start is separated in time from previous gate (e.g. to refresh readiness).

---

## 5. When This Becomes Relevant

- **Now**: Use before kicking off Phase A.
- **Later**: Use before starting each subsequent phase if there is a pause or new team members.
- **Audit**: External or stakeholder audit can use this checklist to verify "ready to build."

---

## 6. Recommended Decisions

- **Default**: If a criterion is not fully met, document the gap and either (a) resolve before starting, or (b) accept risk and add to open-decisions-log with owner and deadline.
- **Sign-off**: Require explicit sign-off (written or in meeting notes) so that there is no ambiguity that the team had agreed readiness.

---

## 7. Done Criteria

- All pre-Phase A items checked and signed off.
- Any exception documented with owner and follow-up.
- Phase A can start without blocking on missing spec, env, or decision.
