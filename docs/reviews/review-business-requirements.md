# Review: Business Requirements (Phase 1)

## Document Under Review

- **Source**: `docs/versions/business-requirements-v1.md`
- **Phase**: 1 – Business Requirements

---

## 1. Overall Assessment

The document provides a solid foundation for business requirements with clear problem definition, vision, personas, value proposition, and scope. To meet the SPEC_GUIDELINES threshold (each category ≥9/10, confidence ≥95%), it needs strengthening in workflows, traceable requirement IDs, non-functional business requirements, and more explicit capability mapping.

---

## 2. Strengths

- Clear problem definition (business and user).
- Well-defined personas and user attributes.
- Explicit in-scope and out-of-scope.
- Business rules, assumptions, and risks documented.
- GDPR and consent called out.
- Success metrics and revenue model defined.
- Open questions and recommended decisions listed.

---

## 3. Missing or Weak Requirements

| Gap | Detail |
|-----|--------|
| **Workflows** | No high-level business or user workflows (e.g. onboarding → first lesson → conversion). |
| **Functional requirement IDs** | Business-level functional requirements (e.g. BR-FR-001) not enumerated for traceability. |
| **Capability map** | No capability map linking business objectives to product capabilities. |
| **Stakeholders** | Internal stakeholders (support, ops, content) not mentioned. |
| **Go-to-market** | GTM strategy referenced in product idea but not in scope of this doc; either add summary or reference. |
| **Competitive** | No explicit competitive assumptions or differentiator validation. |
| **Localization** | Multi-language expansion mentioned but not as a formal business requirement. |

---

## 4. Ambiguous Requirements

- “Limited exercises” in free tier: no numeric cap or definition.
- “Unlimited AI practice” in premium: no fair-use or abuse policy mentioned.
- “Optional” for location-aware: need clarity that it is user-optional, not product-optional.

---

## 5. Missing Workflows

- Onboarding → profile completion → first lesson (business flow).
- Free → trial → premium conversion flow (business).
- User lifecycle: new → active → lapsed → churned (for retention metrics).

---

## 6. Missing Personas

- Personas are present; consider adding “Content/Curriculum operator” or “Support” as secondary stakeholders for completeness (optional for Phase 1).

---

## 7. Missing Integrations

- Payment provider (Stripe, etc.) implied but not named; acceptable at business level if deferred to Integrations doc.
- No explicit “marketing/analytics” integration requirement for conversion tracking.

---

## 8. Risks and Assumptions

- Adequately covered; consider adding risk: “User adoption of mobile web vs. expectation of native app.”

---

## 9. Scope Problems

- Minor: “Offline-first full lesson delivery” out of scope is clear; “degraded mode” could reference UI/UX doc.
- GTM and “industry” (e.g. CEFR, exam bodies) could be referenced as out of scope for this doc, in scope for other phases.

---

## 10. Suggested Improvements

1. Add a **Capability Map** (table or diagram) linking objectives to capabilities (e.g. OBJ-1 → Personalized Learning, Scenario Simulations, etc.).
2. Add **Business-level functional requirements** with IDs (e.g. BFR-001: System shall support subscription-based premium tier).
3. Add **High-level business workflows** (onboarding, conversion, retention).
4. Define **Free-tier limits** (e.g. X lessons/day or X scenarios/week) as business rules or reference “to be defined in Feature doc.”
5. Clarify **location-aware** as “user can enable/disable” and “optional feature.”
6. Add **NFR at business level**: e.g. “System must support EU data residency for personal data.”
7. Add one sentence on **GTM** (e.g. “GTM strategy is documented in Product/GTM doc; conversion funnel is in scope.”).

---

## 11. Scorecard (v1)

| Category | Score (1–10) | Notes |
|----------|--------------|--------|
| Clarity | 8 | Clear but workflows and some terms need tightening. |
| Completeness | 8 | Missing capability map, BFRs, workflows, free-tier definition. |
| Scope definition | 9 | In/out of scope well defined. |
| Product viability | 9 | Strong; revenue and metrics defined. |
| System coherence | 8 | Will improve with BFRs and capability map. |
| Implementation readiness | 8 | Needs traceable BFRs for downstream phases. |

**Weighted score**: ~8.35/10 → **Confidence ~83.5%**. Below 95% threshold. **Iteration required.**
