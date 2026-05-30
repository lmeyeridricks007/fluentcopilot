# Integration Specification Guidelines

## Purpose

This document defines the quality standard for **integration** documentation in the AI Language Coach product. All integration specs are evaluated against this scorecard before finalization. It supplements `SPEC_GUIDELINES.md` for the integrations documentation run.

---

## 1. Required Content (Per Integration Document)

Where relevant, every integration doc must include:

| Element | Description |
|--------|-------------|
| **Purpose & rationale** | Why this integration exists; product capabilities it supports |
| **Decision status** | Required now / required later / optional / rejected |
| **Recommended provider(s)** | Chosen provider and rationale; alternatives |
| **Credentials / keys / secrets** | Exact keys needed; frontend vs backend; storage; rotation |
| **Environment variables** | Naming convention; per-environment; example registry |
| **Frontend responsibilities** | What the client does; what it must never do (e.g. hold secrets) |
| **Backend responsibilities** | API calls; webhooks; persistence; entitlement linkage |
| **Setup checklist** | Step-by-step setup; sandbox/test account; local dev |
| **Request/response patterns** | Example payloads; error shapes; idempotency |
| **Security requirements** | Auth, TLS, scopes, least privilege |
| **Privacy / GDPR** | Data shared; retention; consent; lawful basis |
| **Failure modes** | Transient vs permanent; retry; fallback; user-visible behavior |
| **Rate limits / quotas / cost** | Provider limits; cost controls; budgeting |
| **Logging / tracing / metrics** | What to log (no PII); trace IDs; metrics |
| **Testing requirements** | Sandbox; mocks; contract tests; webhook replay |
| **Rollout guidance** | Phasing; feature flags; rollback |
| **Risks & open questions** | Documented explicitly |

---

## 2. Integration Scorecard

Each integration document is scored on the following. **Each category ≥ 9/10**. **Overall confidence ≥ 95%**.

| Category | Weight | Criteria (1–10) |
|----------|--------|------------------|
| **Clarity** | 15% | Unambiguous; structure logical; diagrams accurate |
| **Completeness** | 25% | All required elements present; no critical gaps |
| **Technical depth** | 20% | Credentials, env vars, payloads, flows specified; implementable |
| **Security/compliance coverage** | 15% | Secrets, auth, GDPR, retention, least privilege |
| **Implementation readiness** | 15% | Engineer can implement without guessing; patterns clear |
| **Operational readiness** | 10% | Setup, testing, rollout, failure handling, observability |

**Overall confidence** = weighted score as percentage. Minimum **95%**.

---

## 3. Quality Threshold

- Per-category score ≥ 9/10.
- Overall confidence ≥ 95%.
- Audit verdict: **Pass** or **Pass with minor improvements** (no "Needs revision" for finalization).

---

## 4. Versioning and Finalization

- **Versions**: Stored in `docs/versions/` (e.g. `ai-llm-v1.md`, `ai-llm-v2.md`).
- **Reviews**: Stored in `docs/reviews/` (e.g. `review-ai-llm-v1.md`).
- **Audits**: Stored in `docs/audits/` (e.g. `audit-ai-llm.md`).
- **Final**: Approved docs in `docs/final/integrations/` (e.g. `ai-llm.md`).

---

## 5. Special Requirements

- **No placeholders**: Every credential type, env var, and key must be named and scoped (e.g. "OpenAI API key, backend-only, stored in `INTEGRATION_OPENAI_API_KEY`").
- **No vague statements**: Avoid "Set up API key"; specify where it comes from, where it is stored, who uses it, and how to test it.
- **Examples**: Include example payloads (JSON), example webhook bodies, and example flows (sequence diagrams) where they aid implementation.
