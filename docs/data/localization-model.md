# Localization Model — Multi-Language and Multi-Country

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

This document defines how content supports **multiple learner languages**, **translation of UI vs lesson content**, **culture-specific variants**, and **multi-country expansion** so the platform can scale to multiple teaching languages and locales.

---

## 2. Scope

- **In scope**: Locale and language dimensions; UI vs content localization; teaching language vs learner interface language; culture-specific content; data model and keys.
- **Out of scope**: i18n implementation (frontend); translation vendor process; legal/compliance per country.

---

## 3. Dimensions

| Dimension | Description | Example |
|-----------|-------------|---------|
| **Teaching language** | Language being taught (lesson content, vocabulary, grammar) | nl (Dutch), en (future) |
| **Learner locale (UI)** | Interface language and regional format | en-GB, nl-NL, ar |
| **Content locale** | Locale of the content row (usually = teaching language for that row) | nl, en |
| **Market / country** | Target country for product and some content (e.g. NL vs BE for Dutch) | NL, BE |

- **Content tables**: Each content row has `locale` (BCP 47) = teaching language of that row. Dutch lessons have `locale = 'nl'`. For "Dutch for English speakers" vs "Dutch for Arabic speakers", same teaching language (nl); learner locale is profile/UI only; optional variant (e.g. L1 hints in different languages) can be separate column or separate content rows.
- **Vocabulary translations**: Stored as `translations` JSONB `[{ "locale": "en", "text": "..." }]` or in vocabulary_translations table. These are translations of the lemma into learner's language (or common support languages).
- **UI strings**: Not in content DB; in i18n bundle (e.g. keys by locale). Keys may be stored in content (e.g. title_key) for reuse across locales.

---

## 4. Data Model for Localization

### 4.1 locales table

- **code**: BCP 47 (nl, en-GB, en-US, ar).
- **is_teaching_language**: true for nl (and future en, etc.) — content exists in this language.
- Used to filter content (e.g. lessons where locale = user's learning language).

### 4.2 Content rows per locale

- **One row per (entity, locale)**. Example: Lesson "Greetings" in Dutch = one row with locale='nl'; if we add English as teaching language, "Greetings" in English = another row with locale='en'.
- **external_id** can be shared across locales (e.g. "greetings-basic") so that we can link "same" lesson in different languages; or per-locale external_id.

### 4.3 Translations inside content

- **Vocabulary**: `translations` array for lemma (e.g. "lopen" → [{ "locale": "en", "text": "to walk" }]). Used for hints and display when learner locale is en.
- **Scenario key_phrases**: Each phrase can have `translation` in learner locale or a small set of locales.
- **Grammar examples**: Can include translation in one or more locales.

### 4.4 Culture-specific variants

- **Cultural context**: Entries can be (locale, scenario_id, topic). Dutch for NL vs Dutch for BE can have different cultural_context_entries (same locale 'nl', different scenario or topic for BE-specific norms).
- **Scenario**: Can have `market` or `country` optional filter (e.g. NL vs BE) for municipality, school, etc. Optional column or tag; query can filter by user's country from profile.

---

## 5. UI vs Lesson Content

| Type | Localization approach |
|------|------------------------|
| **UI** (buttons, labels, nav, errors) | i18n bundle by locale (en-GB, nl-NL, etc.); not in content DB. |
| **Lesson title/description** | In content DB; one per teaching-language row. Optional title_key for i18n if title is shared key. |
| **Lesson body** (steps, questions) | In content DB; locale = teaching language. Translations of same lesson into another teaching language = separate row with different locale. |
| **Vocabulary lemma** | In content DB; locale = teaching language. translations field = translations into other languages (for hints). |
| **Feedback messages** | Can be in prompt templates (locale) or in i18n (feedback_key). Prefer prompt or content for pedagogy-specific text. |

---

## 6. Multi-Country Expansion

- **Same teaching language, different country**: e.g. Dutch in NL vs Belgium. Use same content (locale=nl) with optional country-specific: cultural notes, scenario variants (scenario_category or tags), or market filter. Profile.country can drive which scenarios/cultural content are preferred.
- **New teaching language**: Add locale (e.g. en) as is_teaching_language; create full content set (vocabulary, grammar, scenarios, lessons) for that locale. No schema change; only new rows.
- **RTL / script**: Locale code (e.g. ar) can drive UI direction; content payload can store text in UTF-8; no separate schema for script.

---

## 7. Locale Resolution

- **Catalog and recommendations**: Filter content by teaching language = user's learning language (from profile.target_language or profile.locale for learning). Optionally filter by country for culture-specific.
- **Display**: When showing vocabulary or phrases, show translation for learner's locale if available (from translations or phrase translation); fallback to teaching language or first available.
- **Prompts**: Prompt template can have locale (e.g. nl) so that generated text is in Dutch; learner-facing feedback can be in learner locale by using a different template or variable.

---

## 8. Scalability

- **Index**: All content tables indexed by locale; partition by locale if table grows very large.
- **Translation coverage**: Track which (lemma, locale) pairs have translations; backfill for high-traffic learner locales.
- **Content growth**: Adding a new teaching language = new locale + full content pipeline (authoring or generation); same schema.

---

## 9. Dependencies

- **database-schema.md**: locales table; locale column on all content tables.
- **content-entities.md**: Locale as required attribute.
- **content-sourcing-strategy.md**: Translation and locale expansion as source.
