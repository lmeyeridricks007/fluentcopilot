# Content Strategy — Sourcing, Scale, and Quality

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

This document defines the **content strategy** for the AI Language Coach: what content exists, where it comes from, how it scales to thousands of lessons and scenarios, how quality and safety are maintained, and how AI-assisted expansion fits in.

---

## 2. Scope

- **In scope**: Content domains (vocabulary, grammar, scenarios, lessons, exercises, exam, pronunciation, cultural); sourcing mix (authored, licensed, AI-generated); scale targets; quality and safety principles; localization and expansion.
- **Out of scope**: Day-to-day editorial process (see content-operations-model); pipeline implementation (see pipelines).

---

## 3. Content Domains (Summary)

| Domain | Description | Scale target (per teaching language) |
|--------|-------------|--------------------------------------|
| **Vocabulary** | Lemmas, translations, examples, CEFR, scenario tags | 10k–100k terms |
| **Grammar** | Rules, structures, examples, CEFR | 1k–10k rules |
| **Scenarios** | Real-life situations, goals, phrases, AI instructions | Thousands |
| **Lessons** | Guided lessons, flashcards, quizzes (template-based) | Thousands |
| **Exercises** | Multiple choice, fill-blank, listening, pronunciation, roleplay | 10k+ |
| **Listening** | Audio + questions; linked to exercises | Thousands of clips |
| **Pronunciation** | Targets, phonemes, feedback templates | 5k–20k targets |
| **Exam prep** | Tasks aligned to exam types and sections | Hundreds per exam type |
| **Cultural context** | Do's/don'ts, notes per scenario/topic | Hundreds |
| **Prompts** | AI prompt templates for generation and tutoring | Hundreds |

---

## 4. Sourcing Strategy

| Source | Use for | Validation |
|--------|---------|------------|
| **Authored curriculum** | Core lessons, core scenarios, seed vocabulary/grammar | Editorial review; pedagogy sign-off |
| **Authoritative references** | CEFR word lists, official exam specs, grammar references | Import with attribution; spot-check |
| **AI-assisted generation** | Expansion of vocabulary examples, quiz items, dialogue variations, reflection lessons | Automated validation + sampling review; never publish without validation |
| **Community feedback** | Corrections, suggestions (future) | Moderation; editorial decision |
| **Telemetry** | Which content is used, completion, difficulty signals | Drives expansion and tuning; not direct source of copy |

**Principle**: Human-authored or human-verified content is the source of truth for core pedagogy. AI expands within guardrails; all AI-generated content must pass validation and optional human review before publication.

---

## 5. Scale Assumptions

- **Year 1**: Hundreds of lessons, dozens of scenarios, thousands of vocabulary terms, full exam prep for 1–2 exam types.
- **Year 2+**: Thousands of lessons and scenarios; 10k+ vocabulary; multiple exam types; optional second teaching language.
- **Multi-language**: Same architecture; new locale = new content set (authored or generated with same pipelines and governance).

---

## 6. Quality Principles

- **Pedagogical coherence**: Content aligned to CEFR; difficulty progression; no contradictory grammar or definitions.
- **Accuracy**: Vocabulary and grammar verified against references or native review; exam content aligned to official specs.
- **Safety**: No harmful, biased, or PII in content; moderation on AI output.
- **Consistency**: Naming, tone, and structure follow content-taxonomy and template system.
- **Accessibility**: Text and structure support screen readers and clarity (see industry-standards).

---

## 7. AI-Assisted Expansion

- **Allowed**: Generate example sentences, quiz distractors, dialogue variations, reflection lessons, level-adapted prompts; expand vocabulary hints; suggest scenario phrases.
- **Required**: All such output must conform to prompt-output-schema and content-quality-rules; must pass automated validation; sampling must be reviewed by human until quality metrics are stable.
- **Not allowed**: Publish AI-generated content without validation; use AI to generate exam answers or official scoring; use learner PII in prompts.

---

## 8. Localization Strategy

- **Teaching language**: Primary nl (Dutch); future en or others. Each teaching language has its own content set (locale).
- **Learner UI**: Multiple locales (en-GB, nl-NL, ar, etc.) for interface; vocabulary translations and phrase translations support these for hints.
- **Culture**: NL vs BE (Dutch) variants via scenario tags or cultural_context; same for other markets when added.

---

## 9. Dependencies

- **content-sourcing-strategy.md**: Detailed sourcing and validation per source.
- **content-taxonomy.md**: Naming and structure.
- **content-governance.md**: Roles and approval.
- **content-quality-rules.md**: Validation rules.
- **ai-content-generation-policies.md**: AI guardrails.
