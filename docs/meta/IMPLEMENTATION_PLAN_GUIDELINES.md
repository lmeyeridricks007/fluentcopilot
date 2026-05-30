# Implementation Plan Guidelines

## Purpose

This document defines the quality standard for **implementation planning** documents in the AI Language Coach product. All implementation plan docs are evaluated against this scorecard before finalization. It supplements SPEC_GUIDELINES.md for the implementation planning run.

---

## 1. Required Content (Per Implementation Document)

Where relevant, every implementation plan doc must include:

| Element | Description |
|--------|-------------|
| **Purpose** | Why this plan exists; who uses it |
| **Scope / Out of scope** | What is in and out of scope |
| **Assumptions** | Documented explicitly |
| **Dependencies** | On other plans, phases, or streams |
| **Delivery approach** | How work is sequenced and owned |
| **Work breakdown** | Concrete work items, not vague tasks |
| **Milestones** | Checkpoints with exit/done criteria |
| **Risks** | Implementation and delivery risks |
| **Open questions** | Unresolved items with owners |
| **Readiness criteria** | When work can start or phase can exit |
| **Done criteria** | When a deliverable is complete |

---

## 2. Implementation Plan Scorecard

Each document is scored on the following. **Each category ≥ 9/10**. **Overall confidence ≥ 95%**.

| Category | Weight | Criteria (1–10) |
|----------|--------|------------------|
| **Clarity** | 15% | Unambiguous; structure logical; tables and diagrams accurate |
| **Completeness** | 25% | All required elements; no critical gaps; work breakdown sufficient |
| **Feasibility** | 20% | Plan is realistic for assumed team and constraints |
| **Sequencing quality** | 20% | Dependencies and order are correct; critical path identified |
| **Implementation readiness** | 10% | Engineers/QA/DevOps can execute from the plan |
| **Operational readiness** | 10% | Launch, monitoring, support, and post-launch are addressed |

**Overall confidence** = weighted score as percentage. Minimum **95%**.

---

## 3. Quality Threshold

- Per-category score ≥ 9/10.
- Overall confidence ≥ 95%.
- Audit verdict: **Pass** or **Pass with minor improvements** (no "Needs revision" for finalization).

---

## 4. Versioning and Finalization

- **Versions**: `docs/versions/` (e.g. implementation-roadmap-overview-v1.md).
- **Reviews**: `docs/reviews/` (e.g. review-implementation-roadmap-overview-v1.md).
- **Audits**: `docs/audits/` (e.g. audit-implementation-roadmap-overview.md).
- **Final**: `docs/final/implementation/` (e.g. implementation-roadmap-overview.md).

---

## 5. Special Requirements

- **No superficial timelines**: Use phases, gates, dependency order, and relative complexity (L/M/H), not fake calendar dates unless required.
- **Concrete work items**: Break down to level where owner can pick up a task; avoid single-line "Implement X" without sub-items or acceptance criteria.
- **Critical path**: Identify what blocks what; what can be parallelized; what is foundation vs core vs hardening.
- **Lean team**: Plan must work for minimum viable team shape; document ideal vs minimum and what to postpone safely.
