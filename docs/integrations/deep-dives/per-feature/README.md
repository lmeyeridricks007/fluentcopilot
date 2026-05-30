# Per-Feature Integration Specifications

## Purpose

This folder contains **feature-centric integration specs**: for each major product feature (FD-01–FD-12, Authentication, Notifications), a single document that specifies **which integrations that feature uses** and **how** — data flows, triggering, auth, failure handling, local dev, and implementation implications. These complement the integration-centric deep-dives in the parent folder.

## Source of Truth

- **Feature scope**: docs/final/feature-domain-breakdown.md (Integration Dependencies per FD)
- **Integration details**: docs/integrations/deep-dives/*.md (payment-provider, llm-orchestration, etc.)
- **Feature deep-dives**: docs/features/deep-dives/

## How to Use

- **Implementing a feature**: Read the per-feature file (e.g. scenario-simulations.md) to see which integrations the feature needs and how they are used; then refer to the main integration deep-dive for full adapter/auth/failure detail.
- **Integrating a new provider**: Update the main integration deep-dive; then update each per-feature file that uses that integration with any feature-specific behavior.
- **Testing**: Per-feature docs call out testing implications for that feature’s use of integrations (mocks, env, E2E).

## Structure

| Artifact | Description |
|----------|-------------|
| **feature-integration-index.md** | Feature → integrations map; file name per feature |
| **{feature-name}.md** | One spec per feature: integrations used, per-integration usage, implementation implications |
| **reviews/** | Review of per-feature set (scorecard, recommendation) |
| **audits/** | Audit verdict (Pass / Pass with improvements / Needs revision) |
| **final/** | Final summary and artifact index |

## Required Content (Per-Feature Doc)

Each per-feature spec includes:

1. Purpose (feature + integration view)
2. Feature reference (FD-XX, link to feature-domain-breakdown / feature deep-dive)
3. Integrations used (table with role per integration)
4. Per-integration: why this feature needs it; data flow; triggering; auth; failure; local; observability; reference to main deep-dive
5. Implementation implications: backend services, jobs, DB, UI, admin, monitoring, seed/demo data, testing
6. Summary
