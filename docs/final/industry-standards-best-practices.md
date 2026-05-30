# Industry Standards & Best Practices

## Document Info

| Attribute | Value |
|-----------|--------|
| Phase | 2 – Industry Standards & Best Practices |
| Status | **Final** |
| Source | industry-standards-best-practices-v2.md; audit passed |

---

## 1. Problem Statement and Objectives

### 1.1 Problem

The product must align with established language-learning standards, Dutch integration requirements, pedagogical best practices, and regulatory/accessibility expectations so that:

- Content and assessments are level-appropriate and recognized (e.g. CEFR).
- Exam preparation is accurate and useful for official Dutch exams.
- Learning design follows evidence-based practices.
- The product meets accessibility and safety standards expected in the EU market.

### 1.2 Objectives

- Define CEFR usage and level mapping for the platform.
- Document Dutch integration exam structures (A2, B1, KNM, ONA) and how the product aligns.
- Establish pedagogical principles (micro-learning, spaced repetition, scenario-based learning).
- Set accessibility targets (WCAG, speech, motor).
- Define content and AI safety/moderation expectations.
- Support future multi-language expansion via standards (e.g. CEFR as common framework).

---

## 2. Scope

### 2.1 In Scope

- CEFR levels and descriptors; mapping to product levels (A0–C1).
- Dutch integration exams: A2, B1, KNM, ONA; reading, listening, speaking, writing.
- Pedagogical standards: micro-learning, spaced repetition, scenario-based learning, comprehensible input.
- Accessibility: WCAG 2.1 (Level AA target), speech interfaces, keyboard/touch, reduced motion.
- Content and AI safety: moderation, appropriateness, transparency.
- Localization/internationalization: locale (BCP 47), RTL if ever needed, number/date formats.
- Application of standards in content pipeline and UI.
- Reference to relevant EU/digital education or AI guidelines where applicable.

### 2.2 Out of Scope

- Detailed curriculum design (covered in Feature/Content specs).
- Specific API or implementation details (Backend/Integrations docs).
- Country-specific regulations beyond EU/GDPR and Netherlands (expansion handled in Architecture).

---

## 2.3 Application of Standards in the Product

How these standards flow into design and implementation:

- **Content pipeline**: All lesson and scenario content is tagged with CEFR level (IS-001); content is authored or generated within level constraints (IS-003, IS-010). Spaced repetition and scenario selection use level and profile (IS-008, IS-009).
- **Exam preparation**: Exam modules are explicitly mapped to exam components (reading, listening, speaking, writing, KNM; ONA if in scope) and levels A2/B1 (IS-004, IS-005). Official exam structure changes are monitored via public sources (e.g. government/DUO) and content roadmap adapts (IS-006).
- **Moderation and safety**: AI-generated text and corrections pass through automated moderation before display (IS-017); user-generated content is subject to moderation and retention (IS-018). Escalation path for edge cases is defined in Operations/Content policy.
- **Accessibility**: UI is built to WCAG 2.1 AA; touch targets and reduced motion are applied in component and layout specs (IS-011–IS-013). Audio alternatives follow IS-014/IS-015 (see §6.3).
- **i18n**: Locale and language use BCP 47; UI strings and content versioning use consistent codes (IS-020, IS-024).

---

## 3. CEFR (Common European Framework of Reference)

### 3.1 Overview

CEFR provides a common basis for describing language proficiency across six levels: A1, A2, B1, B2, C1, C2. The product uses CEFR for placement, content tagging, and exam alignment.

### 3.2 Level Descriptors (Summary)

| Level | Listening/Speaking (summary) | Product relevance |
|-------|------------------------------|-------------------|
| A1 | Basic phrases, very familiar topics | Beginner; survival phrases |
| A2 | Simple routine tasks; familiar topics | Pre-integration; daily situations |
| B1 | Main points on familiar matters; simple connected text | Integration exam target; work/social |
| B2 | Main ideas of complex text; interact with fluency | Post-integration; professional |
| C1 | Complex text; express fluently | Advanced; near-native |
| C2 | Near-native comprehension and expression | Mastery |

