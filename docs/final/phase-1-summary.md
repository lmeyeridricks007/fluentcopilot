# Phase 1 Summary: Business Requirements

## What Changed Across Versions

### v1 → v2

- **Capability map added**: Objectives (OBJ-1–5) mapped to product capabilities (personalization, scenarios, voice, exam prep, conversion analytics, etc.) for traceability.
- **Business-level functional requirements (BFRs)**: BFR-001–BFR-012 added for subscription, entitlements, trial, personalization, multi-language, GDPR, consent, EU residency, free-tier limits, exam prep.
- **Business-level NFRs**: BNFR-001 (EU data residency), BNFR-002 (GDPR compliance) added.
- **High-level business workflows**: Onboarding → first lesson; Free → trial → premium; User lifecycle (New → Active → Lapsed → Churned) with Mermaid diagrams.
- **Internal stakeholders**: Product, Engineering, Support, Content, Legal, Marketing/GTM referenced.
- **Free-tier and premium clarification**: Free-tier caps deferred to Feature spec with example (e.g. 3–5 lessons/day); "unlimited" premium clarified as subject to fair-use policy.
- **Location-aware**: Explicitly "user can enable/disable," "optional feature," consent required.
- **Competitive assumption**: Differentiation (expat focus, context-aware, speech/AI) documented.
- **GTM**: Stated that GTM strategy is documented separately; conversion funnel in scope.
- **Risks**: R-7 added (mobile web vs. native app expectation).
- **Assumptions**: A-8 added (fair-use limits accepted for premium).
- **BR-8**: Free-tier limits enforced per user per period.

### Final (post-audit)

- **BFR-013** added: conversion funnel analytics (trial start/end, payment success, churn).
- Document info set to Final; source and audit noted.

---

## Major Design Decisions

1. **Freemium with trial**: Premium conversion via time-limited trial (7 or 14 days TBD); free-tier caps and premium fair-use to be defined in Feature/Operations specs.
2. **EU data residency**: Personal data stored and processed in EU (BNFR-001) for GDPR and latency.
3. **Location and audio opt-in**: Explicit consent; user can disable; location-aware is optional.
4. **Multi-language from day one in design**: Dutch first, but BFR-006/BFR-007 and OBJ-5 require architecture and content model to support additional teaching languages and learner locales.
5. **Conversion analytics in scope**: BFR-013 ensures funnel events (trial, payment, churn) are supported for optimization.

---

## Remaining Open Questions

- OQ-1: Exact pricing and trial length.
- OQ-2: Annual subscription and discount.
- OQ-3: Partnerships (language schools, relocation agencies) at launch.
- OQ-4: Minimum age (e.g. 16+) for initial release.
- OQ-5: Exact free-tier caps (to be resolved in Feature Domain spec).
