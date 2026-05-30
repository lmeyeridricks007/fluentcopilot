# Review: Industry Standards & Best Practices (Phase 2)

## Document Under Review

- **Source**: `docs/versions/industry-standards-best-practices-v1.md`
- **Phase**: 2 – Industry Standards & Best Practices

---

## 1. Overall Assessment

The document covers CEFR, Dutch exams, pedagogy, accessibility, safety, i18n, and regulatory context with clear requirement IDs (IS-001–IS-023). To reach ≥9/10 and 95% confidence, it needs: explicit mention of ONA (labor market) in exam context, language/locale code standard (e.g. BCP 47), a brief “application workflow” showing how standards flow into product, and clarity on scope of “content” (authored vs. AI-generated) for IS-017/IS-018.

---

## 2. Strengths

- CEFR level mapping and product levels (A0–C1) clear.
- Dutch exam types (integration, NT2, KNM) and alignment requirements (IS-004–IS-006).
- Pedagogical principles with product application.
- WCAG 2.1 AA, touch targets, reduced motion, captions.
- AI transparency and content safety (IS-016–IS-019).
- i18n and locale; EU/AI documentation (IS-023).
- Assumptions, risks, open questions included.

---

## 3. Missing or Weak Requirements

| Gap | Detail |
|-----|--------|
| **ONA (labor market)** | Dutch integration includes ONA (Oriëntatie op de Nederlandse Arbeidsmarkt); should be mentioned in §4 and in exam alignment. |
| **Locale/language codes** | No standard for locale/language (e.g. BCP 47 / IETF); needed for i18n and content versioning. |
| **Application of standards** | No short description of how standards are applied in product (e.g. content pipeline, lesson tagging, exam module design). |
| **Pronunciation/speech standards** | No reference to pronunciation assessment (e.g. phoneme sets, scoring scale) for consistency with Backend/Speech spec. |
| **References** | No normative or informative references (e.g. CEFR official URL, WCAG 2.1, exam body links) for implementers. |

---

## 4. Ambiguous Requirements

- IS-014 vs IS-015: “Listening practice exercises” may rely on audio; “text alternatives” could undermine listening goal. Clarify: for non-listening content, captions/alternatives required; for listening exercises, transcript optional or post-exercise.
- IS-017: “Safety/moderation checks” — clarify whether automated only or human-in-loop for certain categories.

---

## 5. Missing Workflows

- Not a workflow-heavy doc; add one short subsection: “How standards apply in the product” (e.g. content authored → tagged with CEFR → served by level; exam module → aligned to exam components; AI output → moderation before display).

---

## 6. Missing Personas

- Not primary for this doc; target users (expats) already in Business doc. Optional: “content author” or “curriculum designer” as consumer of these standards.

---

## 7. Missing Integrations

- Exam bodies (e.g. DUO, government sites) for official format updates — IS-006 references “tracked”; could add “monitor official sources” explicitly.
- No integration requirement for third-party accessibility testing tools (optional).

---

## 8. Risks and Assumptions

- Adequate. Consider assumption: “Official exam formats are publicly documented enough to align practice tasks.”

---

## 9. Scope Problems

- None significant. Out of scope (curriculum design, API details) is clear.

---

## 10. Suggested Improvements

1. **§4 Dutch exams**: Add ONA (Oriëntatie op de Nederlandse Arbeidsmarkt) and note whether product will support ONA prep or only language + KNM.
2. **§8 i18n**: Add requirement for locale/language codes (e.g. BCP 47) for UI and content versioning (IS-024).
3. **New subsection**: “Application of standards in the product” — 1 paragraph + bullet list (content tagging, exam alignment, moderation flow, accessibility in UI).
4. **Pronunciation**: Add one requirement or note: pronunciation feedback and scoring shall be consistent and documentable (e.g. phoneme set or rubric); cross-ref Backend/Speech spec.
5. **References**: Add “References” section with links (CEFR, WCAG 2.1, Dutch government exam pages).
6. **Clarify IS-014/IS-015**: For listening-as-goal exercises, transcript/caption is optional or after attempt; for other audio, alternatives required.
7. **IS-017**: Clarify “automated moderation with escalation path” or “automated only” per product decision.

---

## 11. Scorecard (v1)

| Category | Score (1–10) | Notes |
|----------|--------------|--------|
| Clarity | 8 | Some ambiguity in IS-014/15, IS-017. |
| Completeness | 8 | ONA, locale codes, application workflow, pronunciation note, references missing. |
| Scope definition | 9 | In/out of scope clear. |
| Product viability | 9 | Aligns with exam and pedagogy. |
| System coherence | 8 | Will improve with application workflow and cross-refs. |
| Implementation readiness | 8 | Refs and locale standard would help implementers. |

**Weighted**: ~8.35/10 → **Confidence ~83.5%**. Below threshold. **Iteration required.**
