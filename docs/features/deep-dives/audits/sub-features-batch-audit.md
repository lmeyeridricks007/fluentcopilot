# Batch Audit: Sub-Feature Specifications

**Scope**: Sub-feature specs in docs/features/deep-dives/sub-features/  
**Criteria**: Internal consistency; missing workflows; missing integrations; missing technical detail; scalability risks.

---

## 1. Internal Consistency

**Finding**: Sub-features under Core Lessons and Entitlements use consistent naming (lesson_id, user_id, period_key, usage_counts, lesson_progress), align with parent deep-dives (core-lessons.md, entitlements-and-subscription.md), and reference each other correctly (e.g. lesson-completion calls usage-tracking increment; lesson-run calls lesson-cap-enforcement check). No conflicting rules or data shapes.

**Verdict**: **Pass** — Internal consistency maintained.

---

## 2. Missing Workflows

**Finding**: Each spec includes Trigger Conditions, Inputs, Outputs, and Workflow/Lifecycle. Cross-flow (catalog → run → progress → completion → cap) is traceable across sub-features. No critical workflow gap.

**Verdict**: **Pass** — Workflows covered.

---

## 3. Missing Integrations

**Finding**: Events produced/consumed and Integrations sections are present. Lesson-completion integrates with Entitlements (usage), Gamification, Personalization, Spaced Repetition. Entitlement-check integrates with payment webhooks, cache, usage. Cap-enforcement integrates with lesson-run and lesson-completion. No missing integration.

**Verdict**: **Pass** — Integrations covered.

---

## 4. Missing Technical Detail

**Finding**: Data model (tables, columns, example records), API endpoints (with example request/response), implementation notes (backend service, DB, cache, frontend components), and testing requirements are present. lesson-run and lesson-progress have abbreviated §12–24 but still list events, integrations, UI, errors, edge cases, performance, observability, implementation, testing. Sufficient for implementation.

**Verdict**: **Pass** — Technical detail sufficient.

---

## 5. Scalability Risks

**Finding**: Pagination and indexes specified for catalog; single-row upsert for progress and usage; cache for entitlement with TTL and invalidation. No obvious scalability risks; high completion volume handled by DB and optional async downstream (Gamification, Personalization). Rate limit optional on POST progress.

**Verdict**: **Pass** — No blocking scalability risks.

---

## Audit Verdict

**Pass** — The sub-feature specification set for Core Lessons and Entitlements meets the audit criteria. Recommendation: finalize completed specs to final/ and publish coverage-report.md. Remaining sub-features (other features) to be audited when their specs are completed.
