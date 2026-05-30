# Content Operations Model — Roles, Process, Tooling

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

This document defines the **content operations model**: who does what (roles), how content moves from creation to publish (process), and what tooling is needed (CMS, scripts, pipelines) to operate at scale (thousands of lessons and scenarios).

---

## 2. Scope

- **In scope**: Operational roles; end-to-end process (create → review → publish → maintain); tooling options; metrics and SLAs.
- **Out of scope**: HR; specific CMS product choice (recommendations only).

---

## 3. Operational Roles

| Role | Responsibility |
|------|----------------|
| **Content author** | Creates and edits draft content (lessons, scenarios, vocabulary, etc.); submits for review. |
| **Curriculum lead** | Defines scope and sequence; approves pedagogy; prioritizes backlog. |
| **Reviewer** | Reviews for quality, safety, pedagogy; approves or requests changes. |
| **Approver / Content lead** | Publishes; archives; owns release. |
| **Localization** | Translates or adapts content for new locale (future). |
| **Operations** | Runs pipelines (import, validation, release); monitors quality metrics. |

---

## 4. End-to-End Process

1. **Create**: Author or system (AI) creates draft in DB or via CMS; validation pipeline runs.
2. **Submit**: Author submits for review; state → in_review.
3. **Review**: Reviewer checks; either approve (→ approved) or request changes (→ draft).
4. **Publish**: Approver publishes; state → published; optional release pipeline (invalidate cache, notify).
5. **Maintain**: Edits create new version; same review flow; optional deprecate/archive.
6. **Expand**: Telemetry and backlog drive new content; same create→publish flow.

---

## 5. Tooling

| Need | Option | Notes |
|------|--------|-------|
| **Authoring** | DB + admin UI, or headless CMS (Sanity, Contentful) | Phase 1: DB + scripts or simple admin. Scale: CMS for non-technical authors. |
| **Import** | Scripts (CSV/JSON → DB); migration or ETL | For CEFR lists, reference imports. |
| **Validation** | Content-validation-pipeline (automated); checklist for reviewers | Automated in CI or on save; manual checklist in doc or tool. |
| **Versioning** | content_versions table; optional diff UI | Per content-versioning.md. |
| **Release** | content-release-process (deploy, feature flag, rollout) | See pipelines. |
| **Telemetry** | Analytics (completion, difficulty, usage) → backlog | Drives expansion; not tooling for authoring. |

---

## 6. Metrics and SLAs

| Metric | Target (example) |
|--------|-------------------|
| **Time to review** | < 3 business days for standard content |
| **Validation pass rate** | > 95% after author fix (for AI-generated sampling) |
| **Publish throughput** | N lessons/month (product-defined) |
| **Content coverage** | X vocabulary terms, Y scenarios, Z lessons per level (product-defined) |
| **Error rate** | Zero PII or harmful content in published; alert on validation failure spike |

---

## 7. When This Becomes Relevant

- **Phase 1**: Minimal ops (author + approver; DB + scripts). Process still follows create → review → publish.
- **Scale**: Add reviewers; add CMS; add localization role; formalize SLAs and metrics.
- **Multi-language**: Localization workflow for new locale; same governance.

---

## 8. Dependencies

- **content-governance.md**: Roles and approval.
- **content-review-process.md**: Review steps.
- **content-release-process.md**: Publish and rollout.
- **content-ingestion-pipeline.md**: Import and create.
