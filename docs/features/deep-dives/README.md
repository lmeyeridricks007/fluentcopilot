# Feature Deep-Dive Specifications

## Purpose

This folder contains **implementation-grade** feature and module specifications for the AI Dutch Coach (language tutor) product. Each document is a full deep-dive: what the feature is, why it exists, how it works, data it owns, APIs, UI, integrations, edge cases, and implementation guidance.

## Structure

| Folder | Purpose |
|--------|---------|
| **Root** | One markdown file per major feature (e.g. `onboarding-and-profile.md`, `core-lessons.md`, `cefr-curriculum-path.md`). |
| **reviews/** | Review notes for each feature (completeness, clarity, implementation readiness). |
| **versions/** | Optional versioned drafts if specs evolve. |
| **audits/** | Audit verdicts (Pass / Pass with minor improvements / Needs revision). |
| **final/** | Copy of approved specs and the deep-dive summary. |

## Source of Truth

Specs are derived from and must align with:

- `docs/final/feature-domain-breakdown.md`
- `docs/final/business-requirements.md`
- `docs/final/user-workflows-journeys.md`
- `docs/final/backend-architecture.md`
- `docs/final/product-architecture-overview.md`
- `docs/final/data/*` (data model, schema)
- `docs/final/personalization-engine.md`, `ai-conversation-engine.md`
- Other approved docs in `docs/final/`, `docs/business/`, `docs/product/`, etc.

## Index

See **[feature-spec-index.md](./feature-spec-index.md)** for the full list of features, priorities, dependencies, and file names.

## Usage

- **Product / PM**: Scope, user journeys, business rules, acceptance criteria.
- **Architects**: Data, APIs, events, service boundaries, integration points.
- **Backend / Frontend**: Implementation details, state machines, edge cases, testing.
- **QA**: Scenarios, permissions, failure cases, NFRs.

## Iteration Workflow

For each feature spec:

1. Create first version (root `.md`).
2. Review (document in `reviews/`).
3. Improve based on review.
4. Review again.
5. Audit (document in `audits/`).
6. Finalize (copy to `final/` when approved).

## Naming

- Feature files: `kebab-case.md` (e.g. `entitlements-and-subscription.md`).
- Review files: `reviews/<feature-name>-review.md` or `-review-2.md` for iterations.
- Audit files: `audits/<feature-name>-audit.md`.
