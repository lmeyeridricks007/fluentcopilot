# Per-Feature Integration Specifications — Audit

**Scope**: All per-feature integration specs and feature-integration-index in docs/integrations/deep-dives/per-feature/.  
**Audit criteria**: Features with integration deps are covered; each doc describes integrations used and how; references to main deep-dives are correct; implementation teams can act on the docs.

---

## 1. Features with integration dependencies covered

| Criterion | Result |
|-----------|--------|
| All FD and E-01, FD-15 from feature-domain-breakdown | **Pass** — Authentication, Onboarding, Core Lessons, Scenario Simulations, AI Voice Tutor, Listening, Pronunciation, Daily Reflection, Location-Aware, Exam Prep, Gamification, AI Tutor Feedback, Entitlements & Subscription, Notifications each have a per-feature doc. |
| Index lists every per-feature file and integrations | **Pass** — feature-integration-index.md lists 14 features, integrations used, and file names; reverse map (integration → features) is present. |

**Verdict**: All features that have external integration dependencies are covered.

---

## 2. Each doc describes integrations used and how

| Criterion | Result |
|-----------|--------|
| Integrations used (table) | **Pass** — Every per-feature doc has an “Integrations Used” table with role and criticality. |
| Per-integration: why, data flow, triggering, auth, failure, local, reference | **Pass** — Full-depth docs (Core Lessons, Scenario Simulations, AI Voice Tutor, Entitlements) have full per-integration detail; shorter docs (Authentication, Onboarding, etc.) have concise detail and reference main deep-dives. |
| Implementation implications | **Pass** — Backend, jobs, DB, UI, admin, monitoring, seed/demo, testing are stated per feature. |

**Verdict**: Each document describes which integrations the feature uses and how they are used; implementation implications are present.

---

## 3. References to main deep-dives correct

| Criterion | Result |
|-----------|--------|
| Links to parent integration deep-dives | **Pass** — References use relative paths (e.g. ../../payment-provider.md, ../../llm-orchestration.md) and are consistent with the folder structure (per-feature/ vs deep-dives/*.md). |
| Sub-features referenced where needed | **Pass** — Entitlements and Core Lessons reference payment sub-features (checkout-flow, webhook-handling, entitlement-enforcement) where relevant. |

**Verdict**: References to main integration deep-dives and sub-features are correct and consistent.

---

## 4. Implementation teams can act on the docs

| Criterion | Result |
|-----------|--------|
| Feature-first implementation | **Pass** — A team can read one per-feature doc (e.g. scenario-simulations.md) and see all integrations to wire, then consult main deep-dives for adapter/auth/failure detail. |
| Testing and local setup | **Pass** — Testing implications and local/mock strategy are stated per feature; mocks and seed data are called out. |
| Dependency order | **Pass** — feature-integration-index includes “Dependency order (feature implementation)” so teams know which integrations to have available first. |

**Verdict**: Implementation teams can use the per-feature docs to implement and test feature-by-feature with correct integration usage.

---

## Audit Verdict

**PASS** — Per-feature integration specifications meet the audit criteria: all relevant features are covered, each doc describes integrations used and how, references to main deep-dives are correct, and the set is actionable for implementation. No blocking gaps. Optional improvements (business goal one-liner, secrets per feature, test matrix, cross-links from main deep-dives) are noted in the review and can be added in the final summary or in a follow-up edit.

**Recommendation**: Finalize the set and publish the per-feature final summary (per-feature-integration-summary.md) in docs/integrations/deep-dives/per-feature/final/.