### 3.3 Product Level Mapping

- **A0**: True beginner (no Dutch); pre-A1.
- **A1–C1**: Align with CEFR; content and scenarios tagged by level.
- **Target levels**: A2 (integration), B1 (integration), B2 (work/social) as per user goals (BFR-005, BFR-012).

### 3.4 Requirements

| ID | Requirement |
|----|-------------|
| IS-001 | Content and exercises shall be tagged with CEFR level (A0, A1, A2, B1, B2, C1) where applicable. |
| IS-002 | User profile shall store current and target CEFR level for personalization and exam prep. |
| IS-003 | AI-generated content and scenario difficulty shall be constrained by user level and CEFR descriptors. |

---

## 4. Dutch Integration Exams

### 4.1 Exam Types (Netherlands)

| Exam | Level | Purpose |
|------|--------|---------|
| **Inburgeringsexamen (integration exam)** | A2 | Mandatory for many immigrants; reading, listening, speaking, writing, KNM, ONA. |
| **Staatsexamen NT2** | B1/B2 | Program I (B1) and Program II (B2) for study/work. |
| **KNM (Kennis van de Nederlandse Maatschappij)** | — | Knowledge of Dutch society; part of integration. |
| **ONA (Oriëntatie op de Nederlandse Arbeidsmarkt)** | — | Labor market orientation; part of integration; portfolio/work-focused. |

### 4.2 Alignment with Product

- **Exam preparation modules** (BFR-012) shall align with:
  - Reading: comprehension tasks, question types similar to exam.
  - Listening: audio passages and questions.
  - Speaking: prompts and response formats compatible with exam practice.
  - Writing: structured tasks at A2/B1.
  - KNM: civic and society topics (content scope in Feature/Content specs).
  - **ONA**: Labor market orientation; product may support ONA-related scenarios (e.g. job search, CV, interviews) as part of expat-focused content; full ONA portfolio support is roadmap-dependent (see OQ-2).
- **Monitoring**: Official exam structure and format updates shall be tracked via public sources (e.g. Dutch government/DUO); content roadmap shall allow adaptation when exam criteria change (IS-006).

### 4.3 Requirements

| ID | Requirement |
|----|-------------|
| IS-004 | Exam preparation content shall be explicitly mapped to exam components (reading, listening, speaking, writing, KNM; ONA if in scope) and level (A2, B1). |
| IS-005 | Practice formats (e.g. multiple choice, short answer, oral response) shall reflect official exam formats where publicly documented. |
| IS-006 | Updates to official exam structure shall be tracked via public sources (e.g. government/DUO); content roadmap shall allow adaptation when exam criteria change. |

---

## 5. Pedagogical Best Practices

### 5.1 Principles

| Principle | Application in product |
|-----------|-------------------------|
| **Micro-learning** | Short lessons (e.g. 5–15 min); digestible chunks; clear single objective per lesson. |
| **Spaced repetition** | Vocabulary and grammar review at intervals (e.g. flashcards, review queues) to improve retention. |
| **Scenario-based learning** | Real-life situations (restaurant, doctor, work) as primary context; language in use, not only in isolation. |
| **Comprehensible input** | Content slightly above current level (i+1); scaffolding and support (translations, hints) where appropriate. |
| **Output practice** | Speaking and writing practice with feedback; AI conversation and pronunciation as core features. |
| **Personalization** | Content and difficulty adapted to profile (level, goals, occupation, family) per BFR-005. |

### 5.2 Requirements

| ID | Requirement |
|----|-------------|
| IS-007 | Lesson design shall follow micro-learning format (short sessions, single learning objective per unit). |
| IS-008 | The system shall support spaced repetition for vocabulary and key structures (e.g. review scheduling). |
| IS-009 | Scenarios shall be based on real-life situations relevant to expats in the Netherlands. |
| IS-010 | AI and human-authored content shall be level-appropriate (CEFR-aligned) and avoid over-complexity for the user's level. |

---

## 6. Accessibility

### 6.1 WCAG 2.1

