# Grammar Dataset — Rules, Structures, Examples

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

This document defines the **grammar rule database** structure: rule schema, sourcing, validation, and how it supports lessons, scenarios, and CEFR-aligned pedagogy at scale.

---

## 2. Scope

- **In scope**: Grammar rule schema (name, description, type, CEFR, examples, common mistakes, related rules, vocabulary links); sourcing; validation; use in lessons and generation.
- **Out of scope**: Pronunciation; vocabulary detail (see vocabulary-dataset).

---

## 3. Grammar Rule Schema

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| id | bigint | PK | Yes |
| locale | varchar(10) | Teaching language | Yes |
| name | varchar(255) | Short name, e.g. "Present tense regular verbs" | Yes |
| description | text | Pedagogical explanation | Yes |
| rule_type | varchar(50) | tense, agreement, word_order, articles, pronouns, etc. | Yes |
| cefr_level_id | FK | A0–C2 | Yes |
| structure_example | text | Pattern or formula | Recommended |
| examples | JSONB | [{ "nl": "...", "en": "..." }] | Yes (≥1) |
| common_mistakes | JSONB | [{ "mistake": "...", "correction": "...", "explanation": "..." }] | Optional |
| related_rule_ids | bigint[] | Prerequisites or follow-ups | Optional |
| vocabulary_term_ids | bigint[] | Example terms | Optional |
| is_verified | boolean | | Yes |
| source | authored, ai_generated, imported | Yes |
| version | int | | Yes |

---

## 4. Rule Types (Controlled Vocabulary)

| Code | Description |
|------|-------------|
| tense | Present, past, perfect, etc. |
| agreement | Subject-verb, adjective-noun |
| word_order | V2, subordinate clause |
| articles | De/het, een |
| pronouns | Personal, possessive, reflexive |
| modal_verbs | Kunnen, moeten, mogen, etc. |
| negation | Niet, geen |
| questions | Inversion, question words |
| passive | Passive voice |
| other | Catch-all with name |

---

## 5. Sourcing and Validation

- **Source**: Authored curriculum; authoritative grammar references; AI-generated examples (with validation). Same principles as vocabulary: human-verified core; AI expansion within guardrails.
- **Validation**: name, description, rule_type, cefr_level_id, examples required; examples non-empty; common_mistakes structure; no PII; moderation on text. related_rule_ids and vocabulary_term_ids must exist if present. Content aligns to CEFR for progression and exam readiness (see industry-standards-best-practices).
- **Scale**: 1k–10k rules per language; index (locale, cefr_level_id), (locale, rule_type).

---

## 6. Dependencies

- **database-schema.md**: grammar_rules table.
- **content-entities.md**: Grammar rule lifecycle.
- **vocabulary-dataset.md**: vocabulary_term_ids link.
- **content-quality-rules.md**: Validation.
