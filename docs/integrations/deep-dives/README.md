# Integration Deep-Dives — AI Dutch Coach

## Purpose

This folder contains **implementation-grade integration specifications** for every major external integration and integration strategy used by the product. Each deep-dive treats the integration as a first-class capability and covers purpose, data flows, auth, failure handling, local/staging/production behavior, observability, security, and implementation guidance.

## Source of Truth

- **Product/features**: docs/features/deep-dives/, docs/implementation/
- **Backend**: docs/final/backend-architecture.md
- **Existing integration docs**: docs/final/integrations/, docs/implementation/integrations.md
- **Inventory**: docs/final/integrations/integration-inventory.md

## Structure

| Path | Contents |
|------|----------|
| **integration-index.md** | Master list of all integrations: name, category, concrete vs strategy, criticality, dependency order, file name |
| ***.md** (root) | One deep-dive file per integration (payment-provider, llm-orchestration, speech-voice, etc.) |
| **sub-features/{integration-name}/** | Sub-feature specs for complex integrations (e.g. checkout-flow, webhook-handling) |
| **per-feature/** | Feature-centric integration specs: which integrations each product feature uses and how (see per-feature/README.md) |
| **reviews/** | Per-integration review (coverage, gaps, scorecard, recommendation) |
| **versions/** | Versioned artifacts if iterations are kept |
| **audits/** | Audit verdict (Pass / Pass with improvements / Needs revision) |
| **final/** | Finalized copies and integration-deep-dive-summary.md |

## Required Sections (Per Deep-Dive)

Each integration file includes: Purpose; Core Concept; Why This Integration Exists; Business Capabilities Enabled; Scope (In/Out); Triggering Flows; Inputs; Outputs; Data Domains; Source of Truth Rules; Authentication Model; Authorization/Consent; Configuration; Environment Strategy (local/dev/staging/prod); Data Flow Design; Sync/Polling/Webhook Design; Failure Handling; Retry Strategy; Rate Limiting/Quota; Security/Compliance; Auditability/Logging; Observability; UI/UX Implications; Admin/Operations; API/Adapter Design; Event/Async Flow; Data Persistence; Local Development Setup; Testing Requirements; Rollout/Feature Flag; Example Scenarios; Edge Cases; Recommended Technical Design; Implementation Phasing; Summary.

## Local Development

Every integration spec **must** document: whether it can run fully locally; whether cloud credentials are required in local dev; whether an emulator exists; whether a mock adapter should exist; developer setup steps; required env vars; local fallback when the provider is unavailable.

## Usage

- **Implementers**: Use the deep-dive as the single spec for building the adapter, handling failures, and operating the integration.
- **QA**: Use Triggering Flows, Example Scenarios, and Edge Cases for test design.
- **Ops**: Use Observability, Failure Handling, and Admin/Operations for runbooks and monitoring.
