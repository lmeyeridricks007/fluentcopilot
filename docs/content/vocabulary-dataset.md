# Vocabulary Dataset — Structure, Sourcing, Validation

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

This document defines the **Dutch vocabulary knowledge base** structure: fields per term, sourcing strategy, validation rules, and how it supports lessons, scenarios, and runtime generation at scale (10k–100k+ terms).

---

## 2. Scope

- **In scope**: Vocabulary term schema (lemma, base form, CEFR, POS, translations, examples, pronunciation, scenario tags, grammar links, synonyms, frequency, difficulty); sourcing; validation; scale.
- **Out of scope**: Pronunciation API (integrations); UI display (frontend).

---

## 3. Vocabulary Term Schema (Full)

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| id | bigint | PK | Yes |
| locale | varchar(10) | Teaching language (nl) | Yes |
| lemma | varchar(255) | Canonical form, e.g. "lopen" | Yes |
| base_form | varchar(255) | Normalized (lowercase, trimmed) for matching | Yes |
| cefr_level_id | FK | A0–C2 | Yes |
| part_of_speech | varchar(50) | noun, verb, adjective, adverb, preposition, etc. | Yes |
| translations | JSONB | [{ "locale": "en", "text": "to walk" }] | Yes (≥1) |
| example_sentences | JSONB | [{ "nl": "...", "translation": "..." }] | Recommended (1–3) |
| pronunciation_hints | text | Text hint for learner | Optional |
| phoneme_guidance | JSONB | IPA or phoneme sequence for TTS/assessment | Optional |
| scenario_tags | text[] or JSONB | Scenario category codes | Optional |
| grammar_rule_ids | bigint[] | Rules that use this term | Optional |
| synonyms | text[] or term_ids | | Optional |
| related_term_ids | bigint[] | | Optional |
| frequency_score | decimal(5,4) | 0–1 (corpus or curated) | Optional |
| difficulty_score | decimal(5,4) | 0–1 for ordering | Optional |
| is_verified | boolean | Passed validation | Yes |
| source | authored, ai_generated, imported | Yes |
| version | int | | Yes |

---

## 4. Sourcing Strategy

| Source | Use | Validation |
|--------|-----|------------|
| **CEFR word lists** | Authoritative base (e.g. A1–B2 lists for Dutch) | Import; map to cefr_level; spot-check translations |
| **Authored curriculum** | Core vocabulary for lessons; scenario-specific terms | Editorial review; native check |
| **AI-generated examples** | Example sentences, additional translations | Automated: length, no PII; sampling human review |
| **Import from references** | Dictionaries, exam vocab lists | Attribution; license check; normalize to schema |
| **Telemetry** | Frequency from usage (optional) | Update frequency_score; do not add new terms from telemetry alone |

**Rule**: New terms (lemma) must have at least one translation and CEFR level; must pass validation (see §6). AI-generated terms or examples require is_verified after review or automated checks. Content aligns to CEFR level for progression and exam readiness (see industry-standards-best-practices).

---

## 5. Validation Rules

| Rule | Check |
|------|--------|
| **Lemma required** | lemma and base_form non-empty |
| **CEFR and POS** | cefr_level_id and part_of_speech in allowed sets |
| **Translations** | At least one translation; locale in allowed list; text non-empty |
| **Example sentences** | If present: nl and translation within length limit; no PII |
| **Scenario tags** | If present: codes in scenario_categories |
| **Grammar refs** | If present: ids exist in grammar_rules |
| **Frequency/difficulty** | 0–1 if present |
| **No harmful content** | Moderation or block list on lemma, translations, examples |
| **Uniqueness** | (locale, base_form) or (locale, lemma) unique per term (id) |

---

## 6. Scale and Indexing

- **Indexes**: (locale, cefr_level_id), (locale, part_of_speech), (locale), GIN(scenario_tags), full-text on lemma if search needed.
- **Partitioning**: By locale if table exceeds millions of rows.
- **Queries**: Filter by locale + level + scenario_tags for "vocabulary for this scenario/level"; filter by term_ids for lesson content.

---

## 7. Dependencies

- **database-schema.md**: vocabulary_terms, vocabulary_translations.
- **content-entities.md**: Vocabulary term lifecycle.
- **content-quality-rules.md**: General content validation.
- **scenario-taxonomy.md**: scenario_tags codes.
