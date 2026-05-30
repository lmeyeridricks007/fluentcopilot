# Phase 2: Industry Standards & Best Practices (v1)

## Document Info

| Attribute | Value |
|-----------|--------|
| Phase | 2 – Industry Standards & Best Practices |
| Version | 1 |
| Status | Draft |

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
- Document Dutch integration exam structures (A2, B1, KNM) and how the product aligns.
- Establish pedagogical principles (micro-learning, spaced repetition, scenario-based learning).
- Set accessibility targets (WCAG, speech, motor).
- Define content and AI safety/moderation expectations.
- Support future multi-language expansion via standards (e.g. CEFR as common framework).

---

## 2. Scope

### 2.1 In Scope

- CEFR levels and descriptors; mapping to product levels (A0–C1).
- Dutch integration exams: A2, B1, KNM (Knowledge of Dutch Society); reading, listening, speaking, writing.
- Pedagogical standards: micro-learning, spaced repetition, scenario-based learning, comprehensible input.
- Accessibility: WCAG 2.1 (Level AA target), speech interfaces, keyboard/touch, reduced motion.
- Content and AI safety: moderation, appropriateness, transparency.
- Localization/internationalization: locale, RTL if ever needed, number/date formats.
- Reference to relevant EU/digital education or AI guidelines where applicable.

### 2.2 Out of Scope

- Detailed curriculum design (covered in Feature/Content specs).
- Specific API or implementation details (Backend/Integrations docs).
- Country-specific regulations beyond EU/GDPR and Netherlands (expansion handled in Architecture).

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
| **Inburgeringsexamen (integration exam)** | A2 | Mandatory for many immigrants; reading, listening, speaking, writing, KNM, ONA (labor market). |
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

### 4.3 Requirements

| ID | Requirement |
|----|-------------|
| IS-004 | Exam preparation content shall be explicitly mapped to exam components (reading, listening, speaking, writing, KNM) and level (A2, B1). |
| IS-005 | Practice formats (e.g. multiple choice, short answer, oral response) shall reflect official exam formats where publicly documented. |
| IS-006 | Updates to official exam structure shall be tracked; content roadmap shall allow adaptation when exam criteria change. |

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
| IS-014 | Audio content (lessons, TTS) shall have text alternatives or captions where the primary purpose is not listening practice. |
| IS-015 | Listening practice exercises may rely on audio as primary; accessibility alternatives (e.g. transcript option) shall be considered and documented. |

---

## 7. Content and AI Safety

### 7.1 Content Moderation

- User-generated content (e.g. reflection notes, uploads) and AI-generated content must be appropriate and safe.
- No harmful, offensive, or illegal content; no content that could endanger minors (if ever in scope).

### 7.2 AI Transparency and Safety

- Users shall be informed when they are interacting with AI (not a human).
- AI outputs (conversation, corrections, feedback) shall be moderated or filtered for appropriateness.
- No AI-generated content that encourages harmful behavior or violates platform guidelines.

### 7.3 Requirements

| ID | Requirement |
|----|-------------|
| IS-016 | The system shall indicate to the user when they are in an AI-driven conversation or receiving AI-generated feedback. |
| IS-017 | AI-generated text and corrections shall pass through safety/moderation checks (e.g. blocklist, policy filters) before display. |
| IS-018 | User-generated text and uploads (e.g. daily reflection) shall be subject to moderation and retention policies consistent with GDPR and safety. |
| IS-019 | Content and AI safety policies shall be documented and updated when regulations or platform policies change. |

---

## 8. Localization and Internationalization

### 8.1 Learner Locale

- UI and non-teaching content shall support multiple locales (learner's language or preference).
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

---

## 9. EU and Regulatory Context

### 9.1 GDPR

- Covered in Business Requirements (BFR-008, BFR-009, BNFR-001, BNFR-002).
- This document does not duplicate; industry note: language learning apps often process special categories indirectly (e.g. voice); consent and minimal data are critical.

### 9.2 AI and Digital Services

- EU AI Act and DSA may apply (e.g. AI systems that interact with users; content moderation).
- Product shall document AI use cases and ensure transparency, human oversight where appropriate, and compliance with applicable AI regulations.
- No specific product requirement ID here; compliance tracked in Legal/Operations; design supports transparency (IS-016) and safety (IS-017, IS-018).

### 9.3 Requirements

| ID | Requirement |
|----|-------------|
| IS-023 | The product shall maintain documentation of AI use cases (conversation, feedback, generation) for regulatory and transparency purposes. |

---

## 10. Assumptions and Dependencies

### 10.1 Assumptions

- CEFR and Dutch exam structures (A2, B1, KNM) remain stable in the near term; changes will be tracked (IS-006).
- WCAG 2.1 AA is achievable for the core web app; some third-party or media may have limitations.
- Moderation can be implemented via filters and policies; no assumption of real-time human review for all content.

### 10.2 Dependencies

- Content and curriculum specs for detailed exam alignment and KNM topics.
- UI/UX spec for accessibility implementation (touch targets, focus, reduced motion).
- Backend/Integrations for moderation APIs or services if used.

---

## 11. Risks

| ID | Risk | Mitigation |
|----|------|------------|
| RISK-1 | Dutch exam format changes | IS-006; roadmap and content process to adapt. |
| RISK-2 | WCAG compliance gaps in third-party or media | Document exceptions; prioritize core flows. |
| RISK-3 | AI safety bypass (jailbreaks, edge cases) | Layered moderation; monitoring; policy updates. |

---

## 12. Open Questions

| ID | Question | Owner |
|----|----------|--------|
| OQ-1 | Official exam sample formats: use exact question types or “inspired by”? | Content / Product |
| OQ-2 | KNM content depth: full curriculum or high-level topics? | Content |
| OQ-3 | Captions for listening exercises: always optional transcript vs. never (to preserve listening focus)? | Product / Accessibility |

---

## 13. Summary Table: Requirement IDs

| ID range | Domain |
|----------|--------|
| IS-001 – IS-003 | CEFR |
| IS-004 – IS-006 | Dutch exams |
| IS-007 – IS-010 | Pedagogy |
| IS-011 – IS-015 | Accessibility |
| IS-016 – IS-019 | Content & AI safety |
| IS-020 – IS-022 | i18n / Localization |
| IS-023 | EU / AI documentation |
