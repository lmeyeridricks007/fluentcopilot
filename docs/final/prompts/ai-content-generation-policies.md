# AI Content Generation Policies — Safety and Quality

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

This document defines **policies for AI-generated content**: what is allowed, what is forbidden, validation requirements, human review rules, and misuse prevention so that AI expansion is safe and pedagogically sound.

---

## 2. Scope

- **In scope**: Allowed/disallowed use cases; input/output constraints; moderation; human review; audit; escalation.
- **Out of scope**: LLM provider terms (legal); model choice (integrations).

---

## 3. Allowed Uses

| Use | Condition |
|-----|-----------|
| **Example sentences** for vocabulary | Output validated (schema, length); no PII; sampling review until stable. |
| **Quiz items** (questions, distractors) | From approved vocabulary/grammar; output validated; sampling review. |
| **Dialogue variations** | Within scenario and level; output validated; Dutch only. |
| **Reflection lessons** | Input (reflection) moderated; output validated to lesson schema; no PII in output. |
| **Level adaptation** | Input from our content only or sanitized; output validated. |
| **Tutor correction text** | From template; learner sentence in input sanitized (no store of PII in log). |
| **Pronunciation feedback text** | From template + API score; no free-form generation of medical advice. |
| **Scenario debrief** | Generic; no learner PII. |

---

## 4. Disallowed Uses

| Use | Reason |
|-----|--------|
| **Exam answers or scoring keys** | Integrity of exam; no AI-generated official answers. |
| **Publishing without validation** | All AI output must pass content-validation-pipeline. |
| **Learner PII in prompt** | Privacy; do not send name, email, or identifiable text to LLM except when strictly necessary and anonymized. |
| **Unconstrained free-form** | All generation must use a template with output_schema and constraints. |
| **Harmful or biased content** | Moderation required; block list. |
| **Medical/legal advice** | Pronunciation and language only; no medical or legal content. |

---

## 5. Validation Requirements

- **Schema**: Every AI output must conform to the prompt's output_schema (parse and validate before use).
- **Length**: Within bounds per content type (see content-quality-rules).
- **Moderation**: All text output run through moderation API (or block list) before save or display.
- **Pedagogy**: Level and CEFR consistency; no contradiction with existing vocabulary/grammar (heuristic or sampling).
- **No PII**: Automated check that output contains no email, phone, name pattern.

---

## 6. Human Review

| Scenario | Rule |
|----------|------|
| **First use of new template** | Human review of N samples before enabling auto-approve. |
| **Sampling** | Ongoing sample of AI-generated content (e.g. 5–10%) reviewed until quality metrics stable. |
| **High-stakes** | Exam-related, first-of-kind, or user-facing correction: mandatory review before publish. |
| **Failure** | If validation or moderation fails repeatedly, alert and require human review for that template. |
| **User report** | If user reports inappropriate AI output, review and escalate; consider disabling template. |

---

## 7. Misuse Prevention

- **Rate limits**: Per-user and per-template rate limits on generation calls to prevent abuse and cost overrun.
- **Input validation**: Reject inputs that exceed length or contain block-listed patterns.
- **Audit**: Log template code, version, input hash (no PII), output hash, validation result; retain for investigation.
- **Kill switch**: Ability to disable a template or all AI generation via feature flag or config.

---

## 8. Escalation

- **Moderation flag**: Content flagged by moderation → do not publish; log; optional alert to content lead.
- **Repeated failure**: Validation failure rate above threshold → alert; consider pausing template.
- **User complaint**: Triage to content/support; review prompt and output; update template or block if needed.

---

## 9. Dependencies

- **content-validation-pipeline.md**: Runs validation.
- **content-governance.md**: Review and approval.
- **content-quality-rules.md**: Validation rules.
- **prompt-output-schema.md**: Output shape enforcement.