- **Target**: Level AA for web (mobile and desktop).
- **Areas**: Perceivable (text alternatives, captions, contrast), Operable (keyboard, touch, no traps), Understandable (language, labels, errors), Robust (markup, compatibility).

### 6.2 Speech and Motor

- **Speech**: Voice input (STT) and output (TTS) support users who prefer or require speech; ensure controls are reachable and labels clear.
- **Motor**: Touch targets ≥ 44×44 CSS px; sufficient spacing; avoid time-limited actions where possible or allow extension.
- **Reduced motion**: Respect `prefers-reduced-motion` for animations and transitions.

### 6.3 Requirements

| ID | Requirement |
|----|-------------|
| IS-011 | The web application shall conform to WCAG 2.1 Level AA where applicable (excluding third-party or legacy content). |
| IS-012 | Interactive elements shall have minimum touch target size 44×44 px (or equivalent) on mobile. |
| IS-013 | The application shall support or respect system preferences for reduced motion. |
| IS-014 | For audio whose primary purpose is **not** listening practice (e.g. instructions, TTS prompts), text alternatives or captions shall be provided. |
| IS-015 | For **listening practice exercises**, audio is the primary modality; transcript or caption may be offered **after** the attempt or as an optional aid to avoid undermining the listening goal. The choice (post-exercise transcript vs. no transcript) shall be documented in product/accessibility spec. |

---

## 7. Content and AI Safety

### 7.1 Content Moderation

- User-generated content (e.g. reflection notes, uploads) and AI-generated content must be appropriate and safe.
- No harmful, offensive, or illegal content; no content that could endanger minors (if ever in scope).

### 7.2 AI Transparency and Safety

- Users shall be informed when they are interacting with AI (not a human).
- AI outputs (conversation, corrections, feedback) shall be moderated or filtered for appropriateness.
- Moderation is **automated** (e.g. blocklist, policy filters) with an **escalation path** for edge cases (e.g. flagging, human review) as defined in Operations/Content policy.

### 7.3 Requirements

| ID | Requirement |
|----|-------------|
| IS-016 | The system shall indicate to the user when they are in an AI-driven conversation or receiving AI-generated feedback. |
| IS-017 | AI-generated text and corrections shall pass through **automated** safety/moderation checks (e.g. blocklist, policy filters) before display; an escalation path (e.g. flagging, human review) for edge cases shall be defined in Operations/Content policy. |
| IS-018 | User-generated text and uploads (e.g. daily reflection) shall be subject to moderation and retention policies consistent with GDPR and safety. |
| IS-019 | Content and AI safety policies shall be documented and updated when regulations or platform policies change. |

---

## 8. Localization and Internationalization

### 8.1 Learner Locale

