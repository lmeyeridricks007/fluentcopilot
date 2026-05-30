# Review: Onboarding & Profile Deep-Dive Spec

## 1. Overall Assessment

The Onboarding & Profile deep-dive is **implementation-ready**. It clearly defines purpose, scope, data model, APIs, consent model, and integration with Authentication and Personalization. All 30 required sections are present and substantive. The document is suitable for product, architecture, backend, frontend, and QA.

## 2. Strengths

- **Purpose and scope**: Clear in/out of scope; consent and profile separation from device permissions.
- **Data model**: profiles and consents tables with concrete fields; onboarding_step_index for resume.
- **APIs**: GET/PATCH /profile, POST /onboarding, GET/PATCH /consent with request/response described.
- **Business rules**: BR-2, BFR-005, BFR-009; minimum required fields (level, target, one goal) explicit.
- **Edge cases**: Partial save, validation, network error, consent withdrawn; resume and redirect when already completed.
- **Integration**: Auth, Personalization, Voice/Location/Reflection consent consumers called out.
- **Phasing**: Three phases from minimal onboarding to full profile, consent, and Settings edit.

## 3. Missing Business Detail

- **Minor**: Exact list of “one goal” options (exam/work/social) could be in Configuration Model as enum; currently implied.
- **Minor**: Consent type enum (microphone, location, notifications, photo, ai_context) is present; no gap.

## 4. Missing Workflow Detail

- **None significant**: Step-by-step journeys for first-time, resume, edit, withdraw are covered. Optional: explicit state diagram for onboarding_step_index transitions.

## 5. Missing Data / API Detail

- **Minor**: Example request/response JSON for POST /onboarding with step payload would help implementers; structure is described but not a full sample.
- **Minor**: Recommendation at completion: “returned by POST /onboarding or GET /home/recommendations” — clear; no schema for recommendation object in this doc (deferred to Personalization).

## 6. Missing UI Detail

- **Minor**: Progress indicator (e.g. 1/3 steps) mentioned; no wireframe or layout detail (correctly out of scope per README; UI doc covers that). Sufficient for backend and product.

## 7. Missing Integration Detail

- **None**: Auth redirect, Personalization for first recommendation, and consent consumers (Voice, Location, Daily Reflection, Notifications) are specified. No missing integration.

## 8. Missing Edge Cases

- **None**: Partial save, validation, network error, already completed, consent withdrawn are covered. Optional: duplicate submit (idempotency) mentioned in Technical Design; sufficient.

## 9. Missing Implementation Detail

- **Minor**: Validation library (e.g. Zod/Joi) is suggested; no schema snippet. Acceptable for spec level.
- **Phasing**: Clear; no gap.

## 10. Suggested Improvements

1. Add one example JSON body for POST /onboarding (e.g. step: "level_goals", payload: { current_level: "A1", target_level: "B1", goals: ["integration_exam"] }).
2. Add explicit enum for learning_goal in Configuration or Data Model (integration_exam, workplace, social or multi).
3. Optional: one-sentence reference to UI doc for screen layouts.

## 11. Scorecard

| Category | Score | Notes |
|----------|--------|--------|
| Clarity | 9/10 | Clear structure; minor example addition would help. |
| Completeness | 9/10 | All 30 sections filled; small enum/example gaps. |
| Functional depth | 9/10 | Workflows and rules detailed. |
| Technical usefulness | 9/10 | APIs and data model actionable. |
| Cross-module consistency | 10/10 | Dependencies and integrations explicit. |
| Implementation readiness | 9/10 | Teams can implement; examples would speed. |

**Overall scorecard**: 9/10 across categories.

## 12. Confidence Rating

**95%** — Confident the spec is sufficient for implementation. Remaining 5%: product may refine consent copy and optional steps; spec supports that via configuration.

## 13. Recommendation

**Approve for implementation.** Incorporate suggested improvements (example JSON, goal enum) in next revision if desired; not blocking. Proceed to audit and finalize.
