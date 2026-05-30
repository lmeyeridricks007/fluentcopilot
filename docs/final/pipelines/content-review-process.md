# Content Review Process — Human Review and Approval

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

This document defines the **content review process**: how content moves from draft through human review to approval and readiness for publish, including roles, checkpoints, and escalation.

---

## 2. Scope

- **In scope**: Submit for review; reviewer checklist; approve or request changes; approval workflow; SLA; escalation.
- **Out of scope**: Publish and release (content-release-process); validation (content-validation-pipeline).

---

## 3. States and Transitions

- **draft** → Author (or system) submits → **in_review**.
- **in_review** → Reviewer approves → **approved** (or **published** if no separate approved state).
- **in_review** → Reviewer requests changes → **draft** (with comment).
- **approved** → Approver publishes → **published** (see content-release-process).
- Optional: **approved** state for "ready to publish" so approver can batch-publish.

---

## 4. Reviewer Checklist

| Check | Description |
|-------|-------------|
| **Pedagogy** | CEFR alignment; difficulty appropriate; no factual error in grammar/vocabulary. |
| **Accuracy** | Translations and examples correct; native check or expert. |
| **Safety** | No PII; no harmful or biased content; moderation passed. |
| **Style** | Matches content-taxonomy and style guide; consistent tone. |
| **Completeness** | All required fields; no placeholder text left. |
| **Scenario/roleplay** | AI instructions clear and safe; key phrases appropriate. |
| **Exam** | Task format and scoring aligned to exam spec. |

Reviewer can add comment per item; request changes with specific feedback.

---

## 5. Approval Workflow

| Content type | Reviewer | Approver | Notes |
|--------------|----------|----------|--------|
| Vocabulary / grammar | Any reviewer | Content lead or approver | Bulk approve possible for imports |
| Scenario / lesson | Reviewer (pedagogy) | Approver | |
| AI-generated (batch) | Sampling or full | Approver | Per ai-content-generation-policies |
| Exam task | Reviewer (exam alignment) | Approver | No auto-approve |
| Prompt template | Reviewer (safety) | Approver | Immutable after active |

---

## 6. SLA and Metrics

- **Time in review**: Target < 3 business days for standard content; document in content-operations-model.
- **Backlog**: Track count in_review; escalate if backlog grows.
- **Rejection rate**: Track % requested changes; improve authoring or checklist if high.

---

## 7. Escalation

- **Dispute**: Author disagrees with reviewer → content lead arbitrates.
- **Urgent**: Expedite review for launch-critical content; document reason.
- **Quality concern**: If reviewer finds systematic issue (e.g. template error), pause related content; fix template; re-review.

---

## 8. Dependencies

- **content-governance.md**: Roles and permissions.
- **content-entities.md**: States.
- **content-quality-rules.md**: What reviewer verifies.
- **content-operations-model.md**: SLAs.