- UI and non-teaching content shall support multiple locales (learner's language or preference).
- **Locale and language identification** shall follow **BCP 47** (e.g. `en-GB`, `nl-NL`, `de-DE`) for UI locale, content versioning, and API contracts.
- Dates, numbers, and currency shall follow locale conventions.
- Dutch is the teaching language; UI language may be English (default for expats) or other languages.

### 8.2 Future Expansion

- Architecture shall support additional teaching languages and region-specific content (e.g. DE for Germany); CEFR remains the common level framework.
- RTL support not required for Dutch/German/English; document if needed for future markets.

### 8.3 Requirements

| ID | Requirement |
|----|-------------|
| IS-020 | The application shall be internationalized (i18n); UI strings and static content shall be localizable by locale. |
| IS-021 | Learner-facing UI shall support at least English and Dutch at launch; additional languages as roadmap. |
| IS-022 | Date, number, and currency formatting shall follow user or system locale. |
| IS-024 | Locale and language codes shall follow BCP 47 (e.g. IETF language tags) for UI locale, content versioning, and APIs. |

---

## 9. Pronunciation and Speech Assessment

### 9.1 Standardization

- Pronunciation feedback and scoring shall be **consistent and documentable** (e.g. phoneme set for Dutch, scoring scale, or rubric).
- Detailed implementation (phoneme set, API) is in Backend/Speech spec; this document requires that the product applies a defined standard so that feedback is interpretable and level-appropriate.

### 9.2 Requirements

| ID | Requirement |
|----|-------------|
| IS-025 | Pronunciation assessment and feedback shall use a defined, documentable standard (e.g. phoneme set, scoring scale, or rubric) consistent with the teaching language (Dutch); implementation details are in Backend/Speech spec. |

---

## 10. EU and Regulatory Context

### 10.1 GDPR

- Covered in Business Requirements (BFR-008, BFR-009, BNFR-001, BNFR-002).
- Industry note: language learning apps may process data that touches special categories (e.g. voice); consent and minimal data are critical.

### 10.2 AI and Digital Services

- EU AI Act and DSA may apply. Product shall document AI use cases and ensure transparency and compliance with applicable AI regulations.
- Design supports transparency (IS-016) and safety (IS-017, IS-018).

### 10.3 Requirements

| ID | Requirement |
|----|-------------|
| IS-023 | The product shall maintain documentation of AI use cases (conversation, feedback, generation) for regulatory and transparency purposes. |

---

## 11. References (Informative)

Implementers should use these as authoritative or informative sources where applicable:

| Topic | Reference |
|-------|-----------|
| CEFR | Common European Framework of Reference for Languages (Council of Europe). [coe.int/lang-cefr](https://www.coe.int/en/web/common-european-framework-reference-languages) |
| WCAG 2.1 | Web Content Accessibility Guidelines 2.1, W3C. [w3.org/WAI/WCAG21](https://www.w3.org/WAI/WCAG21/quickref/) |
| Dutch integration exams | Dutch government / DUO: Inburgering, Staatsexamen NT2, KNM, ONA. [government.nl](https://www.government.nl) / [duo.nl](https://duo.nl) (official exam information). |
| BCP 47 | BCP 47 (IETF) language tags. [rfc-editor.org/info/bcp47](https://www.rfc-editor.org/info/bcp47) |

---

## 12. Assumptions and Dependencies

### 12.1 Assumptions

- CEFR and Dutch exam structures (A2, B1, KNM, ONA) remain stable in the near term; changes will be tracked (IS-006).
- Official exam formats are publicly documented sufficiently to align practice tasks (IS-005).
- WCAG 2.1 AA is achievable for the core web app; some third-party or media may have limitations.
- Moderation is implemented via automated filters with escalation path; real-time human review is not required for all content.

### 12.2 Dependencies

- Content and curriculum specs for detailed exam alignment, KNM and ONA scope.
- UI/UX spec for accessibility implementation (touch targets, focus, reduced motion).
- Backend/Speech spec for pronunciation standard (phoneme set, scoring).
- Backend/Integrations for moderation APIs or services if used.

---

## 13. Risks

| ID | Risk | Mitigation |
|----|------|------------|
| RISK-1 | Dutch exam format changes | IS-006; monitor public sources; content roadmap to adapt. |
| RISK-2 | WCAG compliance gaps in third-party or media | Document exceptions; prioritize core flows. |
| RISK-3 | AI safety bypass (jailbreaks, edge cases) | Layered moderation; escalation path; monitoring; policy updates. |

---

## 14. Open Questions

| ID | Question | Owner |
|----|----------|--------|
| OQ-1 | Official exam sample formats: use exact question types or “inspired by”? | Content / Product |
| OQ-2 | KNM and ONA content depth: full curriculum or high-level topics; full ONA portfolio support in scope? | Content |
| OQ-3 | Listening exercises: offer optional transcript after attempt, or never, to preserve listening focus? | Product / Accessibility |

---

## 15. Summary Table: Requirement IDs

| ID range | Domain |
|----------|--------|
| IS-001 – IS-003 | CEFR |
| IS-004 – IS-006 | Dutch exams |
| IS-007 – IS-010 | Pedagogy |
| IS-011 – IS-015 | Accessibility |
| IS-016 – IS-019 | Content & AI safety |
| IS-020 – IS-022, IS-024 | i18n / Localization |
| IS-023 | EU / AI documentation |
| IS-025 | Pronunciation / speech assessment |
