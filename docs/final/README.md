# AI Dutch Coach — Product Specification System (Final)

## Overview

This folder contains the **finalized** product specification documents for **AI Dutch Coach** (AI Language Coach — context-aware language learning for expats). The product is designed **mobile-web-first** with **React + Vite + TypeScript**, with architecture that allows future expansion to native apps and other languages (Dutch first).

All documents have passed the review and audit process defined in `docs/meta/SPEC_GUIDELINES.md` and are suitable for engineering implementation.

---

## Final Documents Index

| Phase | Document | Description |
|-------|----------|-------------|
| 1 | [business-requirements.md](business-requirements.md) | Business problem, vision, objectives, BFRs/BNFRs, capability map, workflows, compliance, risks |
| 2 | [industry-standards-best-practices.md](industry-standards-best-practices.md) | CEFR, Dutch exams (A2, B1, KNM, ONA), pedagogy, WCAG, safety, i18n, IS-* requirements |
| 3 | [product-architecture-overview.md](product-architecture-overview.md) | System context, logical architecture, capability-to-component map, mobile-web-first, ARCH-* |
| 4 | [feature-domain-breakdown.md](feature-domain-breakdown.md) | 12 feature domains (FD-01–FD-12): onboarding, lessons, scenarios, voice, listening, pronunciation, reflection, location, exam, gamification, feedback, entitlements |
| 5 | [user-workflows-journeys.md](user-workflows-journeys.md) | Sign-up, onboarding, first lesson, daily loop, scenario, voice, exam, conversion, settings |
| 6 | [ui-ux-architecture.md](ui-ux-architecture.md) | Mobile-web-first React+Vite UI: routes, screens, components, state, permissions, patterns, accessibility, i18n |
| 7 | [backend-architecture.md](backend-architecture.md) | API layer, auth, services, endpoints (conceptual), error handling, rate limiting |
| 8 | [data-model-pipelines.md](data-model-pipelines.md) | Logical data model, PostgreSQL/Redis, retention, export/deletion, pipelines |
| 9 | [external-integrations.md](external-integrations.md) | LLM, STT/TTS, pronunciation, payment, CDN, push; failure and compliance |
| 10 | [operational-architecture.md](operational-architecture.md) | Deployment, logging, metrics, alerting, incident, backup, cost controls, export/deletion jobs |

---

## Phase Summaries

- [phase-1-summary.md](phase-1-summary.md) — Business: capability map, BFRs, workflows, EU residency, conversion analytics
- [phase-2-summary.md](phase-2-summary.md) — Industry: CEFR, exams, ONA, BCP 47, pronunciation standard, application of standards
- [phase-3-summary.md](phase-3-summary.md) — Architecture: ARCH-001–004, deployment view, content sourcing
- [phase-4-summary.md](phase-4-summary.md) — Features: 12 domains, free caps, premium-only, traceability
- [phase-5-summary.md](phase-5-summary.md) — Workflows: journeys, listening/reflection in daily loop
- [phase-6-summary.md](phase-6-summary.md) — UI: stack, routes, state, permissions, accessibility, i18n

---

## Repository Structure (Reference)

```
docs/
├── meta/                 # SPEC_GUIDELINES.md, ITERATION_LOG.md
├── business/             # (phase 1 source)
├── industry/             # (phase 2 source)
├── product/              # (phase 5 source)
├── architecture/         # (phase 3 source)
├── features/             # (phase 4 source)
├── ui/                   # (phase 6 source)
├── backend/              # (phase 7 source)
├── data/                 # (phase 8 source)
├── integrations/         # (phase 9 source)
├── operations/           # (phase 10 source)
├── reviews/              # Review documents per phase
├── versions/             # Versioned iterations (v1, v2, ...)
├── audits/               # Independent audit verdicts
└── final/                # This folder — finalized specs and summaries
```

---

## Key Design Decisions (Cross-Document)

1. **Freemium with trial**: Free tier with caps (lessons/day, scenarios/week); premium and trial get full access; 7–14 day trial recommended (BFR-004).
2. **EU data residency**: All personal data and application in EU (BNFR-001, ARCH-001, ARCH-003).
3. **Single API**: Client (web or future native) talks to one API layer; all business logic and gating server-side (ARCH-002).
4. **Mobile-web-first**: React 18+, Vite, TypeScript, Tailwind; responsive, touch-first; PWA-capable; same API for future React Native.
5. **Consent and permissions**: Microphone, location, notifications, photo, AI context — each optional and withdrawable (BFR-009); permission requested in-context.
6. **CEFR and Dutch exams**: Content and user level CEFR-tagged; exam prep aligned to A2, B1, KNM (and ONA if in scope); IS-004–IS-006.
7. **AI safety**: Transparency (IS-016); automated moderation with escalation (IS-017); user content moderation (IS-018).
8. **Conversion analytics**: Funnel events (trial_started, trial_ended, payment_success, churn) required (BFR-013).

---

## Implementation Readiness

- **Frontend**: UI doc provides routes, screen inventory, component taxonomy, state and caching, permission flows, and patterns. Engineers can scaffold React + Vite and implement pages and components.
- **Backend**: Backend doc provides API responsibilities, auth, service boundaries, and conceptual endpoints. Data doc provides entities and retention. Integrations doc provides external contracts and failure behavior.
- **Operations**: Ops doc provides deployment, logging, metrics, alerting, cost controls, and data jobs (export, deletion, retention).

---

## Open Questions (Consolidated)

- **Business**: Exact pricing (€8–€15), trial length, annual subscription, minimum age, free-tier caps (OQ-1–OQ-5).
- **Industry**: Exam format fidelity (exact vs. inspired), KNM/ONA depth, listening transcript policy (OQ-1–OQ-3).
- **Architecture**: Monolith vs. services at launch, WebSocket vs. REST for voice, CMS vs. DB for content (OQ-1–OQ-3).
- **UI**: Bottom nav 4 vs. 5 items, PWA offline strategy, state library choice (OQ-1–OQ-3).

These can be resolved during implementation or in a later spec iteration.

---

## Next Steps

1. **Resolve open questions** where blocking (e.g. free caps, trial length).
2. **Implement frontend**: Scaffold React + Vite + TypeScript + Tailwind; implement routes and screens per UI doc; integrate with API once backend is available.
3. **Implement backend**: API layer, auth, Profile, Lesson Engine, AI Conversation, Speech, Gamification, Notifications, Entitlements; wire to PostgreSQL, Redis, and external integrations.
4. **Content and curriculum**: Populate lessons, scenarios, and exam content per Feature and Industry docs.
5. **Deploy and operate**: EU deployment; enable logging, metrics, alerting; run retention and export/deletion jobs per Data and Ops docs.

---

*This specification system was produced to a minimum 95% completeness and clarity threshold per SPEC_GUIDELINES. No implementation code was generated in this run; the repository is specification and documentation only.*
