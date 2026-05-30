# Content Governance — Roles, Controls, Audit

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

This document defines **content governance**: author roles, AI generation controls, content review rules, approval workflows, and audit trails so content is created, reviewed, and published safely and at scale.

---

## 2. Scope

- **In scope**: Roles (author, reviewer, approver, admin); who can create/edit/publish; AI generation controls; review and approval rules; audit logging.
- **Out of scope**: HR (hiring); tooling (CMS); detailed pipeline steps (see pipelines).

---

## 3. Author Roles

| Role | Create | Edit (draft) | Submit for review | Publish | Archive / rollback |
|------|--------|--------------|-------------------|---------|---------------------|
| **Content author** | Yes | Own content | Yes | No | No |
| **Reviewer** | Yes | Own | Yes | No | No |
| **Approver** | Yes | Yes | Yes | Yes | No |
| **Content lead** | Yes | Yes | Yes | Yes | Yes (own scope) |
| **Admin** | Yes | Yes | Yes | Yes | Yes (all) |

- **Scope**: Optional scope by locale, content type, or taxonomy (e.g. reviewer for vocabulary only). Default: all content types.
- **AI-generated content**: Treated as "created" by system; first human touch is reviewer or approver (no author ownership unless human edits and resubmits).

---

## 4. AI Generation Controls

| Control | Implementation |
|---------|----------------|
| **Allowed uses** | Example sentences, quiz items, dialogue variations, reflection lessons, level adaptation; within prompt and output schema. |
| **Disallowed** | Exam answers; official scoring keys; unvalidated publish; use of learner PII in prompts. |
| **Validation required** | All AI output must pass content-validation-pipeline (schema, quality, moderation) before save. |
| **Human review** | Sampling review until quality metrics stable; mandatory review for high-stakes (exam, first-of-type). |
| **Audit** | Log prompt_template_id, input_hash, output_hash, validator result, reviewer_id if reviewed. |
| **Kill switch** | Feature flag or config to disable AI generation for specific template or globally. |

---

## 5. Content Review Rules

- **Draft → in_review**: Author (or system for AI-generated) submits; triggers review assignment.
- **In_review**: Reviewer checks against content-quality-rules and pedagogy; can request changes (back to draft) or approve.
- **Approved → published**: Approver or content lead publishes; optional scheduled publish.
- **Published → archived**: Content lead or admin; reason required; audit log.
- **Rollback**: Content lead or admin; restore previous version from content_versions; audit log.

---

## 6. Approval Workflows

| Content type | Workflow |
|--------------|----------|
| **Vocabulary / grammar** | Author → submit → Reviewer → Approver → publish. Optional: bulk approve for imported lists. |
| **Scenario / lesson** | Author → submit → Reviewer (pedagogy + safety) → Approver → publish. |
| **AI-generated (batch)** | System creates draft → Validation pipeline → if pass, optional auto-approve or Reviewer sampling → Approver → publish. |
| **Exam task** | Author → Reviewer (alignment + accuracy) → Approver; no auto-approve for exam. |
| **Prompt template** | Author → Reviewer (safety + pedagogy) → Approver; immutable after active. |

---

## 7. Audit Trails

- **Log**: entity_type, entity_id, action (create, update, submit, approve, publish, archive, rollback), actor (user_id or system), timestamp, optional reason/changelog.
- **Storage**: content_versions for snapshot; audit_log table or append-only store for actions.
- **Retention**: Per data retention policy; minimum 90 days for audit; longer for compliance if required.
- **Access**: Admin and content lead; read-only for auditors.

---

## 8. Safety Policies

- **No PII in content**: Author and validation must ensure no learner or person data in published content.
- **Moderation**: All AI-generated text and user-suggested text must pass moderation (block list or API) before publish.
- **Pedagogy**: Reviewer must confirm CEFR alignment and correctness for pedagogy-sensitive content (grammar, exam).
- **Attribution**: AI-generated content marked source=ai_generated; reference and license for imported content.

---

## 9. Dependencies

- **content-entities.md**: States and lifecycle.
- **content-review-process.md**: Detailed review steps.
- **content-release-process.md**: Publish and rollout.
- **ai-content-generation-policies.md**: AI-specific policies.
- **database-schema.md**: content_versions, audit_log (if separate).
