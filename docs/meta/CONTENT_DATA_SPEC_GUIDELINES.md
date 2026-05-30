# Content & Data Architecture Specification Guidelines

## Purpose

This document defines the quality standard for **content and data architecture** documents in the AI Language Coach product. All content/data docs are evaluated against this scorecard before finalization. It supplements SPEC_GUIDELINES.md for the content & data architecture run.

---

## 1. Required Content (Per Document)

Where relevant, every content/data doc must include:

| Element | Description |
|--------|-------------|
| **Purpose & scope** | Why the doc exists; what is in and out of scope |
| **Schemas / data structures** | Concrete fields, types, relationships where applicable |
| **Taxonomy or classification** | Hierarchies, tags, levels (CEFR, scenario type, etc.) |
| **Sourcing & validation** | Where content comes from; how it is validated |
| **Scalability** | How the design supports thousands of lessons/scenarios and multi-language |
| **Governance & safety** | Roles, review, AI generation controls, quality rules |
| **Dependencies** | Links to other content/data/prompt/pipeline docs |
| **Risks and assumptions** | Documented explicitly |

---

## 2. Content & Data Scorecard

Each document is scored on the following. **Each category ≥ 9/10**. **Overall confidence ≥ 95%**.

| Category | Weight | Criteria (1–10) |
|----------|--------|------------------|
| **Clarity** | 15% | Unambiguous; structure logical; schemas and terms defined |
| **Completeness** | 25% | All required elements; no critical gaps; schemas sufficient for implementation |
| **Scalability** | 20% | Design supports thousands of lessons/scenarios; multi-language; extensible |
| **Pedagogical coherence** | 15% | Aligns with CEFR, exam prep, and learning science where applicable |
| **Implementation readiness** | 15% | Engineer can implement schemas and pipelines without guessing |
| **AI safety and quality** | 10% | AI generation controlled; validation and review; no misuse or quality risk |

**Overall confidence** = weighted score as percentage. Minimum **95%**.

---

## 3. Quality Threshold

- Per-category score ≥ 9/10.
- Overall confidence ≥ 95%.
- Audit verdict: **Pass** or **Pass with minor improvements** (no "Needs revision" for finalization).

---

## 4. Versioning and Finalization

- **Versions**: `docs/versions/` (e.g. content-taxonomy-v1.md).
- **Reviews**: `docs/reviews/` (e.g. review-content-taxonomy-v1.md).
- **Audits**: `docs/audits/` (e.g. audit-content-taxonomy.md).
- **Final**: `docs/final/data/`, `docs/final/content/`, `docs/final/prompts/`, `docs/final/pipelines/`.

---

## 5. Special Requirements

- **Structured schemas**: Use tables or explicit field lists; avoid vague "metadata" without structure.
- **Pipeline thinking**: Inputs, outputs, checkpoints, failure modes for each pipeline.
- **AI safety**: Every AI-generation doc must address validation, review, and misuse prevention.
- **Scale**: Assume tens of thousands of lessons and scenarios; design for partitioning, versioning, and localization.
