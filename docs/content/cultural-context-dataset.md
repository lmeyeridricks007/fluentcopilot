# Cultural Context Dataset — Do's, Don'ts, Notes

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

This document defines the **cultural context knowledge base**: do's, don'ts, and notes per topic or scenario to support culturally relevant language learning (e.g. Dutch norms for café, formal address, administration).

---

## 2. Scope

- **In scope**: cultural_context_entries schema; topic and scenario linkage; sourcing; use in scenarios and lessons.
| **Out of scope**: Legal/compliance per country (separate); UI copy (i18n).

---

## 3. Cultural Context Entry Schema

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| id | bigint | PK | Yes |
| locale | varchar(10) | Teaching language / market | Yes |
| scenario_id | FK | Optional link to scenario | Optional |
| topic | varchar(100) | e.g. "greetings", "formal_address", "cafe" | Yes |
| do_s | JSONB | ["Do 1", "Do 2"] | Yes |
| dont_s | JSONB | ["Don't 1", "Don't 2"] | Optional |
| notes | text | Additional context | Optional |
| source | authored, ai_generated, imported | Yes |
| version | int | | Yes |

---

## 4. Use

- **Scenarios**: Scenario can have cultural_notes inline or reference cultural_context_entries by topic/scenario_id. Display in scenario intro or debrief.
- **Lessons**: Lesson can include "cultural tip" step with content from topic or scenario.
- **Runtime**: When generating scenario or reflection lesson, inject relevant cultural_context into prompt or display.
- **Market variants**: Same locale (nl) with different topic or scenario for NL vs BE (e.g. "municipality_nl" vs "municipality_be"); filter by profile.country if needed.

---

## 5. Sourcing and Validation

- **Source**: Authored by native/cultural experts; optional AI draft with expert review. No unsourced AI-only publication.
- **Validation**: do_s and dont_s non-empty arrays; no PII; no harmful or stereotypical content; moderation on text.
- **Scale**: Hundreds of entries; index (locale), (scenario_id), (topic).

---

## 6. Dependencies

- **database-schema.md**: cultural_context_entries table.
- **scenario-taxonomy.md**: Scenario linkage.
- **content-quality-rules.md**: Validation.
